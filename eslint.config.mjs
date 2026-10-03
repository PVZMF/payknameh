import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";
import { localRules } from "./eslint/local-rules.mjs";

// Standards §2: logical properties only. Matches physical left/right Tailwind utilities.
const PHYSICAL_CLASS =
  "/(^|\\s|:)-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-|(^|\\s|:)(text-left|text-right|float-left|float-right|clear-left|clear-right|border-l|border-r)(\\s|$)/";
const PHYSICAL_MESSAGE =
  "Use logical classes (ms-*, pe-*, start-*, text-start) instead of left/right.";

// Tech §2.4 layers. Each entry is an element the boundaries plugin can classify.
const ELEMENTS = [
  { type: "domain", pattern: "src/domain/*", capture: ["module"] },
  { type: "service", pattern: "src/server/services/*", capture: ["module"] },
  { type: "db", pattern: "src/server/db" },
  { type: "provider", pattern: "src/server/providers" },
  { type: "job", pattern: "src/server/jobs" },
  { type: "server-lib", pattern: "src/server/lib" },
  { type: "app", pattern: "src/app" },
  { type: "renderer", pattern: "src/renderer" },
  { type: "ui", pattern: "src/ui" },
  { type: "strings", pattern: "src/strings" },
];

// Single files are classified as file categories, not elements.
const FILES = [
  { category: "env", pattern: "src/env.ts" },
  { category: "worker", pattern: "worker.ts" },
];

const allow = (from, to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: { anyOf: to } } } },
});
const allowEnv = (from) => ({
  from: { element: { types: { anyOf: from } } },
  allow: { to: { file: { categories: "env" } } },
});

const LAYER_POLICIES = [
  allow("domain", ["domain"]),
  allow("db", ["domain", "server-lib"]),
  allow("provider", ["domain", "server-lib"]),
  allow("server-lib", ["domain"]),
  allow("service", ["domain", "db", "provider", "server-lib"]),
  allow("job", ["service", "domain", "server-lib"]),
  {
    from: { file: { categories: "worker" } },
    allow: {
      to: [
        { element: { types: { anyOf: ["job", "server-lib"] } } },
        { file: { categories: "env" } },
      ],
    },
  },
  allowEnv(["db", "provider", "server-lib", "service", "job", "app"]),
  allow("app", ["service", "domain", "ui", "renderer", "strings", "server-lib"]),
  allow("renderer", ["ui", "strings", "domain"]),
  allow("ui", ["ui", "strings", "domain"]),
  // CLAUDE.md: another module is reached only through its services/<module>/index.ts.
  {
    from: { element: { type: "service" } },
    allow: {
      to: {
        element: { type: "service", captured: { module: "{{ from.element.captured.module }}" } },
      },
    },
  },
  {
    from: { element: { types: { anyOf: ["service", "job", "app"] } } },
    allow: { to: { element: { type: "service", fileInternalPath: "index.ts" } } },
  },
];

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "templates/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strict,
  {
    plugins: { boundaries, local: localRules },
    settings: {
      "boundaries/elements": ELEMENTS,
      "boundaries/files": FILES,
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      "boundaries/dependencies": ["error", { default: "allow", policies: [] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": "allow-with-description" },
      ],
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../../*"],
              message: "Use an alias (@/domain, @/server, @/ui) instead of ../../..",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name=/^(className|class)$/] Literal[value=${PHYSICAL_CLASS}]`,
          message: PHYSICAL_MESSAGE,
        },
        {
          selector: `JSXAttribute[name.name=/^(className|class)$/] TemplateElement[value.raw=${PHYSICAL_CLASS}]`,
          message: PHYSICAL_MESSAGE,
        },
        {
          selector: `CallExpression[callee.name=/^(cn|cva|clsx)$/] Literal[value=${PHYSICAL_CLASS}]`,
          message: PHYSICAL_MESSAGE,
        },
      ],
      "local/todo-needs-card": "error",
      "local/no-server-in-client": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "worker.ts"],
    rules: {
      "boundaries/dependencies": ["error", { default: "disallow", policies: LAYER_POLICIES }],
    },
  },
  {
    // Standards §2: console is allowed in scripts only.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  prettier,
);

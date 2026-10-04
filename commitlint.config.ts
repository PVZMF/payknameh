// Standards §1: the 12 domain modules plus the shared scopes. Same list as CLAUDE.md.
const MODULE_SCOPES = [
  "auth",
  "org",
  "event",
  "guest",
  "invitation",
  "template",
  "music",
  "rsvp",
  "delivery",
  "billing",
  "analytics",
  "staff",
];
const SHARED_SCOPES = ["ui", "infra", "ci", "deps", "docs"];

const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Standards §6: scope is required and comes from the fixed list.
    "scope-empty": [2, "never"],
    "scope-enum": [2, "always", [...MODULE_SCOPES, ...SHARED_SCOPES]],
    // Standards §6: subject under 72 characters, no trailing period.
    "header-max-length": [2, "always", 72],
    "subject-full-stop": [2, "never", "."],
  },
};

export default config;

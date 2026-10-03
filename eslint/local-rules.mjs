// Project rules that no published plugin covers (Standards §2).

const TODO_PATTERN = /\bTODO\b(?!\(PK-\d{3}\))/;

/** Standards §2: every to-do comment names its card, written as TODO(PK-123). */
const todoNeedsCard = {
  meta: {
    type: "problem",
    messages: { missing: "TODO must reference a card: TODO(PK-123): …" },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (TODO_PATTERN.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: "missing" });
          }
        }
      },
    };
  },
};

/** Standards §2: client code never imports server/. */
const noServerInClient = {
  meta: {
    type: "problem",
    messages: { forbidden: "Client components must not import server code ({{source}})." },
    schema: [],
  },
  create(context) {
    const isClient = context.sourceCode.ast.body.some(
      (node) => node.type === "ExpressionStatement" && node.directive === "use client",
    );
    if (!isClient) return {};
    return {
      ImportDeclaration(node) {
        const source = String(node.source.value);
        if (source === "server-only" || /^@\/server(\/|$)|\/server\//.test(source)) {
          context.report({ node, messageId: "forbidden", data: { source } });
        }
      },
    };
  },
};

export const localRules = {
  rules: {
    "todo-needs-card": todoNeedsCard,
    "no-server-in-client": noServerInClient,
  },
};

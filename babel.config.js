const t = require("@babel/types");

/**
 * Jest runs CommonJS and cannot execute a native `import()` expression without
 * --experimental-vm-modules. Tests use `await import("../src/...")` to load
 * modules after setting up mocks, so transform static-string dynamic imports
 * into a Promise-wrapped require() in the test environment only.
 * App/Metro builds are unchanged.
 */
function dynamicImportToRequireInTests() {
  return {
    name: "dynamic-import-to-require-in-tests",
    visitor: {
      CallExpression(path) {
        if (path.node.callee.type !== "Import") return;
        const [argument] = path.node.arguments;
        if (!t.isStringLiteral(argument)) return;
        path.replaceWith(
          t.callExpression(
            t.memberExpression(t.identifier("Promise"), t.identifier("resolve")),
            [t.callExpression(t.identifier("require"), [argument])],
          ),
        );
      },
    },
  };
}

module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === "test";
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // react-native-worklets/plugin is required by Reanimated 4 and must be listed last.
    plugins: [
      ...(isTest ? [dynamicImportToRequireInTests] : []),
      "react-native-worklets/plugin",
    ],
  };
};

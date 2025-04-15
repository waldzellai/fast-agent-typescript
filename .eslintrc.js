module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // Add any specific ESLint rules here if needed
    "prettier/prettier": "error", // Ensure Prettier rules are treated as ESLint errors
  },
  ignorePatterns: ["node_modules/", "dist/", "*.js"], // Ignore build output, node_modules, and JS config files
};

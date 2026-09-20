import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
  },
  {
    files: ["functions/**/*.js"],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
];

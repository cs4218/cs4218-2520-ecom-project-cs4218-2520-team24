module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["security"],
  ignorePatterns: [
    "client/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "tests/**",
    "**/*.test.js",
  ],
  rules: {
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-object-injection": "off",
  },
};

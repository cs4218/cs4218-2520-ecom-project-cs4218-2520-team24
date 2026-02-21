export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: ["<rootDir>/controllers/*.test.js"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: ["controllers/**"],
  coverageThreshold: {
    "./controllers/authController.js": {
      lines: 95,
      functions: 95,
    },
    "./controllers/productController.js": {
      lines: 100,
      functions: 100,
    },
  },
};

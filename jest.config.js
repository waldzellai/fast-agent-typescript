/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"], // Look for tests within the src and tests directories
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)", // Standard Jest test folder
    "**/?(*.)+(spec|test).+(ts|tsx|js)", // Files ending with .spec.ts/tsx/js or .test.ts/tsx/js
  ],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        // ts-jest configuration options go here
        // Example: specify tsconfig if not using default tsconfig.json
        // tsconfig: 'tsconfig.test.json'
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};

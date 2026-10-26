import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  // Core logic is pure and camera-free, so the node environment is enough.
  testEnvironment: "node",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/training/"],
  modulePathIgnorePatterns: ["<rootDir>/training/"],
};

export default createJestConfig(config);

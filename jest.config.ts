import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  projects: [
    {
      displayName: "server",
      preset: "ts-jest",
      testEnvironment: "node",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      testMatch: [
        "<rootDir>/src/services/**/*.test.ts",
        "<rootDir>/src/app/**/*.test.ts",
      ],
    },
    {
      displayName: "client",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      testMatch: ["<rootDir>/src/components/**/*.test.tsx"],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          { tsconfig: { jsx: "react-jsx" } },
        ],
      },
    },
  ],
};

export default config;

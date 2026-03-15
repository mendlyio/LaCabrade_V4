/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true, decorators: true },
          transform: { react: { runtime: "automatic" } },
          target: "es2019",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  // Résolution de chemins alignée sur tsconfig paths ("*" → "./src/*")
  moduleNameMapper: {
    "^modules/(.*)$": "<rootDir>/src/modules/$1",
    "^api/(.*)$": "<rootDir>/src/api/$1",
    "^lib/(.*)$": "<rootDir>/src/lib/$1",
    "^subscribers/(.*)$": "<rootDir>/src/subscribers/$1",
  },
  // Collecte de couverture sur les fichiers Bpost
  collectCoverageFrom: [
    "src/modules/bpost/**/*.ts",
    "src/api/admin/bpost/**/*.ts",
    "!src/**/*.d.ts",
  ],
  coverageReporters: ["text", "lcov"],
  testTimeout: 15000,
  verbose: true,
}

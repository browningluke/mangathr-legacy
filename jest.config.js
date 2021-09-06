module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
        "**/test/**/*.test.ts"
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "/dist/"
    ],
    moduleNameMapper: {
        "@commands/(.*)": "<rootDir>/src/commands/$1",
        "@databases/(.*)": "<rootDir>/src/databases/$1",
        "@helpers/(.*)": "<rootDir>/src/helpers/$1",
        "@plugins/(.*)": "<rootDir>/src/plugins/$1",
        "@types/(.*)": "<rootDir>/src/types/$1",
        "@core/(.*)": "<rootDir>/src/$1",
    },
};
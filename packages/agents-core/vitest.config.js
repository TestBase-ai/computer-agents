"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 120000, // 2 minutes for agent execution tests
        hookTimeout: 30000,
        include: ['tests/**/*.test.ts'],
    },
});
//# sourceMappingURL=vitest.config.js.map
// @ts-check

import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    globalIgnores(["**/dist/"]),

    {
        rules: {
            // I'm adding this rule just so I can temporarily define unused variables with a preceding `_` for
            // my own sanity.
            // Ignore unused variables/args that start with "_"
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],

            // These are just personal preferences.
            semi: ["error", "always"],
            quotes: ["error", "double"],
        },
    },

    // NOTE: This needs to go last to override other rules
    eslintConfigPrettier
);

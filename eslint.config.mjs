import { defineConfig } from "eslint/config";
import { commonTypeScriptRules } from "@feedic/eslint-config/typescript";
import tseslint from "typescript-eslint";
import eslintConfigBiome from "eslint-config-biome";
import feedicFlatConfig from "@feedic/eslint-config";

export default defineConfig([
    ...feedicFlatConfig,
    {
        linterOptions: {
            reportUnusedDisableDirectives: "error",
        },
    },
    eslintConfigBiome,
    {
        ignores: ["coverage/**", "dist/**", "eslint.config.{js,cjs,mjs}"],
    },
    {
        rules: {
            "n/no-unpublished-import": 0,

            "unicorn/filename-case": [
                2,
                {
                    cases: {
                        camelCase: true,
                        pascalCase: true,
                    },
                },
            ],
        },
    },
    {
        files: ["**/*.ts"],
        extends: [...tseslint.configs.recommended],

        languageOptions: {
            sourceType: "module",
            parser: tseslint.parser,

            parserOptions: {
                project: "./tsconfig.eslint.json",
            },
        },

        rules: {
            ...commonTypeScriptRules,
        },
    },
    {
        files: ["**/*.spec.ts"],

        rules: {
            "n/no-unsupported-features/node-builtins": 0,
        },
    },
    // Retain the conventional fixture directory while checking other names.
    {
        files: ["src/__fixtures__/testHelper.ts"],
        rules: {
            "unicorn/filename-case": [
                "error",
                {
                    cases: {
                        camelCase: true,
                        pascalCase: true,
                    },
                    checkDirectories: false,
                },
            ],
        },
    },

    // Preserve the observable class field initialization order.
    {
        files: ["src/Parser.ts", "src/Tokenizer.ts"],
        rules: {
            "unicorn/consistent-class-member-order": "off",
        },
    },

    // Keep hot ASCII comparisons allocation free.
    {
        files: ["src/Tokenizer.ts"],
        rules: {
            "unicorn/prefer-includes-over-repeated-comparisons": "off",
        },
    },

    // Keep the tokenizer state dispatch inline in its character-processing loop.
    {
        files: ["src/Tokenizer.ts"],
        rules: {
            "unicorn/no-break-in-nested-loop": "off",
        },
    },
]);

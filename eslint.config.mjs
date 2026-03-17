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
]);

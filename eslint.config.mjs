import { defineConfig } from "eslint/config";
import { commonTypeScriptRules } from "@feedic/eslint-config/typescript";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import feedicFlatConfig from "@feedic/eslint-config";

export default defineConfig([
    ...feedicFlatConfig,
    eslintConfigPrettier,
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
                project: "./tsconfig.json",
            },
        },

        rules: {
            ...commonTypeScriptRules,
            "@typescript-eslint/no-unused-vars": 0,

            "@typescript-eslint/consistent-type-imports": [
                2,
                {
                    fixStyle: "inline-type-imports",
                },
            ],

            "@typescript-eslint/consistent-type-exports": 2,
        },
    },
    {
        files: ["**/*.spec.ts"],

        rules: {
            "n/no-unsupported-features/node-builtins": 0,
        },
    },
]);

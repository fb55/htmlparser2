import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import n from "eslint-plugin-n";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
    js.configs.recommended,
    n.configs["flat/recommended"],
    unicorn.configs.recommended,
    tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },

        rules: {
            eqeqeq: [2, "smart"],
            "no-caller": 2,
            "dot-notation": 2,
            "no-var": 2,
            "prefer-const": 2,

            "prefer-arrow-callback": [
                2,
                {
                    allowNamedFunctions: true,
                },
            ],

            "arrow-body-style": [2, "as-needed"],
            "object-shorthand": 2,
            "prefer-template": 2,
            "one-var": [2, "never"],

            "prefer-destructuring": [
                2,
                {
                    object: true,
                },
            ],

            "capitalized-comments": 2,
            "multiline-comment-style": [2, "starred-block"],
            "spaced-comment": 2,
            yoda: [2, "never"],
            curly: [2, "multi-line"],
            "no-else-return": 2,
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

            "unicorn/no-null": 0,
            "unicorn/prefer-code-point": 0,
            "unicorn/prefer-string-slice": 0,
            "unicorn/prefer-add-event-listener": 0,
            "unicorn/prefer-at": 0,
            "unicorn/prefer-string-replace-all": 0,
        },
    },
    {
        files: ["**/*.ts"],

        languageOptions: {
            sourceType: "module",
            parser: tseslint.parser,

            parserOptions: {
                project: "./tsconfig.json",
            },
        },

        rules: {
            curly: [2, "multi-line"],
            "@typescript-eslint/prefer-for-of": 0,
            "@typescript-eslint/member-ordering": 0,
            "@typescript-eslint/explicit-function-return-type": 0,
            "@typescript-eslint/no-unused-vars": 0,

            "@typescript-eslint/no-use-before-define": [
                2,
                {
                    functions: false,
                },
            ],

            "@typescript-eslint/consistent-type-definitions": [2, "interface"],
            "@typescript-eslint/prefer-function-type": 2,
            "@typescript-eslint/no-unnecessary-type-arguments": 2,
            "@typescript-eslint/prefer-string-starts-ends-with": 2,
            "@typescript-eslint/prefer-readonly": 2,
            "@typescript-eslint/prefer-includes": 2,
            "@typescript-eslint/no-unnecessary-condition": 2,
            "@typescript-eslint/switch-exhaustiveness-check": 2,
            "@typescript-eslint/prefer-nullish-coalescing": 2,

            "@typescript-eslint/consistent-type-imports": [
                2,
                {
                    fixStyle: "inline-type-imports",
                },
            ],

            "@typescript-eslint/consistent-type-exports": 2,
            "n/no-missing-import": 0,
            "n/no-unsupported-features/es-syntax": 0,
        },
    },
    {
        files: ["**/*.spec.ts"],

        rules: {
            "n/no-unsupported-features/node-builtins": 0,
        },
    },
]);

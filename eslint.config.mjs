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
// Keep the conventional fixture directory name while checking other paths.
{
    "files": [
        "**/*.ts"
    ],
    "rules": {
        "unicorn/filename-case": [
            "error",
            {
                "cases": {
                    "camelCase": true,
                    "pascalCase": true
                },
                "ignore": [
                    "^__fixtures__$"
                ]
            }
        ]
    }
},
// HTTP URLs are intentional fixture inputs and assertions.
{
    "files": [
        "**/*.spec.ts",
        "test/**/*.ts"
    ],
    "rules": {
        "unicorn/prefer-https": "off"
    }
},
// Keep the tokenizer state machine and its hot character comparisons inline.
{
    "files": [
        "src/Tokenizer.ts"
    ],
    "rules": {
        "unicorn/no-break-in-nested-loop": "off",
        "unicorn/prefer-early-return": "off",
        "unicorn/prefer-includes-over-repeated-comparisons": "off"
    }
},
// Preserve class field initialization order and the public node layout.
{
    "files": [
        "src/Parser.ts",
        "src/Tokenizer.ts"
    ],
    "rules": {
        "unicorn/consistent-class-member-order": "off"
    }
},

// The prototype getter intentionally uses its node receiver.
{
    "files": [
        "src/index.spec.ts"
    ],
    "rules": {
        "unicorn/no-this-outside-of-class": "off"
    }
},

]);

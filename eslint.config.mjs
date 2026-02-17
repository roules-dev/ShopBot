// @ts-check

import eslint from "@eslint/js";
// import boundaries from "eslint-plugin-boundaries";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// import { fileURLToPath } from "node:url";
// import { dirname } from "node:path";

// const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
    {
        ignores: ["node_modules/", "dist/", "build/"]
    },
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: true
            }
        }
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        files: ["src/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_"
                }
            ],
            
        }
    },
    // {
    //     files: ["src/**/*.ts"],
    //     plugins: {
    //         boundaries
    //     },
    //     settings: {
    //         "boundaries/root-path": __dirname,
    //         // "boundaries/root-path": resolve(import.meta.dirname, "src"),
    //         //     "boundaries/flag-as-external": {
    //         // outsideRootPath: true  
    //         // }
    //         "boundaries/include": ["src/**/*", "data/**/*", "locales/**/*"],
    //         "import/resolver": {
    //             typescript: {
    //                 project: "./tsconfig.json"
    //             }
    //         },
    //         "boundaries/elements": [
    //             {
    //                 mode: "full",
    //                 type: "shared",
    //                 pattern: [
    //                     "src/database/**/*",
    //                     "src/user-interfaces/**/*",
    //                     "src/user-flows/**/*",
    //                     "src/utils/**/*"
    //                 ]
    //             },
    //             {
    //                 mode: "full",
    //                 type: "data-access",
    //                 capture: ["featureName", "databaseName"],
    //                 pattern: ["src/features/*/database/*-database.ts"]
    //             },
    //             {
    //                 mode: "full",
    //                 type: "feature",
    //                 capture: ["featureName"],
    //                 pattern: ["src/features/*/**/*"]
    //             },
    //             {
    //                 mode: "full",
    //                 type: "app",
    //                 pattern: ["src/app/**/*"]
    //             },
    //             {
    //                 mode: "full",
    //                 type: "data",
    //                 pattern: ["data/**/*"]
    //             },
    //             {
    //                 mode: "full",
    //                 type: "locales",
    //                 pattern: ["locales/**/*"]
    //             },
    //             {
    //                 mode: "full",
    //                 type: "neverImport",
    //                 pattern: ["src/*", "src/tools/**/*"]
    //             },
    //         ]  
    //     },
    //     rules: {
    //         "boundaries/no-unknown": ["error"],
    //         "boundaries/no-unknown-files": ["error"],
    //         "boundaries/element-types": [
    //             "error",
    //             {
    //                 default: "disallow",
    //                 rules: [
    //                     {
    //                         from: ["shared"],
    //                         allow: ["shared", "locales"]
    //                     },
    //                     {
    //                         from: ["feature", "data-access"],
    //                         allow: [
    //                             "shared",
    //                             "locales",
    //                             ["feature", { featureName: "${from.featureName}" }]
    //                         ]
    //                     },
    //                     {
    //                         from: ["data-access"],
    //                         allow: ["data"],
    //                     },
    //                     {
    //                         from: ["app", "neverImport"],
    //                         allow: ["shared", "feature", "locales", "data-access"]
    //                     }
    //                 ]
    //             }
    //         ]
    //     }
    // }
);
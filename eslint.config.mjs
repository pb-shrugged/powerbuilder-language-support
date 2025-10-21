/**
 * ESLint configuration for the project.
 *
 * See https://eslint.style and https://typescript-eslint.io for additional linting options.
 */
// @ts-check
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from 'typescript-eslint';

export default defineConfig(
	{
		ignores: [
			'**/.vscode-test',
			'**/out',
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.stylistic,
	eslintConfigPrettier,
	{
		plugins: {
			'@stylistic': stylistic,
			"simple-import-sort": simpleImportSort,
		},
		rules: {
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error",
			'curly': 'warn',
			'@stylistic/semi': ['error', 'always'],
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					'selector': 'import',
					'format': ['camelCase', 'PascalCase']
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					'argsIgnorePattern': '^_'
				}
			]
		}
	}
);

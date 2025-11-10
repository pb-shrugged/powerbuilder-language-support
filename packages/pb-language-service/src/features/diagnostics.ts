import { logger } from '@powerbuilder-language-support/logger';
import Parser from 'tree-sitter';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';

import { collectErrors, getNodeRange } from '../parser/tree-sitter/tree-sitter-ast-utils';

/**
 * Valida um documento e retorna diagnósticos
 */
export function validateDocument(tree: Parser.Tree): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];

	// Coleta todos os nós de erro
	const { errors, missings } = collectErrors(tree.rootNode);

	if (errors) {
		for (const errorNode of errors) {
			const range = getNodeRange(errorNode);

			diagnostics.push({
				severity: DiagnosticSeverity.Error,
				range: {
					start: range.start,
					end: range.end,
				},
				message: 'Syntax error',
				source: 'powerbuilderLanguageServer',
			});
		}
	}

	if (missings) {
		for (const missingNode of missings) {
			const range = getNodeRange(missingNode);

			diagnostics.push({
				severity: DiagnosticSeverity.Error,
				range: {
					start: range.start,
					end: range.end,
				},
				message: `Syntax missing node error: ${missingNode.type}`,
				source: 'powerbuilderLanguageServer',
			});
		}
	}

	return diagnostics;
}

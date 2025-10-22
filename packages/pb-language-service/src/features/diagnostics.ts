import Parser from 'tree-sitter';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';

import { collectErrors, getNodeRange } from '../utils/ast';

/**
 * Valida um documento e retorna diagnósticos
 */
export function validateDocument(tree: Parser.Tree): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];

	// Coleta todos os nós de erro
	const errors = collectErrors(tree.rootNode);

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

	return diagnostics;
}

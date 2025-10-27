import Parser from 'tree-sitter';
import { Location, Position } from 'vscode-languageserver-types';

import { TreeSitterParser } from '../parser/tree-sitter/tree-sitter-parser';
import { DocumentInfo } from '../service/document-manager';
import { SymbolProvider } from '../symbols/symbol-provider';

/**
 * Encontra a definição de um símbolo (mesmo arquivo apenas)
 */
export function findDefinition(
	parser: TreeSitterParser,
	symbolProvider: SymbolProvider,
	document: DocumentInfo,
	position: Position,
): Location | null {
	const symbol = symbolProvider.findDefinitionAtPosition(parser, document, position);

	if (!symbol) {
		return null;
	}

	return {
		uri: document.uri,
		range: symbol.selectionRange,
	};
}

import { DocumentSymbol } from 'vscode-languageserver-types';

import { TreeSitterParser } from '../parser/tree-sitter/tree-sitter-parser';
import { DocumentInfo } from '../service/document-manager';
import { SymbolProvider } from '../symbols/symbol-provider';

/**
 * Constrói a lista de símbolos do documento
 */
export function buildDocumentSymbols(
	parser: TreeSitterParser,
	symbolProvider: SymbolProvider,
	document: DocumentInfo,
): DocumentSymbol[] {
	const { documentSymbols: symbols } = symbolProvider.getDocumentSymbols(
		parser,
		document,
	);

	return symbols.map((symbol) => ({
		name: symbol.name,
		kind: symbol.kind,
		range: symbol.range,
		selectionRange: symbol.selectionRange,
		detail: symbol.detail,
	}));
}

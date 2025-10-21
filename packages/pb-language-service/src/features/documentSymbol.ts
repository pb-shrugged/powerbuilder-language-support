
import Parser from 'tree-sitter';
import { DocumentSymbol } from 'vscode-languageserver-types';
import { SymbolProvider } from '../symbols/SymbolProvider';

/**
 * Constrói a lista de símbolos do documento
 */
export function buildDocumentSymbols(
  tree: Parser.Tree,
  symbolProvider: SymbolProvider
): DocumentSymbol[] {
  const symbols = symbolProvider.getDocumentSymbols(tree);
  
  return symbols.map(symbol => ({
    name: symbol.name,
    kind: symbol.kind,
    range: symbol.range,
    selectionRange: symbol.selectionRange,
    detail: symbol.detail
  }));
}

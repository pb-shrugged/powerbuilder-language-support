
import Parser from 'tree-sitter';
import { Location, Position } from 'vscode-languageserver-types';

import { SymbolProvider } from '../symbols/SymbolProvider';

/**
 * Encontra a definição de um símbolo (mesmo arquivo apenas)
 */
export function findDefinition(
  uri: string,
  tree: Parser.Tree,
  position: Position,
  symbolProvider: SymbolProvider
): Location | null {
  const symbol = symbolProvider.findDefinitionAtPosition(tree, position);
  
  if (!symbol) {
    return null;
  }
  
  return {
    uri,
    range: symbol.selectionRange
  };
}

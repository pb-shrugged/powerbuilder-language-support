
import Parser from 'tree-sitter';
import { Hover, Position } from 'vscode-languageserver-types';

import { SymbolProvider } from '../symbols/SymbolProvider';

/**
 * Provê informações de hover para uma posição
 */
export function provideHover(
  tree: Parser.Tree,
  position: Position,
  symbolProvider: SymbolProvider
): Hover | null {
  const hoverInfo = symbolProvider.getHoverInfo(tree, position);
  
  if (!hoverInfo) {
    return null;
  }
  
  return {
    contents: {
      kind: 'markdown',
      value: hoverInfo.contents
    },
    range: hoverInfo.range
  };
}

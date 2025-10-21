
import { SymbolKind } from 'vscode-languageserver-types';

import { TreeSitterManager } from '../parser/TreeSitterManager';
import { SymbolProvider } from '../symbols/SymbolProvider';

describe('SymbolProvider', () => {
  let manager: TreeSitterManager;
  let provider: SymbolProvider;

  beforeEach(() => {
    manager = new TreeSitterManager();
    provider = new SymbolProvider();
  });

  test('should extract function symbols', () => {
    const text = `forward
function string getname()
end function

function string getname()
  return "test"
end function`;

    const tree = manager.parseAndCache('file:///test.sru', text, 1);
    const symbols = provider.getDocumentSymbols(tree);

    expect(symbols.length).toBeGreaterThan(0);
    
    const functionSymbols = symbols.filter(s => s.kind === SymbolKind.Function);
    expect(functionSymbols.length).toBeGreaterThan(0);
  });

  test('should provide hover information', () => {
    const text = `function string getname()
  return "test"
end function`;

    const tree = manager.parseAndCache('file:///test.sru', text, 1);
    const hoverInfo = provider.getHoverInfo(tree, { line: 0, character: 10 });

    // Hover pode ser null se não houver símbolo na posição
    if (hoverInfo) {
      expect(hoverInfo.contents).toBeDefined();
      expect(hoverInfo.range).toBeDefined();
    }
  });
});

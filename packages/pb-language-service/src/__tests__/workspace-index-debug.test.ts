import { PowerBuilderLanguageService } from '../index';

describe('Workspace Index Debug', () => {
        it('should debug symbol extraction', () => {
                const service = new PowerBuilderLanguageService();

                const simpleContent = `function string format_date()
    return "test"
end function`;

                service.parseAndCache('file:///test/simple.sru', simpleContent, 1);

                // Get the tree to debug
                const tree = (service as any).treeSitterManager.getTree('file:///test/simple.sru');
                console.log('Tree root:', tree?.rootNode.toString());
                console.log('Root children:', tree?.rootNode.children.length);

                // Get document symbols
                const symbols = (service as any).symbolProvider.getDocumentSymbols(tree);
                console.log('Document symbols:', JSON.stringify(symbols, null, 2));

                // Get all symbols
                const allSymbols = (service as any).symbolProvider.getAllSymbols(tree);
                console.log('All symbols:', JSON.stringify(allSymbols, null, 2));

                // Check workspace index
                const stats = service.getWorkspaceIndexStats();
                console.log('Workspace index stats:', stats);

                const foundSymbols = service.findSymbolsByName('format_date');
                console.log('Found symbols by name:', JSON.stringify(foundSymbols, null, 2));
        });
});

import {
        Diagnostic,
        DocumentSymbol,
        Hover,
        Location,
        Position,
} from 'vscode-languageserver-types';

import { findDefinition } from './features/definition';
import { validateDocument } from './features/diagnostics';
import { buildDocumentSymbols } from './features/document-symbol';
import { provideHover } from './features/hover';
import { WorkspaceIndex } from './index/workspace-index';
import {
        TextDocumentContentChangeEvent,
        TreeSitterManager,
} from './parser/tree-sitter-manager';
import { SymbolProvider } from './symbols/symbol-provider';

/**
 * PowerBuilder Language Service
 * API pública para funcionalidades LSP
 */
export class PowerBuilderLanguageService {
        private treeSitterManager: TreeSitterManager;
        private symbolProvider: SymbolProvider;
        private workspaceIndex: WorkspaceIndex;

        constructor() {
                this.symbolProvider = new SymbolProvider();
                this.workspaceIndex = new WorkspaceIndex();
                this.treeSitterManager = new TreeSitterManager(this.workspaceIndex, this.symbolProvider);
        }

        /**
         * Faz parsing de um documento e armazena no cache
         */
        parseAndCache(uri: string, text: string, version: number): void {
                this.treeSitterManager.parseAndCache(uri, text, version);
        }

        /**
         * Atualiza um documento com mudanças incrementais
         */
        updateWithChanges(
                uri: string,
                changes: TextDocumentContentChangeEvent[],
                version: number,
        ): boolean {
                const tree = this.treeSitterManager.updateWithChanges(uri, changes, version);
                return tree !== undefined;
        }

        /**
         * Remove um documento do cache
         */
        removeDocument(uri: string): void {
                this.treeSitterManager.removeDocument(uri);
        }

        /**
         * Valida um documento e retorna diagnósticos
         */
        validate(uri: string): Diagnostic[] {
                const tree = this.treeSitterManager.getTree(uri);
                if (!tree) {
                        return [];
                }
                return validateDocument(tree);
        }

        /**
         * Provê informações de hover
         */
        provideHover(uri: string, position: Position): Hover | null {
                const tree = this.treeSitterManager.getTree(uri);
                if (!tree) {
                        return null;
                }
                return provideHover(tree, position, this.symbolProvider);
        }

        /**
         * Encontra a definição de um símbolo
         */
        findDefinition(uri: string, position: Position): Location | null {
                const tree = this.treeSitterManager.getTree(uri);
                if (!tree) {
                        return null;
                }
                return findDefinition(uri, tree, position, this.symbolProvider, this.workspaceIndex);
        }

        /**
         * Constrói símbolos do documento
         */
        buildDocumentSymbols(uri: string): DocumentSymbol[] {
                const tree = this.treeSitterManager.getTree(uri);
                if (!tree) {
                        return [];
                }
                return buildDocumentSymbols(tree, this.symbolProvider);
        }

        /**
         * Limpa todos os documentos do cache
         */
        clear(): void {
                this.treeSitterManager.clear();
        }

        /**
         * Get workspace index statistics (for debugging/monitoring)
         */
        getWorkspaceIndexStats() {
                return this.workspaceIndex.getStats();
        }

        /**
         * Find symbols by name across the workspace
         */
        findSymbolsByName(name: string) {
                return this.workspaceIndex.findSymbols(name);
        }

        /**
         * Get all symbols in the workspace
         */
        getAllWorkspaceSymbols() {
                return this.workspaceIndex.getAllSymbols();
        }
}

// Exporta também os tipos e funções auxiliares
export {
        TextDocumentContentChangeEvent,
        TreeSitterManager,
} from './parser/tree-sitter-manager';
export * from './symbols/symbol-provider';
export * from './utils/ast';
export * from './index/workspace-index';

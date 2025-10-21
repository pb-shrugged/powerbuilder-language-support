import {
  Diagnostic,
  DocumentSymbol,
  Hover,
  Location,
  Position} from 'vscode-languageserver-types';

import { findDefinition } from './features/definition';
import { validateDocument } from './features/diagnostics';
import { buildDocumentSymbols } from './features/documentSymbol';
import { provideHover } from './features/hover';
import { TextDocumentContentChangeEvent,TreeSitterManager } from './parser/TreeSitterManager';
import { SymbolProvider } from './symbols/SymbolProvider';

/**
 * PowerBuilder Language Service
 * API pública para funcionalidades LSP
 */
export class PowerBuilderLanguageService {
  private treeSitterManager: TreeSitterManager;
  private symbolProvider: SymbolProvider;

  constructor() {
    this.treeSitterManager = new TreeSitterManager();
    this.symbolProvider = new SymbolProvider();
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
    version: number
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
    return findDefinition(uri, tree, position, this.symbolProvider);
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
}

// Exporta também os tipos e funções auxiliares
export { TextDocumentContentChangeEvent,TreeSitterManager } from './parser/TreeSitterManager';
export * from './symbols/SymbolProvider';
export * from './utils/ast';

import {
	Diagnostic,
	DocumentSymbol,
	Hover,
	Location,
	Position,
} from 'vscode-languageserver-types';

import { findDefinition } from '../features/definition';
import { validateDocument } from '../features/diagnostics';
import { buildDocumentSymbols } from '../features/document-symbol';
import { provideHover } from '../features/hover';
import { TreeSitterParser } from '../parser/tree-sitter/tree-sitter-parser';
import { SymbolProvider } from '../symbols/symbol-provider';
import { DocumentManager, TextDocumentContentChangeEvent } from './document-manager';

/**
 * PowerBuilder Language Service
 * API pública para funcionalidades LSP
 */
export class PowerBuilderLanguageService {
	private documentManager: DocumentManager;
	private symbolProvider: SymbolProvider;
	private parser: TreeSitterParser;

	constructor() {
		this.parser = new TreeSitterParser();
		this.documentManager = new DocumentManager({ parser: this.parser });
		this.symbolProvider = new SymbolProvider();
	}

	/**
	 * Faz parsing de um documento e armazena no cache
	 */
	parseAndCache(uri: string, text: string, version: number): void {
		this.documentManager.parseAndCache(uri, text, version);
	}

	/**
	 * Atualiza um documento com mudanças incrementais
	 */
	updateWithChanges(
		uri: string,
		changes: TextDocumentContentChangeEvent[],
		version: number,
	): boolean {
		const tree = this.documentManager.updateWithChanges(uri, changes, version);
		return tree !== undefined;
	}

	/**
	 * Remove um documento do cache
	 */
	removeDocument(uri: string): void {
		this.documentManager.removeDocument(uri);
	}

	/**
	 * Valida um documento e retorna diagnósticos
	 */
	validate(uri: string): Diagnostic[] {
		const tree = this.documentManager.getTree(uri);
		if (!tree) {
			return [];
		}
		return validateDocument(tree);
	}

	/**
	 * Provê informações de hover
	 */
	provideHover(uri: string, position: Position): Hover | null {
		const tree = this.documentManager.getTree(uri);
		if (!tree) {
			return null;
		}
		return provideHover(tree, position, this.symbolProvider);
	}

	/**
	 * Encontra a definição de um símbolo
	 */
	findDefinition(uri: string, position: Position): Location | null {
		const tree = this.documentManager.getTree(uri);
		if (!tree) {
			return null;
		}
		return findDefinition(uri, tree, position, this.symbolProvider);
	}

	/**
	 * Constrói símbolos do documento
	 */
	buildDocumentSymbols(uri: string): DocumentSymbol[] {
		const document = this.documentManager.getDocument(uri);
		if (!document) {
			return [];
		}
		return buildDocumentSymbols(this.parser, this.symbolProvider, document);
	}

	/**
	 * Limpa todos os documentos do cache
	 */
	clear(): void {
		this.documentManager.clear();
	}
}

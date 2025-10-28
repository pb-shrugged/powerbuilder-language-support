import Parser from 'tree-sitter';
import { DocumentSymbol, Range } from 'vscode-languageserver-types';

import { TreeSitterParser } from '../parser/tree-sitter/tree-sitter-parser';
import { SymbolProvider } from '../symbols/symbol-provider';

/**
 * Representa uma mudança incremental em um documento de texto
 */
export interface TextDocumentContentChangeEvent {
	/**
	 * Range da mudança (se incremental)
	 */
	range?: Range;

	/**
	 * Comprimento do range substituído (se incremental)
	 */
	rangeLength?: number;

	/**
	 * Novo texto do documento ou range
	 */
	text: string;
}

export interface DocumentInfo {
	uri: string;
	version: number;
	tree: Parser.Tree;
	text: string;
	documentSymbols: DocumentSymbol[];
	topLevelSymbols: DocumentSymbol[];
}

/**
 * Gerencia o parser Tree-sitter e cache de ASTs
 */
export class DocumentManager {
	private parser: TreeSitterParser;
	private symbolProvider: SymbolProvider;
	private documents: Map<string, DocumentInfo>;

	constructor({
		parser,
		symbolProvider,
	}: {
		parser: TreeSitterParser;
		symbolProvider: SymbolProvider;
	}) {
		this.parser = parser;
		this.symbolProvider = symbolProvider;
		this.documents = new Map();
	}

	/**
	 * Faz parsing de um documento e armazena no cache
	 */
	parseAndCache(uri: string, text: string, version: number): Parser.Tree {
		const tree = this.parser.parse(text, this.getTree(uri));

		const document: DocumentInfo = {
			uri,
			version,
			tree,
			text,
			documentSymbols: [],
			topLevelSymbols: [],
		};

		const { documentSymbols, topLevelSymbols } = this.symbolProvider.getDocumentSymbols(
			this.parser,
			document,
		);

		document.documentSymbols.push(...documentSymbols);
		document.topLevelSymbols.push(...topLevelSymbols);

		this.documents.set(uri, document);

		return tree;
	}

	/**
	 * Obtém a árvore do cache
	 */
	getTree(uri: string): Parser.Tree | undefined {
		return this.documents.get(uri)?.tree;
	}

	/**
	 * Obtém o texto do documento do cache
	 */
	getText(uri: string): string | undefined {
		return this.documents.get(uri)?.text;
	}

	/**
	 * Obtém informações completas do documento
	 */
	getDocument(uri: string): DocumentInfo | undefined {
		return this.documents.get(uri);
	}

	/**
	 * Atualiza um documento com mudanças incrementais
	 */
	updateWithChanges(
		uri: string,
		changes: TextDocumentContentChangeEvent[],
		newVersion: number,
	): Parser.Tree | undefined {
		const docInfo = this.documents.get(uri);
		if (!docInfo) {
			return undefined;
		}

		let tree = docInfo.tree;
		let text = docInfo.text;

		// Aplica cada mudança incrementalmente
		for (const change of changes) {
			if ('range' in change && change.range) {
				// Mudança incremental
				const startIndex = this.positionToIndex(
					text,
					change.range.start.line,
					change.range.start.character,
				);
				const oldEndIndex = this.positionToIndex(
					text,
					change.range.end.line,
					change.range.end.character,
				);

				// Atualiza o texto
				text = text.substring(0, startIndex) + change.text + text.substring(oldEndIndex);

				// Informa ao Tree-sitter sobre a mudança
				const newEndIndex = startIndex + change.text.length;
				tree.edit({
					startIndex,
					oldEndIndex,
					newEndIndex,
					startPosition: {
						row: change.range.start.line,
						column: change.range.start.character,
					},
					oldEndPosition: {
						row: change.range.end.line,
						column: change.range.end.character,
					},
					newEndPosition: this.indexToPosition(text, newEndIndex),
				});
			} else {
				// Mudança completa do documento
				text = change.text;
			}
		}

		// Re-parseia com a árvore editada (parsing incremental)
		tree = this.parser.parse(text, tree);

		// Atualiza o cache
		this.documents.set(uri, {
			uri,
			version: newVersion,
			tree,
			text,
			documentSymbols: [],
			topLevelSymbols: [],
		});

		return tree;
	}

	/**
	 * Remove um documento do cache
	 */
	removeDocument(uri: string): void {
		this.documents.delete(uri);
	}

	/**
	 * Limpa todos os documentos do cache
	 */
	clear(): void {
		this.documents.clear();
	}

	/**
	 * Converte posição (linha, coluna) para índice no texto
	 */
	private positionToIndex(text: string, line: number, character: number): number {
		let index = 0;
		for (let i = 0; i < line; i++) {
			const lineEnd = text.indexOf('\n', index);
			if (lineEnd === -1) {
				return text.length;
			}
			index = lineEnd + 1;
		}
		return index + character;
	}

	/**
	 * Converte índice no texto para posição (linha, coluna)
	 */
	private indexToPosition(text: string, index: number): Parser.Point {
		let line = 0;
		let column = 0;
		for (let i = 0; i < index && i < text.length; i++) {
			if (text[i] === '\n') {
				line++;
				column = 0;
			} else {
				column++;
			}
		}
		return { row: line, column };
	}
}

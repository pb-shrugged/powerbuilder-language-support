import { logger } from '@powerbuilder-language-support/logger';
import * as fs from 'fs';
import * as url from 'url';
import {
	Diagnostic,
	DocumentSymbol,
	Hover,
	Location,
	Position,
	WorkspaceFolder,
	WorkspaceSymbol,
} from 'vscode-languageserver-types';

import { findDefinition } from '../features/definition';
import { validateDocument } from '../features/diagnostics';
import { buildDocumentSymbols } from '../features/document-symbol';
import { provideHover } from '../features/hover';
import { TreeSitterParser } from '../parser/tree-sitter/tree-sitter-parser';
import { SymbolProvider } from '../symbols/symbol-provider';
import { getFilePaths } from '../utils/fs-utils';
import { DocumentManager, TextDocumentContentChangeEvent } from './document-manager';

/**
 * PowerBuilder Language Service
 * API pública para funcionalidades LSP
 */
export class PowerBuilderLanguageService {
	private documentManager: DocumentManager;
	private symbolProvider: SymbolProvider;
	private parser: TreeSitterParser;
	private workspaceFolders: WorkspaceFolder[] | null | undefined;

	constructor({
		workspaceFolders,
	}: {
		workspaceFolders: WorkspaceFolder[] | null | undefined;
	}) {
		if (workspaceFolders) {
			this.workspaceFolders = workspaceFolders;
		}

		this.parser = new TreeSitterParser();
		this.symbolProvider = new SymbolProvider();
		this.documentManager = new DocumentManager({
			parser: this.parser,
			symbolProvider: this.symbolProvider,
		});
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
		const document = this.documentManager.getDocument(uri);
		if (!document) {
			return null;
		}
		return findDefinition(this.parser, this.symbolProvider, document, position);
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

	async initializeBackgroundAnalysis({
		backgroundAnalysisMaxFiles,
		filesGlobPattern,
	}: {
		backgroundAnalysisMaxFiles: number;
		filesGlobPattern: string;
	}): Promise<{ filesParsed: number }> {
		if (!this.workspaceFolders) {
			return Promise.resolve({ filesParsed: 0 });
		}

		const workspace = this.workspaceFolders.at(0);

		if (!workspace) {
			return Promise.resolve({ filesParsed: 0 });
		}

		let filePaths: string[] = [];
		try {
			filePaths = await this.getAllFilesFromWorkSpace(filesGlobPattern);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : error;
			logger
				.getLogger()
				.warn(
					`BackgroundAnalysis: failed resolved glob "${filesGlobPattern}". The experience across files will be degraded. Error: ${errorMessage}`,
				);
			return { filesParsed: 0 };
		}

		for (const filePath of filePaths) {
			const uri = url.pathToFileURL(filePath).href;

			try {
				const fileContent = await fs.promises.readFile(filePath, 'utf8');

				this.parseAndCache(uri, fileContent, 1);
			} catch (error) {
				logger
					.getLogger()
					.error(`BackgroundAnalysis: Failed analyzing ${uri}. Error: ${error}`);
			}
		}

		return Promise.resolve({ filesParsed: filePaths.length });
	}

	private async getAllFilesFromWorkSpace(filesGlobPattern: string): Promise<string[]> {
		if (!this.workspaceFolders) {
			return Promise.resolve([]);
		}

		const workspace = this.workspaceFolders.at(0);

		if (!workspace) {
			return Promise.resolve([]);
		}
		const filesPath = await getFilePaths({
			filesGlobPattern,
			rootPath: workspace.uri,
		});

		return filesPath;
	}

	async findWorkspaceSymbolsWithFuzzySearch({
		queryParam,
		filesGlobPattern,
	}: {
		queryParam: string;
		filesGlobPattern: string;
	}): Promise<WorkspaceSymbol[]> {
		const workspaceSymbols: WorkspaceSymbol[] = [];

		// TODO: Use queryParam and FuzzySearch to dont need to look to all files and symbols

		const filesPath = await this.getAllFilesFromWorkSpace(filesGlobPattern);
		for (const filePath of filesPath) {
			const uri = url.pathToFileURL(filePath).href;

			const document = this.documentManager.getDocument(uri);

			if (!document) {
				try {
					const fileContent = await fs.promises.readFile(filePath, 'utf8');

					this.parseAndCache(uri, fileContent, 1);
				} catch (error) {
					logger
						.getLogger()
						.error(
							`findWorkspaceSymbolsWithFuzzySearch: Failed analyzing ${uri}. Error: ${error}`,
						);
				}
			}

			if (document) {
				document.topLevelSymbols.forEach((topLevelSymbol) => {
					workspaceSymbols.push({
						location: { uri: document.uri },
						name: topLevelSymbol.name,
						kind: topLevelSymbol.kind,
						containerName: topLevelSymbol.name,
					});
				});
			}
		}

		return workspaceSymbols;
	}
}

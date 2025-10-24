import { isDeepStrictEqual } from 'node:util';

import {
	PowerBuilderLanguageService,
	TextDocumentContentChangeEvent,
} from '@powerbuilder-language-support/language-service';
import { logger } from '@powerbuilder-language-support/logger';
import * as LSP from 'vscode-languageserver/node';

import DocumentManager from './document-manager';
import * as config from './server-config';

export default class PowerBuilderServer {
	private powerbuilderLanguageService: PowerBuilderLanguageService;
	private clientCapabilities: LSP.ClientCapabilities;
	private config: config.Config;
	private connection: LSP.Connection;
	private documentManager: DocumentManager;
	private initialized = false;
	private workspaceFolders?: LSP.WorkspaceFolder[] | null;

	private constructor({
		powerbuilderLanguageService,
		capabilities,
		connection,
		workspaceFolders,
	}: {
		powerbuilderLanguageService: PowerBuilderLanguageService;
		capabilities: LSP.ClientCapabilities;
		connection: LSP.Connection;
		workspaceFolders?: LSP.WorkspaceFolder[] | null;
	}) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.config = {} as any; // NOTE: configured in updateConfiguration

		this.powerbuilderLanguageService = powerbuilderLanguageService;
		this.clientCapabilities = capabilities;
		this.connection = connection;
		this.workspaceFolders = workspaceFolders;

		this.documentManager = new DocumentManager({
			server: this,
			connection: this.connection,
			powerbuilderLanguageService: this.powerbuilderLanguageService,
		});

		this.updateConfiguration(config.getDefaultConfiguration());
	}

	public static initialize({
		connection,
		initializeParams,
	}: {
		connection: LSP.Connection;
		initializeParams: LSP.InitializeParams;
	}): PowerBuilderServer {
		const powerbuilderLanguageService = new PowerBuilderLanguageService();

		const { capabilities, workspaceFolders } = initializeParams;

		const server = new PowerBuilderServer({
			powerbuilderLanguageService,
			connection,
			capabilities,
			workspaceFolders,
		});

		return server;
	}

	private updateConfiguration(configObject: config.Config): boolean {
		const newConfig = config.ConfigSchema.parse(configObject);
		if (!isDeepStrictEqual(this.config, newConfig)) {
			this.config = { ...newConfig };
			this.documentManager.updateConfiguration(
				this.documentManager.GetConfigFromServer(this.config),
			);

			return true;
		}

		return false;
	}

	/**
	 * LSP capabilities supported by the server
	 */
	public getCapabilities(): LSP.ServerCapabilities {
		return {
			workspace: {
				workspaceFolders: {
					supported: true,
					changeNotifications: true,
				},
			},
			textDocumentSync: {
				openClose: true,
				change: LSP.TextDocumentSyncKind.Full, // TODO: Implement Incremental, change from DocumentManager.TextDocuments.onDidOpen to this.connection.onDidOpenTextDocument
				save: {
					includeText: false,
				},
			},
			hoverProvider: true,
			definitionProvider: true,
			referencesProvider: true,
			documentSymbolProvider: true,
			workspaceSymbolProvider: true,
		};
	}

	/**
	 * Register handlers for the events from the Language Server Protocol that we
	 * care about.
	 */
	public register(connection: LSP.Connection): void {
		this.connection = connection;

		// lsp connection events
		this.connection.onInitialized(this.onInitialized.bind(this));
		this.connection.onShutdown(this.onShutdown.bind(this));
		this.connection.onExit(this.onExit.bind(this));

		// This part is already managed by this.documentManager
		// this.connection.onDidOpenTextDocument(this.onDidOpenTextDocument.bind(this));
		// this.connection.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));
		// this.connection.onDidCloseTextDocument(this.onDidCloseTextDocument.bind(this));

		// lsp capabilities.
		this.connection.onHover(this.onHover.bind(this));
		this.connection.onDefinition(this.onDefinition.bind(this));
		this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));

		this.documentManager.register(this.connection);
	}

	private async onInitialized() {
		this.initialized = true;

		logger.getLogger().info('PowerBuilder Language Server initialized!');
	}

	private onShutdown() {
		logger.getLogger().info('PowerBuilder Language Server shutting down...');
		this.powerbuilderLanguageService.clear();
	}

	private onExit() {
		logger.getLogger().info('PowerBuilder Language Server exited.');
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private onDidOpenTextDocument(params: LSP.DidOpenTextDocumentParams) {
		logger.getLogger().info('onDidOpenTextDocument');
	}

	private onDidChangeTextDocument(params: LSP.DidChangeTextDocumentParams) {
		logger.getLogger().info('onDidChangeTextDocument');

		const { textDocument, contentChanges } = params;
		const document = this.documentManager.getDocumentByURI(textDocument.uri);

		if (!document) {
			return;
		}

		const changes: TextDocumentContentChangeEvent[] = contentChanges.map((change) => ({
			range: 'range' in change ? change.range : undefined,
			rangeLength: 'rangeLength' in change ? change.rangeLength : undefined,
			text: change.text,
		}));

		const success = this.powerbuilderLanguageService.updateWithChanges(
			textDocument.uri,
			changes,
			textDocument.version,
		);

		if (!success) {
			logger
				.getLogger()
				.warn(
					`Incremental update failed for ${textDocument.uri}, falling back to full parse`,
				);
			this.powerbuilderLanguageService.parseAndCache(
				textDocument.uri,
				document.getText(),
				document.version,
			);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private onDidCloseTextDocument(params: LSP.DidCloseTextDocumentParams) {
		logger.getLogger().info('onDidCloseTextDocument');
	}

	private onHover(params: LSP.HoverParams) {
		try {
			const hover = this.powerbuilderLanguageService.provideHover(
				params.textDocument.uri,
				params.position,
			);
			return hover;
		} catch (error) {
			logger.getLogger().error(`Error providing hover: ${error}`);
			return null;
		}
	}

	private onDefinition(params: LSP.DefinitionParams) {
		try {
			const definition = this.powerbuilderLanguageService.findDefinition(
				params.textDocument.uri,
				params.position,
			);
			return definition;
		} catch (error) {
			logger.getLogger().error(`Error finding definition: ${error}`);
			return null;
		}
	}

	private onDocumentSymbol(params: LSP.DocumentSymbolParams) {
		try {
			const symbols = this.powerbuilderLanguageService.buildDocumentSymbols(
				params.textDocument.uri,
			);
			return symbols;
		} catch (error) {
			logger.getLogger().error(`Error building document symbols: ${error}`);
			return [];
		}
	}

	public isInitialized() {
		return this.initialized;
	}
}

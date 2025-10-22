import { PowerBuilderLanguageService } from '@powerbuilder-language-support/language-service';
import {
	Connection,
	TextDocumentChangeEvent,
	TextDocuments,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import PowerBuilderServer from './server';
import * as ServerConfig from './server-config';

export interface DocumentManagerConfig {
	diagnosticBounceMs: number;
}

export default class DocumentManager {
	private documents: TextDocuments<TextDocument>;
	private connection: Connection;
	private powerbuilderLanguageService: PowerBuilderLanguageService;
	private currentDocument?: TextDocument;
	private diagnosticTimers: Map<string, NodeJS.Timeout>;
	private config: DocumentManagerConfig;

	private server: PowerBuilderServer;

	constructor({
		connection,
		powerbuilderLanguageService,
		server,
	}: {
		connection: Connection;
		powerbuilderLanguageService: PowerBuilderLanguageService;
		server: PowerBuilderServer;
	}) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.config = {} as any;

		this.documents = new TextDocuments<TextDocument>(TextDocument);
		this.connection = connection;
		this.powerbuilderLanguageService = powerbuilderLanguageService;
		this.diagnosticTimers = new Map<string, NodeJS.Timeout>();

		this.server = server;
	}

	public register(connection: Connection): void {
		this.documents.onDidOpen(this.onDidOpen.bind(this));
		this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
		this.documents.onDidSave(this.onDidSave.bind(this));
		this.documents.onDidClose(this.onDidClose.bind(this));

		this.documents.listen(connection);
	}

	public updateConfiguration(config: DocumentManagerConfig) {
		this.config = { ...config };
	}

	public GetConfigFromServer(config: ServerConfig.Config): DocumentManagerConfig {
		return {
			diagnosticBounceMs: config.diagnosticBounceMs,
		};
	}

	private onDidOpen({ document }: TextDocumentChangeEvent<TextDocument>) {
		this.connection.console.log(`Document opened: ${document.uri}`);

		this.powerbuilderLanguageService.parseAndCache(
			document.uri,
			document.getText(),
			document.version,
		);

		this.validateDocument(document.uri);
	}

	private onDidChangeContent({ document }: TextDocumentChangeEvent<TextDocument>): void {
		this.connection.console.log(`Document changed: ${document.uri}`);

		this.setCurrentDocument(document);
		if (this.server.isInitialized()) {
			const existingTimer = this.diagnosticTimers.get(document.uri);
			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			const timer = setTimeout(() => {
				this.validateDocument(document.uri);
				this.diagnosticTimers.delete(document.uri);
			}, this.config.diagnosticBounceMs);

			this.diagnosticTimers.set(document.uri, timer);
		}
	}

	private onDidSave({ document }: TextDocumentChangeEvent<TextDocument>) {
		this.connection.console.log(`Document saved: ${document.uri}`);
		this.validateDocument(document.uri);
	}

	private onDidClose(event: TextDocumentChangeEvent<TextDocument>) {
		this.connection.console.log(`Document closed: ${event.document.uri}`);

		const timer = this.diagnosticTimers.get(event.document.uri);
		if (timer) {
			clearTimeout(timer);
			this.diagnosticTimers.delete(event.document.uri);
		}

		this.powerbuilderLanguageService.removeDocument(event.document.uri);

		this.connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
	}

	private validateDocument(uri: string): void {
		try {
			const diagnostics = this.powerbuilderLanguageService.validate(uri);
			this.connection.sendDiagnostics({ uri, diagnostics });
			this.connection.console.log(`Sent ${diagnostics.length} diagnostic(s) for ${uri}`);
		} catch (error) {
			this.connection.console.error(`Error validating document ${uri}: ${error}`);
		}
	}

	public getDocuments() {
		return this.documents;
	}

	public getDocumentByURI(uri: string) {
		return this.documents.get(uri);
	}

	public setCurrentDocument(document: TextDocument) {
		this.currentDocument = document;
	}
}

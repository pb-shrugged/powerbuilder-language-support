import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	TextDocumentSyncKind,
	InitializeResult,
	HoverParams,
	DefinitionParams,
	DocumentSymbolParams,
	DidChangeTextDocumentParams,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import {
	PowerBuilderLanguageService,
	TextDocumentContentChangeEvent,
} from "@powerbuilder-lsp/language-service";

// Cria a conexão do servidor usando Node IPC
const connection = createConnection(ProposedFeatures.all);

// Gerenciador de documentos de texto
const documents = new TextDocuments(TextDocument);

// Instância do language service
const languageService = new PowerBuilderLanguageService();

// Timer para debounce de diagnósticos
const diagnosticTimers = new Map<string, NodeJS.Timeout>();
const DIAGNOSTIC_DEBOUNCE_MS = 300;

// Lifecycle: Initialize
connection.onInitialize((params: InitializeParams): InitializeResult => {
	connection.console.log("PowerBuilder Language Server initializing...");

	return {
		capabilities: {
			textDocumentSync: {
				openClose: true,
				change: TextDocumentSyncKind.Incremental,
				save: {
					includeText: false,
				},
			},
			hoverProvider: true,
			definitionProvider: true,
			documentSymbolProvider: true,
		},
	};
});

// Lifecycle: Initialized
connection.onInitialized(() => {
	connection.console.log("PowerBuilder Language Server initialized!");
});

// Lifecycle: Shutdown
connection.onShutdown(() => {
	connection.console.log("PowerBuilder Language Server shutting down...");
	languageService.clear();
});

// Lifecycle: Exit
connection.onExit(() => {
	connection.console.log("PowerBuilder Language Server exited.");
});

// Documento aberto
documents.onDidOpen(({ document }) => {
	connection.console.log(`Document opened: ${document.uri}`);

	// Faz o parsing inicial
	languageService.parseAndCache(
		document.uri,
		document.getText(),
		document.version
	);

	// Valida imediatamente
	validateDocument(document.uri);
});

// Documento modificado
documents.onDidChangeContent(({ document }) => {
	connection.console.log(`Document changed: ${document.uri}`);

	// Limpa o timer anterior
	const existingTimer = diagnosticTimers.get(document.uri);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	// Agenda validação com debounce
	const timer = setTimeout(() => {
		validateDocument(document.uri);
		diagnosticTimers.delete(document.uri);
	}, DIAGNOSTIC_DEBOUNCE_MS);

	diagnosticTimers.set(document.uri, timer);
});

// Documento salvo
documents.onDidSave(({ document }) => {
	connection.console.log(`Document saved: ${document.uri}`);
	// Re-valida ao salvar
	validateDocument(document.uri);
});

// Documento fechado
documents.onDidClose(({ document }) => {
	connection.console.log(`Document closed: ${document.uri}`);

	// Limpa timer de diagnóstico
	const timer = diagnosticTimers.get(document.uri);
	if (timer) {
		clearTimeout(timer);
		diagnosticTimers.delete(document.uri);
	}

	// Remove do cache
	languageService.removeDocument(document.uri);

	// Limpa diagnósticos
	connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
});

// Handler para mudanças incrementais
connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => {
	const { textDocument, contentChanges } = params;
	const document = documents.get(textDocument.uri);

	if (!document) {
		return;
	}

	// Converte contentChanges para o tipo esperado pelo language service
	const changes: TextDocumentContentChangeEvent[] = contentChanges.map(
		(change) => ({
			range: "range" in change ? change.range : undefined,
			rangeLength: "rangeLength" in change ? change.rangeLength : undefined,
			text: change.text,
		})
	);

	// Atualiza usando parsing incremental
	const success = languageService.updateWithChanges(
		textDocument.uri,
		changes,
		textDocument.version
	);

	if (!success) {
		// Fallback: re-parse completo
		connection.console.warn(
			`Incremental update failed for ${textDocument.uri}, falling back to full parse`
		);
		languageService.parseAndCache(
			textDocument.uri,
			document.getText(),
			document.version
		);
	}
});

// Feature: Hover
connection.onHover((params: HoverParams) => {
	try {
		const hover = languageService.provideHover(
			params.textDocument.uri,
			params.position
		);
		return hover;
	} catch (error) {
		connection.console.error(`Error providing hover: ${error}`);
		return null;
	}
});

// Feature: Go to Definition
connection.onDefinition((params: DefinitionParams) => {
	try {
		const definition = languageService.findDefinition(
			params.textDocument.uri,
			params.position
		);
		return definition;
	} catch (error) {
		connection.console.error(`Error finding definition: ${error}`);
		return null;
	}
});

// Feature: Document Symbols
connection.onDocumentSymbol((params: DocumentSymbolParams) => {
	try {
		const symbols = languageService.buildDocumentSymbols(
			params.textDocument.uri
		);
		return symbols;
	} catch (error) {
		connection.console.error(`Error building document symbols: ${error}`);
		return [];
	}
});

/**
 * Valida um documento e envia diagnósticos
 */
function validateDocument(uri: string): void {
	try {
		const diagnostics = languageService.validate(uri);
		connection.sendDiagnostics({ uri, diagnostics });
		connection.console.log(
			`Sent ${diagnostics.length} diagnostic(s) for ${uri}`
		);
	} catch (error) {
		connection.console.error(`Error validating document ${uri}: ${error}`);
	}
}

// Registra os documentos na conexão
documents.listen(connection);

// Inicia o servidor
connection.listen();

connection.console.log("PowerBuilder Language Server started and listening...");

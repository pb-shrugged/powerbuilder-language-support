import * as path from "path";
import { ExtensionContext,workspace } from "vscode";
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext): void {
	console.log("PowerBuilder LSP extension is now active!");

	const serverModule = context.asAbsolutePath(
		path.join("..", "packages", "pb-language-server", "out", "server.js")
	);

	const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

	const serverOptions: ServerOptions = {
		run: {
			module: serverModule,
			transport: TransportKind.ipc,
		},
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions,
		},
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: "file", language: "powerbuilder" }],
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
		},
	};

	client = new LanguageClient(
		"powerbuilderLanguageServer",
		"PowerBuilder Language Server",
		serverOptions,
		clientOptions
	);

	client.start();

	console.log("PowerBuilder Language Client started");
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	console.log("PowerBuilder LSP extension is now deactivating...");
	return client.stop();
}

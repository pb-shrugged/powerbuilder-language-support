import * as path from 'path';
import { commands, ExtensionContext, window, workspace } from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export const CONFIGURATION_SECTION = 'powerbuilderLanguageServer'; // matching the package.json configuration section

export async function activate(context: ExtensionContext): Promise<void> {
	window.showInformationMessage(
		'Initialize extension PowerBuilder Language Support Client',
	);

	const config = workspace.getConfiguration(CONFIGURATION_SECTION);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const env: any = {
		...process.env,
		BASH_IDE_LOG_LEVEL: config.get('logLevel', ''),
	};

	const serverExecutable = {
		module: context.asAbsolutePath(
			path.join('..', 'packages', 'pb-language-server', 'out', 'index-node-server.js'),
		),
		transport: TransportKind.ipc,
		options: {
			env,
		},
	};

	const debugServerExecutable = {
		...serverExecutable,
		options: {
			...serverExecutable.options,
			execArgv: ['--nolazy', '--inspect=6019'],
		},
	};

	const serverOptions: ServerOptions = {
		run: serverExecutable,
		debug: debugServerExecutable,
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'powerbuilder' },
			{ scheme: 'file', pattern: '**/*.{sra,srf,srs,sru,srw,srm,srd,srq}' },
		],
		synchronize: {
			fileEvents: [
				workspace.createFileSystemWatcher('**/.clientrc'),
				workspace.createFileSystemWatcher('**/*.{sra,srf,srs,sru,srw,srm,srd,srq}'),
				workspace.createFileSystemWatcher('**/powerbuilder.json'), // potential config file
				workspace.createFileSystemWatcher('**/.powerbuilder/**'), // potential settings directory
			],
			configurationSection: CONFIGURATION_SECTION,
		},
	};

	client = new LanguageClient(
		'powerbuilderLanguageServer',
		'PowerBuilder Language Server',
		serverOptions,
		clientOptions,
	);
	client.registerProposedFeatures();

	registerCommands(context);

	try {
		await client.start();
	} catch (error) {
		client.error(`Start failed`, error, 'force');
	}
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}

	return client.stop();
}

function registerCommands(context: ExtensionContext) {
	// Command to restart the language server
	const restartCommand = commands.registerCommand(
		'powerbuilderLanguageSupport.restartServer',
		async () => {
			if (client) {
				await client.stop();
				await client.start();
				window.showInformationMessage('PowerBuilder Language Server restarted');
			}
		},
	);

	// Command to show server status
	const statusCommand = commands.registerCommand(
		'powerbuilderLanguageSupport.showServerStatus',
		() => {
			if (client) {
				const state = client.state;
				const stateNames = ['Stopped', 'Starting', 'Running'];
				const stateName = stateNames[state] || 'Unknown';

				window.showInformationMessage(
					`PowerBuilder Language Server LSP Status: ${stateName}`,
				);
			} else {
				window.showWarningMessage('PowerBuilder Language Server is not initialized');
			}
		},
	);

	// Command to show server output
	const showOutputCommand = commands.registerCommand(
		'powerbuilderLanguageSupport.showOutput',
		() => {
			client?.outputChannel.show();
		},
	);

	context.subscriptions.push(restartCommand, statusCommand, showOutputCommand);
}

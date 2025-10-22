import { logger } from '@powerbuilder-language-support/logger';
import {
	createConnection,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
} from 'vscode-languageserver/node';

import PowerBuilderServer from './server/server';

// Cria a conexão do servidor usando Node IPC
const connection = createConnection(ProposedFeatures.all);

connection.onInitialize((params: InitializeParams): InitializeResult => {
	logger.getLogger().info('PowerBuilder Language Server initializing...');

	const server = PowerBuilderServer.initialize({ connection, initializeParams: params });
	server.register(connection);

	return {
		capabilities: server.getCapabilities(),
	};
});

// Inicia o servidor
connection.listen();

logger.getLogger().info('PowerBuilder Language Server started and listening...');

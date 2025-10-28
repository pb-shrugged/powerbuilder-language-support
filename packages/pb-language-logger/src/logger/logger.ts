import winston from 'winston';

export default class Logger {
	private logger: winston.Logger;

	public constructor() {
		this.logger = winston.createLogger({
			transports: [new winston.transports.Console()],
			format: winston.format.printf((info) => `${info.level}: ${info.message}`),
			level: 'debug',
		});
	}

	public getLogger() {
		return this.logger;
	}

	public addTransport() {}

	private setLoggerLevel(level: string) {
		this.logger.level = level;
	}

	public updateConfiguration(config: LoggerConfig): boolean {
		this.setLoggerLevel(config.logLevel);

		return true;
	}
}

export interface LoggerConfig {
	logLevel: string;
}

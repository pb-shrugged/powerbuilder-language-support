import winston from 'winston';

export class Logger {
	private logger: winston.Logger;

	public constructor() {
		this.logger = winston.createLogger({
			transports: [new winston.transports.Console()],
		});
	}

	public getLogger() {
		return this.logger;
	}

	public addTransport() {}
}

export const logger = new Logger();

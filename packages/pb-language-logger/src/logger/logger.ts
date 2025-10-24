import winston from 'winston';

export default class Logger {
	private logger: winston.Logger;

	public constructor() {
		this.logger = winston.createLogger({
			transports: [new winston.transports.Console()],
			format: winston.format.printf((info) => `${info.level}: ${info.message}`),
		});
	}

	public getLogger() {
		return this.logger;
	}

	public addTransport() {}
}

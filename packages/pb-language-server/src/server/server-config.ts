import { z } from 'zod';

export const CONFIGURATION_SECTION = 'powerbuilderLanguageServer';

export const ConfigSchema = z.object({
	maxNumberOfProblems: z.number().int().min(0).default(100),
	logLevel: z.string().default('DEBUG'),
	diagnosticBounceMs: z.number().int().min(0).default(300),
});

export type Config = z.infer<typeof ConfigSchema>;

export function getDefaultConfiguration(): Config {
	return ConfigSchema.parse({});
}

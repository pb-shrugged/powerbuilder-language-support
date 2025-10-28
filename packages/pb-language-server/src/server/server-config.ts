import { z } from 'zod';

export const CONFIGURATION_SECTION = 'powerbuilderLanguageServer';

export const ConfigSchema = z.object({
	maxNumberOfProblems: z.number().int().min(0).default(100),
	logLevel: z.string().default('debug'),
	diagnosticBounceMs: z.number().int().min(0).default(300),
	backgroundAnalysisMaxFiles: z.number().int().min(0).default(500),
	globPattern: z
		.string()
		.trim()
		.default('**/*@(.sra|.srw|.sru|.srm|.srf|.srd|.srs|.srq|)'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function getDefaultConfiguration(): Config {
	return ConfigSchema.parse({});
}

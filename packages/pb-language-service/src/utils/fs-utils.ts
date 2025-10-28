import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

import * as fastGlob from 'fast-glob';

export async function getFilePaths({
	filesGlobPattern,
	rootPath,
	maxItems,
}: {
	filesGlobPattern: string;
	rootPath: string;
	maxItems?: number;
}): Promise<string[]> {
	if (rootPath.startsWith('file://')) {
		rootPath = fileURLToPath(rootPath);
	}

	const stream = fastGlob.stream([filesGlobPattern], {
		absolute: true,
		onlyFiles: true,
		cwd: rootPath,
		followSymlinkedDirectories: true,
	});

	// NOTE: we use a stream here to not block the event loop
	// and ensure that we stop reading files if the glob returns
	// too many files.
	const files = [];
	let i = 0;
	for await (const fileEntry of stream) {
		if (maxItems && i >= maxItems) {
			// NOTE: Close the stream to stop reading files paths.
			stream.emit('close');
			break;
		}

		files.push(fileEntry.toString());
		i++;
	}

	return files;
}

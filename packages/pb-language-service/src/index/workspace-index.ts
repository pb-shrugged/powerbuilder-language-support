import { Range, SymbolKind } from 'vscode-languageserver-types';

import { Symbol } from '../symbols/symbol-provider';

/**
 * Represents a symbol indexed in the workspace with its location
 */
export interface IndexedSymbol {
	name: string;
	kind: SymbolKind;
	uri: string;
	range: Range;
	selectionRange: Range;
	detail?: string;
}

/**
 * Workspace-wide symbol index for cross-file navigation
 * 
 * Maintains a global index of all symbols across all documents in the workspace.
 * Supports efficient lookup by symbol name and handles incremental updates.
 */
export class WorkspaceIndex {
	// Map from symbol name (lowercase) to array of indexed symbols
	// Multiple symbols can have the same name (e.g., in different files)
	private symbolsByName: Map<string, IndexedSymbol[]>;

	// Map from document URI to all symbols in that document
	// Used for efficient removal when a document is closed or updated
	private symbolsByDocument: Map<string, IndexedSymbol[]>;

	constructor() {
		this.symbolsByName = new Map();
		this.symbolsByDocument = new Map();
	}

	/**
	 * Index symbols from a document
	 * Replaces any existing symbols from the same document
	 * 
	 * @param uri Document URI
	 * @param symbols Array of symbols to index
	 */
	indexDocument(uri: string, symbols: Symbol[]): void {
		// Remove existing symbols from this document
		this.removeDocument(uri);

		// Convert symbols to indexed symbols
		const indexedSymbols: IndexedSymbol[] = symbols.map((symbol) => ({
			name: symbol.name,
			kind: symbol.kind,
			uri,
			range: symbol.range,
			selectionRange: symbol.selectionRange,
			detail: symbol.detail,
		}));

		// Store by document URI
		this.symbolsByDocument.set(uri, indexedSymbols);

		// Index by name (case-insensitive for PowerBuilder)
		for (const symbol of indexedSymbols) {
			const normalizedName = this.normalizeName(symbol.name);
			const existing = this.symbolsByName.get(normalizedName) || [];
			existing.push(symbol);
			this.symbolsByName.set(normalizedName, existing);
		}
	}

	/**
	 * Remove all symbols from a document
	 * 
	 * @param uri Document URI to remove
	 */
	removeDocument(uri: string): void {
		const symbols = this.symbolsByDocument.get(uri);
		if (!symbols) {
			return;
		}

		// Remove from name index
		for (const symbol of symbols) {
			const normalizedName = this.normalizeName(symbol.name);
			const existing = this.symbolsByName.get(normalizedName);
			if (existing) {
				const filtered = existing.filter((s) => s.uri !== uri);
				if (filtered.length === 0) {
					this.symbolsByName.delete(normalizedName);
				} else {
					this.symbolsByName.set(normalizedName, filtered);
				}
			}
		}

		// Remove from document index
		this.symbolsByDocument.delete(uri);
	}

	/**
	 * Find all symbols with a given name
	 * Search is case-insensitive (PowerBuilder convention)
	 * 
	 * @param name Symbol name to search for
	 * @returns Array of matching symbols (may be empty)
	 */
	findSymbols(name: string): IndexedSymbol[] {
		const normalizedName = this.normalizeName(name);
		return this.symbolsByName.get(normalizedName) || [];
	}

	/**
	 * Find symbols with a given name, excluding a specific document
	 * Useful for finding symbols in other files
	 * 
	 * @param name Symbol name to search for
	 * @param excludeUri URI to exclude from results
	 * @returns Array of matching symbols from other documents
	 */
	findSymbolsExcludingDocument(name: string, excludeUri: string): IndexedSymbol[] {
		const allSymbols = this.findSymbols(name);
		return allSymbols.filter((symbol) => symbol.uri !== excludeUri);
	}

	/**
	 * Find symbols with a given name and kind
	 * 
	 * @param name Symbol name to search for
	 * @param kind Symbol kind to match
	 * @returns Array of matching symbols
	 */
	findSymbolsByNameAndKind(name: string, kind: SymbolKind): IndexedSymbol[] {
		const symbols = this.findSymbols(name);
		return symbols.filter((symbol) => symbol.kind === kind);
	}

	/**
	 * Get all symbols from a specific document
	 * 
	 * @param uri Document URI
	 * @returns Array of symbols in the document
	 */
	getSymbolsInDocument(uri: string): IndexedSymbol[] {
		return this.symbolsByDocument.get(uri) || [];
	}

	/**
	 * Get all indexed symbols across the entire workspace
	 * 
	 * @returns Array of all indexed symbols
	 */
	getAllSymbols(): IndexedSymbol[] {
		const allSymbols: IndexedSymbol[] = [];
		for (const symbols of this.symbolsByDocument.values()) {
			allSymbols.push(...symbols);
		}
		return allSymbols;
	}

	/**
	 * Get statistics about the index
	 * Useful for debugging and monitoring
	 * 
	 * @returns Index statistics
	 */
	getStats(): {
		totalDocuments: number;
		totalSymbols: number;
		uniqueNames: number;
	} {
		return {
			totalDocuments: this.symbolsByDocument.size,
			totalSymbols: this.getAllSymbols().length,
			uniqueNames: this.symbolsByName.size,
		};
	}

	/**
	 * Clear the entire index
	 */
	clear(): void {
		this.symbolsByName.clear();
		this.symbolsByDocument.clear();
	}

	/**
	 * Normalize a symbol name for case-insensitive comparison
	 * PowerBuilder is case-insensitive, so we lowercase everything
	 * 
	 * @param name Symbol name to normalize
	 * @returns Normalized name
	 */
	private normalizeName(name: string): string {
		return name.toLowerCase().trim();
	}
}

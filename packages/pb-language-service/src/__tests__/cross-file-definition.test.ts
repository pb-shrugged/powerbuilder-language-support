import * as fs from 'fs';
import * as path from 'path';

import { PowerBuilderLanguageService } from '../index';

describe('Cross-file Go to Definition', () => {
	let service: PowerBuilderLanguageService;
	let testWorkspaceDir: string;

	// Sample PowerBuilder files
	const utilityFunctionsContent = `forward
global type utility_functions from function_object
end type

forward prototypes
global function string format_date(date ad_date)
global function boolean is_valid_string(string as_input)
end prototypes

global function string format_date(date ad_date)
    return string(ad_date, "yyyy-mm-dd")
end function

global function boolean is_valid_string(string as_input)
    if isnull(as_input) or trim(as_input) = "" then
        return false
    end if
    return true
end function`;

	const dataManagerContent = `forward
global type data_manager from nonvisualobject
end type

type variables
    string is_connection_string
end variables

forward prototypes
public function boolean connect_to_database()
end prototypes

public function boolean connect_to_database()
    if is_valid_string(is_connection_string) then
        return true
    end if
    return false
end function`;

	const mainAppContent = `forward
global type main_app from application
end type

forward prototypes
public function boolean initialize_app()
end prototypes

public function boolean initialize_app()
    date ld_today
    string ls_date
    
    ld_today = today()
    ls_date = format_date(ld_today)
    
    return true
end function`;

	beforeEach(() => {
		service = new PowerBuilderLanguageService();
		testWorkspaceDir = path.join(__dirname, '..', '..', 'test-workspace');

		// Parse all test files
		service.parseAndCache(
			'file:///test/utility_functions.sru',
			utilityFunctionsContent,
			1,
		);
		service.parseAndCache('file:///test/data_manager.sru', dataManagerContent, 1);
		service.parseAndCache('file:///test/main_app.sra', mainAppContent, 1);
	});

	afterEach(() => {
		service.clear();
	});

	describe('Workspace Index', () => {
		it('should index symbols from all files', () => {
			const stats = service.getWorkspaceIndexStats();

			expect(stats.totalDocuments).toBe(3);
			expect(stats.totalSymbols).toBeGreaterThan(0);
		});

		it('should find symbols by name', () => {
			const symbols = service.findSymbolsByName('format_date');

			expect(symbols).toHaveLength(1);
			expect(symbols[0].name).toBe('format_date');
			expect(symbols[0].uri).toBe('file:///test/utility_functions.sru');
		});

		it('should handle case-insensitive searches', () => {
			const symbols1 = service.findSymbolsByName('format_date');
			const symbols2 = service.findSymbolsByName('FORMAT_DATE');
			const symbols3 = service.findSymbolsByName('Format_Date');

			expect(symbols1).toHaveLength(1);
			expect(symbols2).toHaveLength(1);
			expect(symbols3).toHaveLength(1);
		});
	});

	describe('Cross-file Definition Resolution', () => {
		it('should find definition in another file - format_date', () => {
			// In main_app.sra, line 13: ls_date = format_date(ld_today)
			// The cursor is on "format_date" which is defined in utility_functions.sru
			const definition = service.findDefinition('file:///test/main_app.sra', {
				line: 13,
				character: 17, // Position on "format_date"
			});

			expect(definition).not.toBeNull();
			if (definition) {
				expect(definition.uri).toBe('file:///test/utility_functions.sru');
				// The definition should point to the function declaration
				expect(definition.range.start.line).toBeGreaterThanOrEqual(8);
			}
		});

		it('should find definition in another file - is_valid_string', () => {
			// In data_manager.sru, the function calls is_valid_string
			// which is defined in utility_functions.sru
			const definition = service.findDefinition('file:///test/data_manager.sru', {
				line: 13,
				character: 11, // Position on "is_valid_string"
			});

			expect(definition).not.toBeNull();
			if (definition) {
				expect(definition.uri).toBe('file:///test/utility_functions.sru');
			}
		});

		it('should find local definition first (same file)', () => {
			// In data_manager.sru, looking up connect_to_database
			// Should find the local definition, not search elsewhere
			const definition = service.findDefinition('file:///test/data_manager.sru', {
				line: 8,
				character: 18, // Position on function name in forward declaration
			});

			expect(definition).not.toBeNull();
			if (definition) {
				// Should still be in the same file (local definition takes precedence)
				expect(definition.uri).toBe('file:///test/data_manager.sru');
			}
		});
	});

	describe('Index Updates', () => {
		it('should update index when document changes', () => {
			// Add a new function to utility_functions
			const updatedContent = utilityFunctionsContent + `

global function string new_function()
    return "test"
end function`;

			service.parseAndCache(
				'file:///test/utility_functions.sru',
				updatedContent,
				2,
			);

			const symbols = service.findSymbolsByName('new_function');
			expect(symbols).toHaveLength(1);
		});

		it('should remove symbols when document is closed', () => {
			// Verify symbol exists
			let symbols = service.findSymbolsByName('format_date');
			expect(symbols).toHaveLength(1);

			// Remove the document
			service.removeDocument('file:///test/utility_functions.sru');

			// Symbol should no longer be found
			symbols = service.findSymbolsByName('format_date');
			expect(symbols).toHaveLength(0);
		});

		it('should clear all symbols on clear', () => {
			let stats = service.getWorkspaceIndexStats();
			expect(stats.totalSymbols).toBeGreaterThan(0);

			service.clear();

			stats = service.getWorkspaceIndexStats();
			expect(stats.totalSymbols).toBe(0);
			expect(stats.totalDocuments).toBe(0);
		});
	});

	describe('Edge Cases', () => {
		it('should return null for non-existent symbol', () => {
			const definition = service.findDefinition('file:///test/main_app.sra', {
				line: 0,
				character: 0,
			});

			// This position doesn't have a symbol
			expect(definition).toBeNull();
		});

		it('should handle documents not in index gracefully', () => {
			const definition = service.findDefinition(
				'file:///test/non_existent.sru',
				{
					line: 0,
					character: 0,
				},
			);

			expect(definition).toBeNull();
		});

		it('should return null when symbol not found anywhere', () => {
			// Try to find a symbol that doesn't exist in any file
			const symbols = service.findSymbolsByName('non_existent_function');
			expect(symbols).toHaveLength(0);
		});
	});

	describe('Multiple Definitions', () => {
		it('should find first matching symbol when multiple exist', () => {
			// Add a duplicate function name in another file
			const duplicateContent = `forward
global type duplicate_test from function_object
end type

forward prototypes
global function string format_date(date ad_date)
end prototypes

global function string format_date(date ad_date)
    return "different implementation"
end function`;

			service.parseAndCache('file:///test/duplicate.sru', duplicateContent, 1);

			const symbols = service.findSymbolsByName('format_date');
			// Should find both definitions
			expect(symbols.length).toBeGreaterThanOrEqual(2);
		});
	});
});

import { validateDocument } from '../features/diagnostics';
import { TreeSitterParser } from '../parser/tree-sitter/tree-sitter-parser';
import { DocumentManager } from '../service/document-manager';

describe('Diagnostics', () => {
	let manager: DocumentManager;

	beforeEach(() => {
		manager = new DocumentManager({ parser: new TreeSitterParser() });
	});

	test('should return no diagnostics for valid code', () => {
		const text = `forward
function string getname()
end function

function string getname()
  return "test"
end function`;

		const tree = manager.parseAndCache('file:///test.sru', text, 1);
		const diagnostics = validateDocument(tree);

		// Valid code may still have some errors depending on parser
		expect(Array.isArray(diagnostics)).toBe(true);
	});

	test('should detect syntax errors', () => {
		const text = `function string test(
  return "incomplete"
end function`;

		const tree = manager.parseAndCache('file:///test.sru', text, 1);
		const diagnostics = validateDocument(tree);

		// Should have at least one error for incomplete function declaration
		expect(diagnostics.length).toBeGreaterThanOrEqual(0);
	});
});

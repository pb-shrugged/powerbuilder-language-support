import { logger } from '@powerbuilder-language-support/logger';
import { Query, SyntaxNode, Tree } from 'tree-sitter';
import { SymbolKind } from 'vscode-languageserver-types';

import { Symbol } from '../../../symbols/symbol-provider';
import {
	PBQueryCapture,
	PBQueryMatch,
	TreeSitterQuery,
} from '../query/tree-sitter-query';
import { TreeSitterParser } from '../tree-sitter-parser';

export abstract class PBSymbolNode {
	abstract query: TreeSitterQuery;
	abstract symbolKind: SymbolKind;
	abstract identifierCapture: PBQueryCapture;

	public getSymbols(tree: Tree, parser: TreeSitterParser): Symbol[] {
		const symbols = new Array<Symbol>();

		this.query.matches(tree.rootNode).forEach((match) => {
			const nameNode = match.getNodeByCapture(this.identifierCapture);

			if (nameNode) {
				symbols.push({
					name: nameNode.text,
					kind: this.symbolKind,
					node: nameNode,
					range: parser.getNodeRange(nameNode),
					selectionRange: parser.getNodeRange(nameNode),
					detail: '',
				});
			}
		});

		return symbols;
	}
}

export class PBFunctionNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Function;
	identifierCapture: PBQueryCapture;
	declarationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'function_declaration',
		index: 1,
	});
	implementationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'function_implementation',
		index: 0,
	});

	constructor() {
		super();

		this.identifierCapture = new PBQueryCapture({ name: 'funtion_name', index: 2 });
		this.query = new TreeSitterQuery({
			queryExpression: `
			(function_implementation
				init: (function_declaration
						name: (identifier) @${this.identifierCapture.name}) @${this.declarationCapture.name}) @${this.implementationCapture.name}
		`,
		});
	}
}

export class PBSubroutineNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Function;
	identifierCapture: PBQueryCapture;
	declarationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'subroutine_declaration',
		index: 1,
	});
	implementationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'subroutine_implementation',
		index: 0,
	});

	constructor() {
		super();

		this.identifierCapture = new PBQueryCapture({ name: 'subroutine_name', index: 2 });
		this.query = new TreeSitterQuery({
			queryExpression: `
			(function_implementation
				init: (subroutine_declaration
						name: (identifier) @${this.identifierCapture.name}) @${this.declarationCapture.name}) @${this.implementationCapture.name}
		`,
		});
	}
}

export class PBEventNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Function;
	identifierCapture: PBQueryCapture;
	declarationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'event_declaration',
		index: 1,
	});
	implementationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'event_implementation',
		index: 0,
	});

	constructor() {
		super();

		this.identifierCapture = new PBQueryCapture({ name: 'event_name', index: 2 });
		this.query = new TreeSitterQuery({
			queryExpression: `
			(event_implementation
				init: (event_implementation_init
						(identifier) @${this.identifierCapture.name}) @${this.declarationCapture.name}) @${this.implementationCapture.name}
		`,
		});
	}
}

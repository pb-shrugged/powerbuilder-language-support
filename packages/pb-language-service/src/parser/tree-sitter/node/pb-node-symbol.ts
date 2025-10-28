import { logger } from '@powerbuilder-language-support/logger';
import { SyntaxNode, Tree } from 'tree-sitter';
import { SymbolKind } from 'vscode-languageserver-types';

import { Symbol } from '../../../symbols/symbol-provider';
import { PBQueryCapture, TreeSitterQuery } from '../query/tree-sitter-query';
import { TreeSitterParser } from '../tree-sitter-parser';

export abstract class PBSymbolNode {
	abstract query: TreeSitterQuery;
	abstract symbolKind: SymbolKind;
	abstract identifierCapture: PBQueryCapture;
	abstract scopeCapture: PBQueryCapture;
	childrenSymbols: PBSymbolNode[] = [];
	_isTopLevel = false;

	public getSymbols(
		node: SyntaxNode,
		parser: TreeSitterParser,
	): { documentSymbols: Symbol[]; topLevelSymbols: Symbol[] } {
		const symbols = new Array<Symbol>();
		const topLevelSymbols = new Array<Symbol>();

		this.query.matches(node).forEach((match) => {
			const nameNode = match.getNodeByCapture(this.identifierCapture);
			const scopeNode = match.getNodeByCapture(this.scopeCapture);

			if (nameNode) {
				const nameSymbol: Symbol = {
					name: nameNode.text.toLocaleLowerCase(),
					kind: this.symbolKind,
					node: nameNode,
					range: parser.getNodeRange(nameNode),
					selectionRange: parser.getNodeRange(nameNode),
					detail: '',
					children: new Array<Symbol>(),
					isTopLevel: this.isTopLevel(),
				};

				symbols.push(nameSymbol);

				if (this.isTopLevel()) {
					topLevelSymbols.push(nameSymbol);
				}

				if (this.childrenSymbols.length > 0) {
					this.childrenSymbols.forEach((childSymbol) => {
						if (nameSymbol.children) {
							const searchNode = scopeNode || node;
							const { documentSymbols, topLevelSymbols: childTopLevelSymbols } =
								childSymbol.getSymbols(searchNode, parser);

							nameSymbol.children.push(...documentSymbols);
							symbols.push(...documentSymbols);
							topLevelSymbols.push(...childTopLevelSymbols);
						}
					});
				}
			}
		});

		return { documentSymbols: symbols, topLevelSymbols };
	}

	public isTopLevel(): boolean {
		return this._isTopLevel;
	}
}

export class PBClassNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Class;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'class_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(class_content
				(global_type_definition
							init: (global_type_declaration_init
								(type_declaration_init
									type_name: (identifier) @${this.identifierCapture.name})))) @${this.scopeCapture.name}
		`,
		});

		this.childrenSymbols.push(
			...[
				new PBInnerStructureNode(),
				new PBClassPropertyNode(),
				new PBInnerClassObjectNode(),
				new PBInstanceVariableNode(),
				new PBSharedVariableNode(),
				new PBFunctionNode(),
				new PBSubroutineNode(),
				new PBEventNode(),
				new PBExternalFunctionNode(),
			],
		);
	}
}

export class PBInnerStructureNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Struct;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this.identifierCapture = new PBQueryCapture({
			name: 'inner_class_structure_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(class_content
				(structure_definition_section
						(structure_definition
								init: (structure_definition_init
										(identifier) @${this.identifierCapture.name})) @${this.scopeCapture.name}))
		`,
		});

		this.childrenSymbols.push(new PBStructureFieldNode());
	}
}

export class PBStructureFieldNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Field;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'structure_field',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
				(structure_definition
					body: (structure_definition_body
							(structure_field
									(identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name}))
		`,
		});
	}
}

export class PBClassPropertyNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Property;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'class_property_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(class_content
				(global_type_definition
						body: (type_definition_body
								(inner_object_var_declaration
										(local_variable_declaration
												(variable_declaration_list
														(variable_declaration_identifier
																var_name: (identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name}))))))
		`,
		});
	}
}

export class PBInnerClassObjectNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Property;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'inner_class_object_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(inner_type_definition
				(type_definition
						init: (type_declaration_init
								type_name: (identifier) @${this.identifierCapture.name}))) @${this.scopeCapture.name}
		`,
		});
	}
}

export class PBInstanceVariableNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Property;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'instance_variable_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});

		this.query = new TreeSitterQuery({
			queryExpression: `
			(type_variables_section
				body: (type_variables_section_body
						(class_variable_declaration
								(inline_class_variable_declaration
										(local_variable_declaration
												(variable_declaration_list
														(variable_declaration_identifier
																var_name: (identifier)@${this.identifierCapture.name}) @${this.scopeCapture.name}))))))

			(type_variables_section
				body: (type_variables_section_body
						(class_variable_declaration
								(block_class_variable_declaration
										(inline_class_variable_declaration
												(local_variable_declaration
														(variable_declaration_list
																(variable_declaration_identifier
																		var_name: (identifier)@${this.identifierCapture.name}) @${this.scopeCapture.name})))))))
		`,
		});
	}
}

export class PBSharedVariableNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Property;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this.identifierCapture = new PBQueryCapture({
			name: 'shared_variable_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(shared_variables_section
				body: (shared_variables_section_body
						(local_variable_declaration
								(variable_declaration_list
										(variable_declaration_identifier
												var_name: (identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name}))))
		`,
		});
	}
}

export class PBFunctionNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Method;
	identifierCapture: PBQueryCapture;
	declarationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'function_declaration',
		index: 1,
	});
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({ name: 'funtion_name', index: 2 });
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(function_implementation
				init: (function_declaration
						name: (identifier) @${this.identifierCapture.name}) @${this.declarationCapture.name}) @${this.scopeCapture.name}
		`,
		});

		this.childrenSymbols.push(
			...[new PBFunctionParameterVariableNode(), new PBLocalVariableNode()],
		);
	}
}

export class PBSubroutineNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Method;
	identifierCapture: PBQueryCapture;
	declarationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'subroutine_declaration',
		index: 1,
	});

	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({ name: 'subroutine_name', index: 2 });
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(function_implementation
				init: (subroutine_declaration
						name: (identifier) @${this.identifierCapture.name}) @${this.declarationCapture.name}) @${this.scopeCapture.name}
		`,
		});

		this.childrenSymbols.push(
			...[new PBFunctionParameterVariableNode(), new PBLocalVariableNode()],
		);
	}
}

export class PBEventNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Event;
	identifierCapture: PBQueryCapture;
	declarationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'event_declaration',
		index: 1,
	});
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({ name: 'event_name', index: 2 });
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(event_implementation
				init: (event_implementation_init
						(identifier) @${this.identifierCapture.name}) @${this.declarationCapture.name}) @${this.scopeCapture.name}
		`,
		});

		this.childrenSymbols.push(
			...[new PBFunctionParameterVariableNode(), new PBLocalVariableNode()],
		);
	}
}

export class PBExternalFunctionNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Method;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'external_function_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(external_function_type_prototypes_section
				body: (external_function_declaration
						(function_prototype
								(function_declaration
										name: (identifier) @${this.identifierCapture.name}))) @${this.scopeCapture.name})
		`,
		});

		this.childrenSymbols.push(...[new PBFunctionParameterVariableNode()]);
	}
}

export class PBLocalVariableNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Variable;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this.identifierCapture = new PBQueryCapture({
			name: 'local_variable_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(scriptable_block
				(statement
						(local_variable_declaration
								(variable_declaration_list
										(variable_declaration_identifier
												var_name: (identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name}))))
		`,
		});
	}
}

export class PBFunctionParameterVariableNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Variable;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this.identifierCapture = new PBQueryCapture({
			name: 'parameter_variable',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});

		this.query = new TreeSitterQuery({
			queryExpression: `
				(event_implementation
					init: (event_implementation_init
							(parameter_list
									(parameter
											(identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name})))

				(function_implementation
					init: (function_declaration
							(parameter_list
									(parameter
											(identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name})))

				(function_implementation
					init: (subroutine_declaration
							(parameter_list
									(parameter
											(identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name})))

				(external_function_declaration
					(function_prototype
						(function_declaration
							(parameter_list
								(parameter
									(identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name}))))
		`,
		});
	}
}

export class PBGlobalFunctionNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Function;
	identifierCapture: PBQueryCapture;
	declarationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'global_function_declaration',
		index: 1,
	});
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'global_function_name',
			index: 2,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});

		this.query = new TreeSitterQuery({
			queryExpression: `
			(global_function_implementaion_section
				(global_function_implementation
						init: (global_function_declaration
								(identifier) @${this.identifierCapture.name}) @${this.declarationCapture.name}) @${this.scopeCapture.name})
		`,
		});

		this.childrenSymbols.push(
			...[new PBFunctionParameterVariableNode(), new PBLocalVariableNode()],
		);
	}
}

export class PBGlobalSubroutineNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Function;
	identifierCapture: PBQueryCapture;
	declarationCapture: PBQueryCapture = new PBQueryCapture({
		name: 'global_subroutine_declaration',
		index: 1,
	});
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'global_subroutine_name',
			index: 2,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(global_function_implementaion_section
				(global_function_implementation
						init: (global_subroutine_declaration
								(identifier) @${this.identifierCapture.name}) @${this.declarationCapture.name}) @${this.scopeCapture.name})
		`,
		});

		this.childrenSymbols.push(
			...[new PBFunctionParameterVariableNode(), new PBLocalVariableNode()],
		);
	}
}

export class PBGlobalStructureNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Struct;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'inner_class_structure_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});
		this.query = new TreeSitterQuery({
			queryExpression: `
			(structure_content
				(structure_definition
						init: (structure_definition_init
							(identifier) @${this.identifierCapture.name}))) @${this.scopeCapture.name}
		`,
		});

		this.childrenSymbols.push(new PBStructureFieldNode());
	}
}

export class PBGlobalVariableNode extends PBSymbolNode {
	query: TreeSitterQuery;
	symbolKind: SymbolKind = SymbolKind.Variable;
	identifierCapture: PBQueryCapture;
	scopeCapture: PBQueryCapture;

	constructor() {
		super();

		this._isTopLevel = true;

		this.identifierCapture = new PBQueryCapture({
			name: 'global_variable_name',
			index: 1,
		});
		this.scopeCapture = new PBQueryCapture({
			name: 'scope_node',
			index: 0,
		});

		this.query = new TreeSitterQuery({
			queryExpression: `
			(global_variables_section
				body: (global_variables_section_body
						(local_variable_declaration
								(variable_declaration_list
										(variable_declaration_identifier
												var_name: (identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name}))))
			(forward_section
				body: (forward_section_body
						(global_variable_declaration
								var_name: (identifier) @${this.identifierCapture.name}) @${this.scopeCapture.name}))
		`,
		});
	}
}

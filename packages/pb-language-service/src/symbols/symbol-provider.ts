import { logger } from '@powerbuilder-language-support/logger';
import Parser from 'tree-sitter';
import { Position, Range, SymbolKind, SymbolTag } from 'vscode-languageserver-types';

import { NodeType } from '../parser/tree-sitter/node/tree-sitter-node';
import * as TreeSitterUtils from '../parser/tree-sitter/tree-sitter-ast-utils';
import { TreeSitterParser } from '../parser/tree-sitter/tree-sitter-parser';
import { DocumentInfo } from '../service/document-manager';

export interface Symbol {
	name: string;
	kind: SymbolKind;
	range: Range;
	selectionRange: Range;
	detail?: string;
	tags?: SymbolTag[];
	children?: Symbol[];
	node: Parser.SyntaxNode;
	isTopLevel?: boolean;
}

/**
 * Provedor de símbolos usando queries Tree-sitter
 */
export class SymbolProvider {
	/**
	 * Coleta todos os símbolos top-level de um documento
	 */
	public getDocumentSymbols(
		parser: TreeSitterParser,
		document: DocumentInfo,
	): { documentSymbols: Symbol[]; topLevelSymbols: Symbol[] } {
		const sourceFile = parser.getSourceFile(document.tree);

		if (!sourceFile) {
			return { documentSymbols: [], topLevelSymbols: [] };
		}

		return sourceFile.getSymbols(parser);
	}

	/**
	 * Encontra a definição de um símbolo na posição especificada
	 */
	public findDefinitionAtPosition(
		parser: TreeSitterParser,
		document: DocumentInfo,
		position: Position,
	): Symbol | null {
		const { documentSymbols: symbols } = this.getDocumentSymbols(parser, document);

		// Primeiro, encontra o identificador na posição
		const node = this.findNodeAtPosition(document.tree.rootNode, position);
		if (!node) {
			return null;
		}

		const identifierText = TreeSitterUtils.getNodeText(node);

		// Procura um símbolo com o mesmo nome
		const matchingSymbol = symbols.find((s) => s.name === identifierText);
		return matchingSymbol || null;
	}

	/**
	 * Obtém informações para hover na posição especificada
	 */
	public getHoverInfo(
		tree: Parser.Tree,
		position: Position,
	): { contents: string; range: Range } | null {
		const node = this.findNodeAtPosition(tree.rootNode, position);
		if (!node) {
			return null;
		}

		const symbol = this.extractSymbol(node) || this.findSymbolForNode(tree, node);
		if (!symbol) {
			return null;
		}

		const contents = this.formatSymbolInfo(symbol);
		return {
			contents,
			range: symbol.selectionRange,
		};
	}

	/**
	 * Extrai informação de símbolo de um nó
	 */
	private extractSymbol(node: Parser.SyntaxNode): Symbol | null {
		const type = node.type;

		// Function declaration
		if (type === NodeType.Function) {
			const nodeName = TreeSitterUtils.getFunctionImplementationName(node);
			if (nodeName) {
				return {
					name: nodeName,
					kind: SymbolKind.Function,
					range: TreeSitterUtils.getNodeRange(node),
					selectionRange: TreeSitterUtils.getNodeRange(node),
					detail: '', // this.getFunctionSignature(node),
					node,
				};
			}
		}

		// Variable declaration
		if (type === 'variable_declaration' || type === 'variable_definition') {
			const nameNode = node.childForFieldName('name') || this.findIdentifierInNode(node);
			if (nameNode) {
				const typeNode = node.childForFieldName('type');
				return {
					name: TreeSitterUtils.getNodeText(nameNode),
					kind: SymbolKind.Variable,
					range: TreeSitterUtils.getNodeRange(node),
					selectionRange: TreeSitterUtils.getNodeRange(nameNode),
					detail: typeNode ? TreeSitterUtils.getNodeText(typeNode) : undefined,
					node,
				};
			}
		}

		// Type/Object declaration
		if (
			type === 'type_declaration' ||
			type === 'object_declaration' ||
			type === 'class_declaration'
		) {
			const nameNode = node.childForFieldName('name') || this.findIdentifierInNode(node);
			if (nameNode) {
				return {
					name: TreeSitterUtils.getNodeText(nameNode),
					kind: SymbolKind.Class,
					range: TreeSitterUtils.getNodeRange(node),
					selectionRange: TreeSitterUtils.getNodeRange(nameNode),
					node,
				};
			}
		}

		// Event declaration
		if (type === 'event_declaration') {
			const nameNode = node.childForFieldName('name') || this.findIdentifierInNode(node);
			if (nameNode) {
				return {
					name: TreeSitterUtils.getNodeText(nameNode),
					kind: SymbolKind.Event,
					range: TreeSitterUtils.getNodeRange(node),
					selectionRange: TreeSitterUtils.getNodeRange(nameNode),
					node,
				};
			}
		}

		return null;
	}

	/**
	 * Encontra todos os símbolos na árvore (incluindo nested)
	 */
	private getAllSymbols(tree: Parser.Tree): Symbol[] {
		const symbols: Symbol[] = [];

		const visit = (node: Parser.SyntaxNode) => {
			const symbol = this.extractSymbol(node);
			if (symbol) {
				symbols.push(symbol);
			}
			for (const child of node.namedChildren) {
				visit(child);
			}
		};

		visit(tree.rootNode);
		return symbols;
	}

	/**
	 * Encontra o nó mais específico na posição
	 */
	private findNodeAtPosition(
		node: Parser.SyntaxNode,
		position: Position,
	): Parser.SyntaxNode | null {
		const point: Parser.Point = { row: position.line, column: position.character };

		// Usa o método nativo do Tree-sitter
		const descendant = node.namedDescendantForPosition(point);

		// Procura por um identificador
		if (descendant && (descendant.type === 'identifier' || descendant.type === 'name')) {
			return descendant;
		}

		return descendant;
	}

	/**
	 * Encontra o símbolo que corresponde a um nó
	 */
	private findSymbolForNode(tree: Parser.Tree, node: Parser.SyntaxNode): Symbol | null {
		let current: Parser.SyntaxNode | null = node;

		// Sobe na árvore procurando por um nó que pode ser símbolo
		while (current) {
			const symbol = this.extractSymbol(current);
			if (symbol) {
				return symbol;
			}
			current = current.parent;
		}

		return null;
	}

	/**
	 * Procura por um identificador dentro de um nó
	 */
	private findIdentifierInNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
		for (const child of node.namedChildren) {
			if (child.type === 'identifier' || child.type === 'name') {
				return child;
			}
		}
		return null;
	}

	/**
	 * Formata informações do símbolo para exibição
	 */
	private formatSymbolInfo(symbol: Symbol): string {
		const lines: string[] = [];

		lines.push('```powerbuilder');
		if (symbol.detail) {
			lines.push(symbol.detail);
		} else {
			const kindName = this.getSymbolKindName(symbol.kind);
			lines.push(`${kindName} ${symbol.name}`);
		}
		lines.push('```');

		return lines.join('\n');
	}

	/**
	 * Obtém o nome do tipo de símbolo
	 */
	private getSymbolKindName(kind: SymbolKind): string {
		switch (kind) {
			case SymbolKind.Function:
				return 'function';
			case SymbolKind.Variable:
				return 'variable';
			case SymbolKind.Class:
				return 'type';
			case SymbolKind.Event:
				return 'event';
			default:
				return 'symbol';
		}
	}
}

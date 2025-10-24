import PowerBuilder from '@pb-shrugged/tree-sitter-powerbuilder';
import Parser, { Query, QueryMatch, SyntaxNode, Tree } from 'tree-sitter';
import { Position } from 'vscode-languageserver-types';

import { DocumentMainNodeTypes, EventMatch, FunctionMatch } from './tree-sitter-types';

/**
 * Converte LSP Position para Tree-sitter Point
 */
export function positionToPoint(position: Position): Parser.Point {
	return {
		row: position.line,
		column: position.character,
	};
}

/**
 * Converte Tree-sitter Point para LSP Position
 */
export function pointToPosition(point: Parser.Point): Position {
	return Position.create(point.row, point.column);
}

/**
 * Obtém o texto de um nó
 */
export function getNodeText(node: Parser.SyntaxNode): string {
	return node.text;
}

/**
 * Encontra o nó filho nomeado na posição especificada
 */
export function findNodeAtPosition(
	tree: Parser.Tree,
	position: Position,
): Parser.SyntaxNode | null {
	const point = positionToPoint(position);
	return tree.rootNode.namedDescendantForPosition(point);
}

/**
 * Verifica se um nó contém erros
 */
export function hasError(node: Parser.SyntaxNode): boolean {
	if (node.type === 'ERROR') {
		return true;
	}
	for (const child of node.children) {
		if (hasError(child)) {
			return true;
		}
	}
	return false;
}

/**
 * Coleta todos os nós do tipo ERROR na árvore
 */
export function collectErrors(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
	const errors: Parser.SyntaxNode[] = [];

	function visit(n: Parser.SyntaxNode) {
		if (n.type === 'ERROR') {
			errors.push(n);
		}
		for (const child of n.children) {
			visit(child);
		}
	}

	visit(node);
	return errors;
}

/**
 * Obtém o range de um nó em formato LSP
 */
export function getNodeRange(node: Parser.SyntaxNode): {
	start: Position;
	end: Position;
} {
	return {
		start: pointToPosition(node.startPosition),
		end: pointToPosition(node.endPosition),
	};
}

/**
 * Verifica se uma posição está dentro do range de um nó
 */
export function isPositionInNode(position: Position, node: Parser.SyntaxNode): boolean {
	const range = getNodeRange(node);
	if (position.line < range.start.line || position.line > range.end.line) {
		return false;
	}
	if (position.line === range.start.line && position.character < range.start.character) {
		return false;
	}
	if (position.line === range.end.line && position.character > range.end.character) {
		return false;
	}
	return true;
}

/**
 * Recursively iterate over all nodes in a tree.
 *
 * @param node The node to start iterating from
 * @param callback The callback to call for each node. Return false to stop following children.
 */
export function forEach(node: SyntaxNode, callback: (n: SyntaxNode) => void | boolean) {
	const followChildren = callback(node) !== false;
	if (followChildren && node.children.length) {
		node.children.forEach((n) => forEach(n, callback));
	}
}

export function query(node: SyntaxNode, queryExpression: string): QueryMatch[] {
	const query = new Query(PowerBuilder as Parser.Language, queryExpression);
	const matches = query.matches(node);
	return matches;
}

export function captureDocumentMainNodeTypes(tree: Tree): DocumentMainNodeTypes {
	const functionMatch = new FunctionMatch({
		index: 0,
	});
	const eventMatch = new EventMatch({
		index: 1,
	});

	const matches = query(
		tree.rootNode,
		`
		${functionMatch.expression}

		${eventMatch.expression}
		`,
	);

	functionMatch.queryMatch.push(
		...matches.filter((match) => match.pattern === functionMatch.index),
	);
	eventMatch.queryMatch.push(
		...matches.filter((match) => match.pattern === eventMatch.index),
	);

	return {
		functionMatch: functionMatch,
		eventMatch: eventMatch,
	};
}

export function getFunctionImplementationName(
	functionImplementationNode: SyntaxNode,
): string | undefined {
	const queryMatchs = query(
		functionImplementationNode,
		`
		(function_implementation
			init: (function_declaration
    		name: (identifier) @name))
		`,
	);

	if (queryMatchs.length === 1) {
		const name = queryMatchs.at(0)?.captures.at(0)?.node.text;
		return name;
	}

	return undefined;
}

import Parser from 'tree-sitter';
import { Position } from 'vscode-languageserver-types';

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

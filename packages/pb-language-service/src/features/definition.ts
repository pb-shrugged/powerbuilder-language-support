import Parser from 'tree-sitter';
import { Location, Position } from 'vscode-languageserver-types';

import { WorkspaceIndex } from '../index/workspace-index';
import { SymbolProvider } from '../symbols/symbol-provider';
import { getNodeText } from '../utils/ast';

/**
 * Encontra a definição de um símbolo
 * Implementa busca em duas fases:
 * 1. Busca local no arquivo atual (rápida)
 * 2. Busca no workspace (cross-file)
 */
export function findDefinition(
        uri: string,
        tree: Parser.Tree,
        position: Position,
        symbolProvider: SymbolProvider,
        workspaceIndex?: WorkspaceIndex,
): Location | null {
        // Phase 1: Local search (same file)
        // This is fast and handles most cases
        const localSymbol = symbolProvider.findDefinitionAtPosition(tree, position);

        if (localSymbol) {
                return {
                        uri,
                        range: localSymbol.selectionRange,
                };
        }

        // Phase 2: Workspace search (cross-file)
        // Only if local search failed and workspace index is available
        if (!workspaceIndex) {
                return null;
        }

        // Get the identifier at the cursor position
        const identifierNode = findIdentifierAtPosition(tree.rootNode, position);
        if (!identifierNode) {
                return null;
        }

        const identifierText = getNodeText(identifierNode);
        if (!identifierText) {
                return null;
        }

        // Search for symbols with this name in other files
        const workspaceSymbols = workspaceIndex.findSymbolsExcludingDocument(identifierText, uri);

        if (workspaceSymbols.length === 0) {
                return null;
        }

        // Return the first match
        // In the future, we could implement smarter resolution:
        // - Prefer symbols with matching kind
        // - Consider scope and imports
        // - Handle qualified names (object.method)
        const firstMatch = workspaceSymbols[0];

        return {
                uri: firstMatch.uri,
                range: firstMatch.selectionRange,
        };
}

/**
 * Find the identifier node at a specific position
 */
function findIdentifierAtPosition(
        node: Parser.SyntaxNode,
        position: Position,
): Parser.SyntaxNode | null {
        const point: Parser.Point = { row: position.line, column: position.character };

        // Use Tree-sitter's built-in method to find the node at position
        const descendant = node.namedDescendantForPosition(point);

        // Look for an identifier or name node
        if (descendant && (descendant.type === 'identifier' || descendant.type === 'name')) {
                return descendant;
        }

        // If we found another type of node, check if it has an identifier child
        if (descendant) {
                for (const child of descendant.namedChildren) {
                        if (child.type === 'identifier' || child.type === 'name') {
                                // Check if this child contains the position
                                if (
                                        child.startPosition.row <= point.row &&
                                        child.endPosition.row >= point.row &&
                                        child.startPosition.column <= point.column &&
                                        child.endPosition.column >= point.column
                                ) {
                                        return child;
                                }
                        }
                }
        }

        return descendant;
}

import PowerBuilder from '@pb-shrugged/tree-sitter-powerbuilder';
import { logger } from '@powerbuilder-language-support/logger';
import Parser, { Query } from 'tree-sitter';
import { Position } from 'vscode-languageserver-types';

import {
	PBClassFileNode,
	PBDatawindowFileNode,
	PBFunctionFileNode,
	PBSourceFileNode,
	PBStructureFileNode,
} from './node/pb-source-file';
import { NodeType } from './node/tree-sitter-node';

export class TreeSitterParser {
	private parser: Parser;

	constructor() {
		this.parser = new Parser();
		this.parser.setLanguage(PowerBuilder as unknown as Parser.Language); // TODO: Verify this problem with the types, maybe is the tree-sitter-cli@0.25.0\
	}

	public parse(
		input: string | Parser.Input,
		oldTree?: Parser.Tree | null,
		options?: Parser.Options,
	): Parser.Tree {
		return this.parser.parse(input, oldTree, options);
	}

	public getSourceFile(tree: Parser.Tree): PBSourceFileNode | undefined {
		const fileNode = tree.rootNode.firstChild;

		if (!fileNode) {
			return undefined;
		}

		switch (fileNode.type) {
			case NodeType.ClassFile:
				return new PBClassFileNode({ tree });

			case NodeType.FunctionFile:
				return new PBFunctionFileNode({ tree });

			case NodeType.StructureFile:
				return new PBStructureFileNode({ tree });

			case NodeType.DatawindowFile:
				return new PBDatawindowFileNode({ tree });
		}

		return undefined;
	}

	getNodeRange(node: Parser.SyntaxNode): {
		start: Position;
		end: Position;
	} {
		return {
			start: this.pointToPosition(node.startPosition),
			end: this.pointToPosition(node.endPosition),
		};
	}

	private pointToPosition(point: Parser.Point): Position {
		return Position.create(point.row, point.column);
	}
}

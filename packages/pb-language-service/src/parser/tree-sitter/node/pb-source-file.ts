import Parser from 'tree-sitter';

import { Symbol } from '../../../symbols/symbol-provider';
import { TreeSitterParser } from '../tree-sitter-parser';
import {
	PBClassNode,
	PBClassPropertyNode,
	PBEventNode,
	PBExternalFunctionNode,
	PBFunctionNode,
	PBGlobalStructureNode,
	PBGlobalVariableNode,
	PBInnerClassObjectNode,
	PBInnerStructureNode,
	PBInstanceVariableNode,
	PBLocalVariableNode,
	PBSharedVariableNode,
	PBSubroutineNode,
	PBSymbolNode,
} from './pb-node-symbol';

export abstract class PBSourceFileNode {
	protected tree: Parser.Tree;
	protected symbolNodes: PBSymbolNode[] = [];

	constructor({ tree }: { tree: Parser.Tree }) {
		this.tree = tree;
	}

	public getSymbols(parser: TreeSitterParser): Symbol[] {
		const symbols = new Array<Symbol>();

		this.symbolNodes.forEach((symbolNode) =>
			symbols.push(...symbolNode.getSymbols(this.tree, parser)),
		);

		return symbols;
	}
}

export class PBClassFileNode extends PBSourceFileNode {
	constructor({ tree }: { tree: Parser.Tree }) {
		super({ tree });
		this.symbolNodes.push(
			...[
				new PBFunctionNode(),
				new PBSubroutineNode(),
				new PBEventNode(),
				new PBExternalFunctionNode(),
				new PBInstanceVariableNode(),
				new PBSharedVariableNode(),
				new PBInnerClassObjectNode(),
				new PBClassPropertyNode(),
				new PBGlobalVariableNode(),
				new PBClassNode(),
				new PBInnerStructureNode(),
				new PBLocalVariableNode(),
			],
		);
	}
}

export class PBStructureFileNode extends PBSourceFileNode {
	constructor({ tree }: { tree: Parser.Tree }) {
		super({ tree });
		this.symbolNodes.push(...[new PBGlobalStructureNode()]);
	}
}

export class PBFunctionFileNode extends PBSourceFileNode {}

export class PBDatawindowFileNode extends PBSourceFileNode {}

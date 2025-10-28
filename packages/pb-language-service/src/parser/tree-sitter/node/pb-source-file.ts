import Parser from 'tree-sitter';

import { Symbol } from '../../../symbols/symbol-provider';
import { TreeSitterParser } from '../tree-sitter-parser';
import {
	PBClassNode,
	PBClassPropertyNode,
	PBEventNode,
	PBExternalFunctionNode,
	PBFunctionNode,
	PBFunctionParameterVariableNode,
	PBGlobalFunctionNode,
	PBGlobalStructureNode,
	PBGlobalSubroutineNode,
	PBGlobalVariableNode,
	PBInnerClassObjectNode,
	PBInnerStructureNode,
	PBInstanceVariableNode,
	PBLocalVariableNode,
	PBSharedVariableNode,
	PBStructureFieldNode,
	PBSubroutineNode,
	PBSymbolNode,
} from './pb-node-symbol';

export abstract class PBSourceFileNode {
	protected tree: Parser.Tree;
	protected symbolNodes: PBSymbolNode[] = [];

	constructor({ tree }: { tree: Parser.Tree }) {
		this.tree = tree;
	}

	public getSymbols(parser: TreeSitterParser): {
		documentSymbols: Symbol[];
		topLevelSymbols: Symbol[];
	} {
		const fileDocumentSymbols = new Array<Symbol>();
		const fileTopLevelSymbols = new Array<Symbol>();

		this.symbolNodes.forEach((symbolNode) => {
			const { documentSymbols, topLevelSymbols } = symbolNode.getSymbols(
				this.tree.rootNode,
				parser,
			);
			fileDocumentSymbols.push(...documentSymbols);
			fileTopLevelSymbols.push(...topLevelSymbols);
		});

		return { documentSymbols: fileDocumentSymbols, topLevelSymbols: fileTopLevelSymbols };
	}
}

export class PBClassFileNode extends PBSourceFileNode {
	constructor({ tree }: { tree: Parser.Tree }) {
		super({ tree });
		this.symbolNodes.push(
			...[
				new PBGlobalVariableNode(),
				new PBClassNode(),

				// new PBInnerStructureNode(),
				// new PBStructureFieldNode(),

				// new PBClassPropertyNode(),
				// new PBInnerClassObjectNode(),
				// new PBInstanceVariableNode(),
				// new PBSharedVariableNode(),

				// new PBExternalFunctionNode(),
				// new PBFunctionNode(),
				// new PBSubroutineNode(),
				// new PBEventNode(),

				// new PBLocalVariableNode(),
				// new PBFunctionParameterVariableNode(),
			],
		);
	}
}

export class PBStructureFileNode extends PBSourceFileNode {
	constructor({ tree }: { tree: Parser.Tree }) {
		super({ tree });
		this.symbolNodes.push(
			...[
				new PBGlobalStructureNode(),
				// new PBStructureFieldNode()
			],
		);
	}
}

export class PBFunctionFileNode extends PBSourceFileNode {
	constructor({ tree }: { tree: Parser.Tree }) {
		super({ tree });
		this.symbolNodes.push(
			...[
				new PBGlobalFunctionNode(),
				new PBGlobalSubroutineNode(),
				// new PBLocalVariableNode(),
				// new PBFunctionParameterVariableNode(),
			],
		);
	}
}

export class PBDatawindowFileNode extends PBSourceFileNode {}

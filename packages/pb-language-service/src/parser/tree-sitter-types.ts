import { QueryMatch } from 'tree-sitter';

export const NodeType = {
	Function: 'function_implementation',
};

export interface DocumentMainNodeTypes {
	functionMatch: FunctionMatch;
	eventMatch: EventMatch;
}

interface CaptureInfo {
	text: string;
	index: number;
}

export abstract class CustomMatch {
	index: number;
	expression: string;
	queryMatch: QueryMatch[];

	constructor({ index }: { index: number }) {
		this.expression = '';
		this.queryMatch = new Array<QueryMatch>();
		this.index = index;
	}
}

export class FunctionMatch extends CustomMatch {
	nameCapture: CaptureInfo = {
		text: 'funtion_name',
		index: 2,
	};
	declarationCapture: CaptureInfo = {
		text: 'function_declaration',
		index: 1,
	};
	implementationCapture: CaptureInfo = {
		text: 'function_implementation',
		index: 0,
	};

	constructor({ index }: { index: number }) {
		super({ index });
		this.expression = `
		(function_implementation
				init: (function_declaration
						name: (identifier) @${this.nameCapture.text}) @${this.declarationCapture.text}) @${this.implementationCapture.text}
	`;
	}
}

export class EventMatch extends CustomMatch {
	nameCapture: CaptureInfo = {
		text: 'event_name',
		index: 2,
	};
	declarationCapture: CaptureInfo = {
		text: 'event_declaration',
		index: 1,
	};
	implementationCapture: CaptureInfo = {
		text: 'event_implementation',
		index: 0,
	};

	constructor({ index }: { index: number }) {
		super({ index });
		this.expression = `
			(event_implementation
				init: (event_implementation_init
						(identifier) @${this.nameCapture.text}) @${this.declarationCapture.text}) @${this.implementationCapture.text}
		`;
	}
}

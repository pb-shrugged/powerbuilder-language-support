import { QueryMatch } from 'tree-sitter';

export interface DocumentMainNodeTypes {
	functionQuery: FunctionQuery;
	eventQuery: EventQuery;
	subroutineQuery: SubroutineQuery;
}

interface CaptureInfo {
	text: string;
	index: number;
}

export abstract class CustomQuery {
	index: number;
	expression: string;
	queryMatch: QueryMatch[];

	constructor({ index }: { index: number }) {
		this.expression = '';
		this.queryMatch = new Array<QueryMatch>();
		this.index = index;
	}
}

export class FunctionQuery extends CustomQuery {
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

export class SubroutineQuery extends CustomQuery {
	nameCapture: CaptureInfo = {
		text: 'subroutine_name',
		index: 2,
	};
	declarationCapture: CaptureInfo = {
		text: 'subroutine_declaration',
		index: 1,
	};
	implementationCapture: CaptureInfo = {
		text: 'subroutine_implementation',
		index: 0,
	};

	constructor({ index }: { index: number }) {
		super({ index });
		this.expression = `
		(function_implementation
				init: (subroutine_declaration
						name: (identifier) @${this.nameCapture.text}) @${this.declarationCapture.text}) @${this.implementationCapture.text}
	`;
	}
}

export class EventQuery extends CustomQuery {
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

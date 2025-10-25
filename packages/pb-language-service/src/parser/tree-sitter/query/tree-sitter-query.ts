import PowerBuilder from '@pb-shrugged/tree-sitter-powerbuilder';
import { logger } from '@powerbuilder-language-support/logger';
import { Language, Query, QueryCapture, QueryMatch, SyntaxNode } from 'tree-sitter';

export class TreeSitterQuery {
	private query: Query;

	constructor({ queryExpression }: { queryExpression: string }) {
		this.query = new Query(PowerBuilder as unknown as Language, queryExpression);
	}

	public matches(node: SyntaxNode): PBQueryMatch[] {
		return this.query.matches(node).map((match) => new PBQueryMatch(match));
	}
}

export class PBQueryMatch implements QueryMatch {
	pattern: number;
	captures: QueryCapture[];

	constructor({ pattern, captures }: QueryMatch) {
		this.pattern = pattern;
		this.captures = captures;
	}

	public getNodeByCapture(targetCapture: PBQueryCapture): SyntaxNode | undefined {
		return this.captures.filter((capture) => capture.name === targetCapture.name)[0].node;
	}
}

export class PBQueryCapture {
	name: string;
	index: number;

	constructor({ name, index }: { name: string; index: number }) {
		this.name = name;
		this.index = index;
	}
}

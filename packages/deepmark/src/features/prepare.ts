import type { MdRoot, MdxJsxTextElement } from '$types';

import prettier from 'prettier';
import {
	get_mdast,
	is_mdast_flow_expression,
	is_mdast_jsx_flow_element,
	is_mdast_jsx_text_element,
	is_mdast_link,
	is_mdast_root,
	is_mdast_text
} from '$utils';
import { unwalk } from '../unwalk.js';

export function prepare(
	markdown: string,
	config: { convert: boolean } = { convert: true }
): MdRoot {
	const formatted = prettier.format(markdown, {
		parser: 'mdx',
		printWidth: Infinity,
		proseWrap: 'never'
	});

	const root = get_mdast(formatted);

	unwalk(
		root,
		(node, parent, index) => {
			if ('position' in node) {
				delete node.position;
			}

			if (is_mdast_flow_expression(node) && is_mdast_root(parent)) {
				if (is_mdast_empty_text_expression(node.value)) {
					(parent.children[index!] as unknown) = undefined;
				}
				return;
			}

			if (is_mdast_jsx_flow_element(node) || is_mdast_jsx_text_element(node)) {
				for (const attribute of node.attributes) {
					if (typeof attribute.value === 'string') {
						attribute.value = attribute.value.trim();
					}
				}
				return;
			}

			if (is_mdast_flow_expression(node) && is_mdast_jsx_flow_element(parent!)) {
				if (index === 0 && is_mdast_empty_text_expression(node.value)) {
					(parent.children[index] as unknown) = undefined;
				}
			}

			if (is_mdast_text(node)) {
				node.value = linebreaks_to_whitespaces(node.value);
				return;
			}

			if (!config.convert) return;

			if (is_mdast_link(node)) {
				(node as unknown as MdxJsxTextElement).type = 'mdxJsxTextElement';
				(node as unknown as MdxJsxTextElement).name = 'a';
				(node as unknown as MdxJsxTextElement).attributes = [
					{ type: 'mdxJsxAttribute', name: 'href', value: node.url }
				];

				delete node.title;
				delete (node as unknown as { url?: string }).url;
			}
		},
		true
	);

	return root;
}

function is_mdast_empty_text_expression(text: string): boolean {
	const regex = /^('|")\s*('|")$/;
	return regex.test(text);
}

function linebreaks_to_whitespaces(text: string): string {
	return text.replace(/^.(\n|\r\n).*$/, ' ');
}
import LinkifyIt from "linkify-it";
import * as mdurl from "mdurl";
import punycode from "punycode";

//#region src/rules/core/block.ts
/**
* Core rule: block
* Runs block-level parser on the input.
*/
function block(state) {
	if (state.inlineMode) {
		const token = {
			type: "inline",
			tag: "",
			content: state.src,
			map: [0, 1],
			children: [],
			level: 0
		};
		state.tokens.push(token);
	} else if (state.md && state.md.block) state.md.block.parse(state.src, state.md, state.env, state.tokens);
}

//#endregion
//#region src/rules/core/inline.ts
/**
* Core rule: inline
* Iterates through tokens and runs inline parser on 'inline' type tokens.
*/
function inline(state) {
	const tokens = state.tokens;
	for (let i = 0, l = tokens.length; i < l; i++) {
		const tok = tokens[i];
		if (tok.type === "inline" && state.md) {
			if (!tok.children) tok.children = [];
			state.md.inline.parse(tok.content, state.md, state.env, tok.children);
		}
	}
}

//#endregion
//#region src/rules/core/linkify.ts
const linkifyIt = LinkifyIt();
function makeLinkOpen(href, level = 0) {
	return {
		type: "link_open",
		tag: "a",
		attrs: [["href", href]],
		level
	};
}
function makeLinkClose(level = 0) {
	return {
		type: "link_close",
		tag: "a",
		level
	};
}
function linkify(state) {
	(state.tokens || []).forEach((tk) => {
		if (tk.type === "inline" && Array.isArray(tk.children)) {
			const newChildren = [];
			tk.children.forEach((child) => {
				if (child.type === "text" && typeof child.content === "string") {
					const text$1 = child.content;
					const matches = linkifyIt.match(text$1);
					if (!matches) {
						newChildren.push(child);
						return;
					}
					let lastIndex = 0;
					matches.forEach((m) => {
						const idx = m.index;
						if (idx > lastIndex) newChildren.push({
							type: "text",
							content: text$1.slice(lastIndex, idx),
							level: child.level
						});
						const url = m.url;
						newChildren.push(makeLinkOpen(url, child.level));
						newChildren.push({
							type: "text",
							content: text$1.slice(m.index, m.lastIndex),
							level: child.level + 1
						});
						newChildren.push(makeLinkClose(child.level));
						lastIndex = m.lastIndex;
					});
					if (lastIndex < text$1.length) newChildren.push({
						type: "text",
						content: text$1.slice(lastIndex),
						level: child.level
					});
				} else newChildren.push(child);
			});
			tk.children = newChildren;
		}
	});
}

//#endregion
//#region src/rules/core/normalize.ts
const NEWLINES_RE = /\r\n?|\n/g;
const NULL_RE = /\0/g;
function normalize(state) {
	if (!state || typeof state.src !== "string") return;
	let str = state.src.replace(NEWLINES_RE, "\n");
	str = str.replace(NULL_RE, "�");
	state.src = str;
}

//#endregion
//#region src/rules/core/replacements.ts
function replacements(state) {
	(state.tokens || []).forEach((tk) => {
		if (tk.type === "inline" && Array.isArray(tk.children)) tk.children.forEach((ch) => {
			if (ch.type === "text" && typeof ch.content === "string") ch.content = ch.content.replace(/\.\.\./g, "…").replace(/---/g, "—").replace(/--/g, "–");
		});
	});
}

//#endregion
//#region src/rules/core/ruler.ts
var CoreRuler = class {
	rules = [];
	push(name, fn) {
		this.rules.push({
			name,
			fn
		});
	}
	getRules(_chainName = "") {
		return this.rules.map((r) => r.fn);
	}
};

//#endregion
//#region src/rules/core/smartquotes.ts
function smartquotes(state) {
	(state.tokens || []).forEach((tk) => {
		if (tk.type === "inline" && Array.isArray(tk.children)) {
			let doubleOpen = true;
			let singleOpen = true;
			tk.children.forEach((ch) => {
				if (ch.type === "text" && typeof ch.content === "string") {
					let text$1 = ch.content;
					text$1 = text$1.replace(/"/g, () => {
						const r = doubleOpen ? "“" : "”";
						doubleOpen = !doubleOpen;
						return r;
					});
					text$1 = text$1.replace(/'/g, () => {
						const r = singleOpen ? "‘" : "’";
						singleOpen = !singleOpen;
						return r;
					});
					ch.content = text$1;
				}
			});
		}
	});
}

//#endregion
//#region src/rules/core/text_join.ts
function text_join(state) {
	(state.tokens || []).forEach((tk) => {
		if (tk.type === "inline" && Array.isArray(tk.children)) {
			const out = [];
			for (let i = 0; i < tk.children.length; i++) {
				const ch = tk.children[i];
				if (ch.type === "text") {
					let content = ch.content || "";
					while (i + 1 < tk.children.length && tk.children[i + 1].type === "text") {
						i++;
						content += tk.children[i].content || "";
					}
					out.push({
						type: "text",
						content,
						level: ch.level
					});
				} else out.push(ch);
			}
			tk.children = out;
		}
	});
}

//#endregion
//#region src/parse/link_utils.ts
const BAD_PROTO_RE = /^(?:vbscript|javascript|file|data):/;
const GOOD_DATA_RE = /^data:image\/(?:gif|png|jpeg|webp);/;
const RECODE_HOSTNAME_FOR = [
	"http:",
	"https:",
	"mailto:"
];
/**
* Validate URL to prevent XSS attacks.
* This validator can prohibit more than really needed to prevent XSS.
* It's a tradeoff to keep code simple and to be secure by default.
*/
function validateLink(url) {
	const str = url.trim().toLowerCase();
	return BAD_PROTO_RE.test(str) ? GOOD_DATA_RE.test(str) : true;
}
/**
* Normalize link URL by encoding hostname to ASCII (punycode)
*/
function normalizeLink(url) {
	const parsed = mdurl.parse(url, true);
	if (parsed.hostname) {
		if (!parsed.protocol || RECODE_HOSTNAME_FOR.includes(parsed.protocol)) try {
			parsed.hostname = punycode.toASCII(parsed.hostname);
		} catch {}
	}
	return mdurl.encode(mdurl.format(parsed));
}
/**
* Normalize link text by decoding hostname from punycode to Unicode
*/
function normalizeLinkText(url) {
	const parsed = mdurl.parse(url, true);
	if (parsed.hostname) {
		if (!parsed.protocol || RECODE_HOSTNAME_FOR.includes(parsed.protocol)) try {
			parsed.hostname = punycode.toUnicode(parsed.hostname);
		} catch {}
	}
	return mdurl.decode(mdurl.format(parsed), `${mdurl.decode.defaultChars}%`);
}

//#endregion
//#region src/rules/block/blockquote.ts
function isSpace$6(code$1) {
	switch (code$1) {
		case 9:
		case 32: return true;
	}
	return false;
}
function blockquote(state, startLine, endLine, silent) {
	let pos = state.bMarks[startLine] + state.tShift[startLine];
	let max = state.eMarks[startLine];
	const oldLineMax = state.lineMax;
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	if (state.src.charCodeAt(pos) !== 62) return false;
	if (silent) return true;
	const oldBMarks = [];
	const oldBSCount = [];
	const oldSCount = [];
	const oldTShift = [];
	const terminatorRules = state.md.block.ruler.getRules("blockquote");
	const oldParentType = state.parentType;
	state.parentType = "blockquote";
	let lastLineEmpty = false;
	let nextLine;
	for (nextLine = startLine; nextLine < endLine; nextLine++) {
		const isOutdented = state.sCount[nextLine] < state.blkIndent;
		pos = state.bMarks[nextLine] + state.tShift[nextLine];
		max = state.eMarks[nextLine];
		if (pos >= max) break;
		if (state.src.charCodeAt(pos++) === 62 && !isOutdented) {
			let initial = state.sCount[nextLine] + 1;
			let spaceAfterMarker;
			let adjustTab;
			if (state.src.charCodeAt(pos) === 32) {
				pos++;
				initial++;
				adjustTab = false;
				spaceAfterMarker = true;
			} else if (state.src.charCodeAt(pos) === 9) {
				spaceAfterMarker = true;
				if ((state.bsCount[nextLine] + initial) % 4 === 3) {
					pos++;
					initial++;
					adjustTab = false;
				} else adjustTab = true;
			} else spaceAfterMarker = false;
			let offset = initial;
			oldBMarks.push(state.bMarks[nextLine]);
			state.bMarks[nextLine] = pos;
			while (pos < max) {
				const ch = state.src.charCodeAt(pos);
				if (isSpace$6(ch)) if (ch === 9) offset += 4 - (offset + state.bsCount[nextLine] + (adjustTab ? 1 : 0)) % 4;
				else offset++;
				else break;
				pos++;
			}
			lastLineEmpty = pos >= max;
			oldBSCount.push(state.bsCount[nextLine]);
			state.bsCount[nextLine] = state.sCount[nextLine] + 1 + (spaceAfterMarker ? 1 : 0);
			oldSCount.push(state.sCount[nextLine]);
			state.sCount[nextLine] = offset - initial;
			oldTShift.push(state.tShift[nextLine]);
			state.tShift[nextLine] = pos - state.bMarks[nextLine];
			continue;
		}
		if (lastLineEmpty) break;
		let terminate = false;
		for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, true)) {
			terminate = true;
			break;
		}
		if (terminate) {
			state.lineMax = nextLine;
			if (state.blkIndent !== 0) {
				oldBMarks.push(state.bMarks[nextLine]);
				oldBSCount.push(state.bsCount[nextLine]);
				oldTShift.push(state.tShift[nextLine]);
				oldSCount.push(state.sCount[nextLine]);
				state.sCount[nextLine] -= state.blkIndent;
			}
			break;
		}
		oldBMarks.push(state.bMarks[nextLine]);
		oldBSCount.push(state.bsCount[nextLine]);
		oldTShift.push(state.tShift[nextLine]);
		oldSCount.push(state.sCount[nextLine]);
		state.sCount[nextLine] = -1;
	}
	const oldIndent = state.blkIndent;
	state.blkIndent = 0;
	const token_o = state.push("blockquote_open", "blockquote", 1);
	token_o.markup = ">";
	const lines = [startLine, 0];
	token_o.map = lines;
	state.md.block.tokenize(state, startLine, nextLine);
	const token_c = state.push("blockquote_close", "blockquote", -1);
	token_c.markup = ">";
	state.lineMax = oldLineMax;
	state.parentType = oldParentType;
	lines[1] = state.line;
	for (let i = 0; i < oldTShift.length; i++) {
		state.bMarks[i + startLine] = oldBMarks[i];
		state.tShift[i + startLine] = oldTShift[i];
		state.sCount[i + startLine] = oldSCount[i];
		state.bsCount[i + startLine] = oldBSCount[i];
	}
	state.blkIndent = oldIndent;
	return true;
}

//#endregion
//#region src/rules/block/code.ts
function code(state, startLine, endLine) {
	if (state.sCount[startLine] - state.blkIndent < 4) return false;
	let nextLine = startLine + 1;
	let last = nextLine;
	while (nextLine < endLine) {
		if (state.isEmpty(nextLine)) {
			nextLine++;
			continue;
		}
		if (state.sCount[nextLine] - state.blkIndent >= 4) {
			nextLine++;
			last = nextLine;
			continue;
		}
		break;
	}
	state.line = last;
	const token = state.push("code_block", "code", 0);
	token.content = `${state.getLines(startLine, last, 4 + state.blkIndent, false)}\n`;
	token.map = [startLine, state.line];
	return true;
}

//#endregion
//#region src/rules/block/fence.ts
function fence(state, startLine, endLine, silent) {
	let pos = state.bMarks[startLine] + state.tShift[startLine];
	let max = state.eMarks[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	if (pos + 3 > max) return false;
	const marker = state.src.charCodeAt(pos);
	if (marker !== 126 && marker !== 96) return false;
	let mem = pos;
	pos = state.skipChars(pos, marker);
	let len = pos - mem;
	if (len < 3) return false;
	const markup = state.src.slice(mem, pos);
	const params = state.src.slice(pos, max);
	if (marker === 96) {
		if (params.includes(String.fromCharCode(marker))) return false;
	}
	if (silent) return true;
	let nextLine = startLine;
	let haveEndMarker = false;
	for (;;) {
		nextLine++;
		if (nextLine >= endLine) break;
		pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
		max = state.eMarks[nextLine];
		if (pos < max && state.sCount[nextLine] < state.blkIndent) break;
		if (state.src.charCodeAt(pos) !== marker) continue;
		if (state.sCount[nextLine] - state.blkIndent >= 4) continue;
		pos = state.skipChars(pos, marker);
		if (pos - mem < len) continue;
		pos = state.skipSpaces(pos);
		if (pos < max) continue;
		haveEndMarker = true;
		break;
	}
	len = state.sCount[startLine];
	state.line = nextLine + (haveEndMarker ? 1 : 0);
	const token = state.push("fence", "code", 0);
	token.info = params;
	token.content = state.getLines(startLine + 1, nextLine, len, true);
	token.markup = markup;
	token.map = [startLine, state.line];
	return true;
}

//#endregion
//#region src/rules/block/heading.ts
function isSpace$5(code$1) {
	switch (code$1) {
		case 9:
		case 32: return true;
	}
	return false;
}
function heading(state, startLine, endLine, silent) {
	let pos = state.bMarks[startLine] + state.tShift[startLine];
	let max = state.eMarks[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	let ch = state.src.charCodeAt(pos);
	if (ch !== 35 || pos >= max) return false;
	let level = 1;
	ch = state.src.charCodeAt(++pos);
	while (ch === 35 && pos < max && level <= 6) {
		level++;
		ch = state.src.charCodeAt(++pos);
	}
	if (level > 6 || pos < max && !isSpace$5(ch)) return false;
	if (silent) return true;
	max = state.skipSpacesBack(max, pos);
	const tmp = state.skipCharsBack(max, 35, pos);
	if (tmp > pos && isSpace$5(state.src.charCodeAt(tmp - 1))) max = tmp;
	state.line = startLine + 1;
	const token_o = state.push("heading_open", `h${String(level)}`, 1);
	token_o.markup = "########".slice(0, level);
	token_o.map = [startLine, state.line];
	const token_i = state.push("inline", "", 0);
	token_i.content = state.src.slice(pos, max).trim();
	token_i.map = [startLine, state.line];
	token_i.children = [];
	const token_c = state.push("heading_close", `h${String(level)}`, -1);
	token_c.markup = "########".slice(0, level);
	return true;
}

//#endregion
//#region src/rules/block/hr.ts
function isSpace$4(code$1) {
	switch (code$1) {
		case 9:
		case 32: return true;
	}
	return false;
}
function hr(state, startLine, endLine, silent) {
	const max = state.eMarks[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	let pos = state.bMarks[startLine] + state.tShift[startLine];
	const marker = state.src.charCodeAt(pos++);
	if (marker !== 42 && marker !== 45 && marker !== 95) return false;
	let cnt = 1;
	while (pos < max) {
		const ch = state.src.charCodeAt(pos++);
		if (ch !== marker && !isSpace$4(ch)) return false;
		if (ch === marker) cnt++;
	}
	if (cnt < 3) return false;
	if (silent) return true;
	state.line = startLine + 1;
	const token = state.push("hr", "hr", 0);
	token.map = [startLine, state.line];
	token.markup = new Array(cnt + 1).join(String.fromCharCode(marker));
	return true;
}

//#endregion
//#region src/common/html_blocks.ts
/**
* List of valid html blocks names, according to commonmark spec
* https://spec.commonmark.org/0.30/#html-blocks
*/
const HTML_BLOCKS = [
	"address",
	"article",
	"aside",
	"base",
	"basefont",
	"blockquote",
	"body",
	"caption",
	"center",
	"col",
	"colgroup",
	"dd",
	"details",
	"dialog",
	"dir",
	"div",
	"dl",
	"dt",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"frame",
	"frameset",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"head",
	"header",
	"hr",
	"html",
	"iframe",
	"legend",
	"li",
	"link",
	"main",
	"menu",
	"menuitem",
	"nav",
	"noframes",
	"ol",
	"optgroup",
	"option",
	"p",
	"param",
	"search",
	"section",
	"summary",
	"table",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"title",
	"tr",
	"track",
	"ul"
];
var html_blocks_default = HTML_BLOCKS;

//#endregion
//#region src/common/html_re.ts
const open_tag = `<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^"'=<>\`\\x00-\\x20]+|'[^']*'|"[^"]*"))?)*\\s*\\/?>`;
const close_tag = "<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>";
const HTML_TAG_RE$1 = /* @__PURE__ */ new RegExp(`^(?:${open_tag}|${close_tag}|<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->|<\\?[\\s\\S]*?\\?>|<![A-Za-z][^>]*>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)`);
const HTML_OPEN_CLOSE_TAG_RE = /* @__PURE__ */ new RegExp(`^(?:${open_tag}|${close_tag})`);

//#endregion
//#region src/rules/block/html_block.ts
const HTML_SEQUENCES = [
	[
		/^<(script|pre|style|textarea)(?=(\s|>|$))/i,
		/<\/(script|pre|style|textarea)>/i,
		true
	],
	[
		/^<!--/,
		/-->/,
		true
	],
	[
		/^<\?/,
		/\?>/,
		true
	],
	[
		/^<![A-Z]/,
		/>/,
		true
	],
	[
		/^<!\[CDATA\[/,
		/\]\]>/,
		true
	],
	[
		new RegExp(`^</?(${html_blocks_default.join("|")})(?=(\\s|/?>|$))`, "i"),
		/^$/,
		true
	],
	[
		/* @__PURE__ */ new RegExp(`${HTML_OPEN_CLOSE_TAG_RE.source}\\s*$`),
		/^$/,
		false
	]
];
function html_block(state, startLine, endLine, silent) {
	let pos = state.bMarks[startLine] + state.tShift[startLine];
	let max = state.eMarks[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	if (!state.md.options.html) return false;
	if (state.src.charCodeAt(pos) !== 60) return false;
	let lineText = state.src.slice(pos, max);
	let i = 0;
	for (; i < HTML_SEQUENCES.length; i++) if (HTML_SEQUENCES[i][0].test(lineText)) break;
	if (i === HTML_SEQUENCES.length) return false;
	if (silent) return HTML_SEQUENCES[i][2];
	let nextLine = startLine + 1;
	if (!HTML_SEQUENCES[i][1].test(lineText)) for (; nextLine < endLine; nextLine++) {
		if (state.sCount[nextLine] < state.blkIndent) break;
		pos = state.bMarks[nextLine] + state.tShift[nextLine];
		max = state.eMarks[nextLine];
		lineText = state.src.slice(pos, max);
		if (HTML_SEQUENCES[i][1].test(lineText)) {
			if (lineText.length !== 0) nextLine++;
			break;
		}
	}
	state.line = nextLine;
	const token = state.push("html_block", "", 0);
	token.map = [startLine, nextLine];
	token.content = state.getLines(startLine, nextLine, state.blkIndent, true);
	return true;
}

//#endregion
//#region src/rules/block/lheading.ts
function lheading(state, startLine, endLine) {
	const terminatorRules = state.md.block.ruler.getRules("paragraph");
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	const oldParentType = state.parentType;
	state.parentType = "paragraph";
	let level = 0;
	let marker;
	let nextLine = startLine + 1;
	for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
		if (state.sCount[nextLine] - state.blkIndent > 3) continue;
		if (state.sCount[nextLine] >= state.blkIndent) {
			let pos = state.bMarks[nextLine] + state.tShift[nextLine];
			const max = state.eMarks[nextLine];
			if (pos < max) {
				marker = state.src.charCodeAt(pos);
				if (marker === 45 || marker === 61) {
					pos = state.skipChars(pos, marker);
					pos = state.skipSpaces(pos);
					if (pos >= max) {
						level = marker === 61 ? 1 : 2;
						break;
					}
				}
			}
		}
		if (state.sCount[nextLine] < 0) continue;
		let terminate = false;
		for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, true)) {
			terminate = true;
			break;
		}
		if (terminate) break;
	}
	if (!level) return false;
	const content = state.getLines(startLine, nextLine, state.blkIndent, false).trim();
	state.line = nextLine + 1;
	const token_o = state.push("heading_open", `h${String(level)}`, 1);
	token_o.markup = String.fromCharCode(marker);
	token_o.map = [startLine, state.line];
	const token_i = state.push("inline", "", 0);
	token_i.content = content;
	token_i.map = [startLine, state.line - 1];
	token_i.children = [];
	const token_c = state.push("heading_close", `h${String(level)}`, -1);
	token_c.markup = String.fromCharCode(marker);
	state.parentType = oldParentType;
	return true;
}

//#endregion
//#region src/rules/block/list.ts
function isSpace$3(code$1) {
	switch (code$1) {
		case 9:
		case 32: return true;
	}
	return false;
}
function skipBulletListMarker(state, startLine) {
	const max = state.eMarks[startLine];
	let pos = state.bMarks[startLine] + state.tShift[startLine];
	const marker = state.src.charCodeAt(pos++);
	if (marker !== 42 && marker !== 45 && marker !== 43) return -1;
	if (pos < max) {
		if (!isSpace$3(state.src.charCodeAt(pos))) return -1;
	}
	return pos;
}
function skipOrderedListMarker(state, startLine) {
	const start = state.bMarks[startLine] + state.tShift[startLine];
	const max = state.eMarks[startLine];
	let pos = start;
	if (pos + 1 >= max) return -1;
	let ch = state.src.charCodeAt(pos++);
	if (ch < 48 || ch > 57) return -1;
	for (;;) {
		if (pos >= max) return -1;
		ch = state.src.charCodeAt(pos++);
		if (ch >= 48 && ch <= 57) {
			if (pos - start >= 10) return -1;
			continue;
		}
		if (ch === 41 || ch === 46) break;
		return -1;
	}
	if (pos < max) {
		ch = state.src.charCodeAt(pos);
		if (!isSpace$3(ch)) return -1;
	}
	return pos;
}
function markTightParagraphs(state, idx) {
	const level = state.level + 2;
	for (let i = idx + 2, l = state.tokens.length - 2; i < l; i++) if (state.tokens[i].level === level && state.tokens[i].type === "paragraph_open") {
		state.tokens[i + 2].hidden = true;
		state.tokens[i].hidden = true;
		i += 2;
	}
}
function list(state, startLine, endLine, silent) {
	let max;
	let pos;
	let start = 0;
	let nextLine = startLine;
	let tight = true;
	if (state.sCount[nextLine] - state.blkIndent >= 4) return false;
	if (state.listIndent >= 0 && state.sCount[nextLine] - state.listIndent >= 4 && state.sCount[nextLine] < state.blkIndent) return false;
	let isTerminatingParagraph = false;
	if (silent && state.parentType === "paragraph") {
		if (state.sCount[nextLine] >= state.blkIndent) isTerminatingParagraph = true;
	}
	let isOrdered;
	let markerValue;
	let posAfterMarker;
	if ((posAfterMarker = skipOrderedListMarker(state, nextLine)) >= 0) {
		isOrdered = true;
		start = state.bMarks[nextLine] + state.tShift[nextLine];
		markerValue = Number(state.src.slice(start, posAfterMarker - 1));
		if (isTerminatingParagraph && markerValue !== 1) return false;
	} else if ((posAfterMarker = skipBulletListMarker(state, nextLine)) >= 0) isOrdered = false;
	else return false;
	if (isTerminatingParagraph) {
		if (state.skipSpaces(posAfterMarker) >= state.eMarks[nextLine]) return false;
	}
	if (silent) return true;
	const markerCharCode = state.src.charCodeAt(posAfterMarker - 1);
	const listTokIdx = state.tokens.length;
	if (isOrdered) {
		const token = state.push("ordered_list_open", "ol", 1);
		if (markerValue !== void 0 && markerValue !== 1) token.attrs = [["start", String(markerValue)]];
	} else state.push("bullet_list_open", "ul", 1);
	const listLines = [nextLine, 0];
	state.tokens[state.tokens.length - 1].map = listLines;
	state.tokens[state.tokens.length - 1].markup = String.fromCharCode(markerCharCode);
	let prevEmptyEnd = false;
	const terminatorRules = state.md.block.ruler.getRules("list");
	const oldParentType = state.parentType;
	state.parentType = "list";
	while (nextLine < endLine) {
		pos = posAfterMarker;
		max = state.eMarks[nextLine];
		const initial = state.sCount[nextLine] + posAfterMarker - (state.bMarks[nextLine] + state.tShift[nextLine]);
		let offset = initial;
		while (pos < max) {
			const ch = state.src.charCodeAt(pos);
			if (ch === 9) offset += 4 - (offset + state.bsCount[nextLine]) % 4;
			else if (ch === 32) offset++;
			else break;
			pos++;
		}
		const contentStart = pos;
		let indentAfterMarker;
		if (contentStart >= max) indentAfterMarker = 1;
		else indentAfterMarker = offset - initial;
		if (indentAfterMarker > 4) indentAfterMarker = 1;
		const indent = initial + indentAfterMarker;
		const token = state.push("list_item_open", "li", 1);
		token.markup = String.fromCharCode(markerCharCode);
		const itemLines = [nextLine, 0];
		token.map = itemLines;
		if (isOrdered) token.info = state.src.slice(start, posAfterMarker - 1);
		const oldTight = state.tight;
		const oldTShift = state.tShift[nextLine];
		const oldSCount = state.sCount[nextLine];
		const oldListIndent = state.listIndent;
		state.listIndent = state.blkIndent;
		state.blkIndent = indent;
		state.tight = true;
		state.tShift[nextLine] = contentStart - state.bMarks[nextLine];
		state.sCount[nextLine] = offset;
		if (contentStart >= max && state.isEmpty(nextLine + 1)) state.line = Math.min(state.line + 2, endLine);
		else state.md.block.tokenize(state, nextLine, endLine, true);
		if (!state.tight || prevEmptyEnd) tight = false;
		prevEmptyEnd = state.line - nextLine > 1 && state.isEmpty(state.line - 1);
		state.blkIndent = state.listIndent;
		state.listIndent = oldListIndent;
		state.tShift[nextLine] = oldTShift;
		state.sCount[nextLine] = oldSCount;
		state.tight = oldTight;
		state.push("list_item_close", "li", -1).markup = String.fromCharCode(markerCharCode);
		nextLine = state.line;
		itemLines[1] = nextLine;
		if (nextLine >= endLine) break;
		if (state.sCount[nextLine] < state.blkIndent) break;
		if (state.sCount[nextLine] - state.blkIndent >= 4) break;
		let terminate = false;
		for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, true)) {
			terminate = true;
			break;
		}
		if (terminate) break;
		if (isOrdered) {
			posAfterMarker = skipOrderedListMarker(state, nextLine);
			if (posAfterMarker < 0) break;
			start = state.bMarks[nextLine] + state.tShift[nextLine];
		} else {
			posAfterMarker = skipBulletListMarker(state, nextLine);
			if (posAfterMarker < 0) break;
		}
		if (markerCharCode !== state.src.charCodeAt(posAfterMarker - 1)) break;
	}
	if (isOrdered) state.push("ordered_list_close", "ol", -1).markup = String.fromCharCode(markerCharCode);
	else state.push("bullet_list_close", "ul", -1).markup = String.fromCharCode(markerCharCode);
	listLines[1] = nextLine;
	state.line = nextLine;
	state.parentType = oldParentType;
	if (tight) markTightParagraphs(state, listTokIdx);
	return true;
}

//#endregion
//#region src/rules/block/paragraph.ts
function paragraph(state, startLine, endLine) {
	const terminatorRules = state.md.block.ruler.getRules("paragraph");
	const oldParentType = state.parentType;
	let nextLine = startLine + 1;
	state.parentType = "paragraph";
	for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
		if (state.sCount[nextLine] - state.blkIndent > 3) continue;
		if (state.sCount[nextLine] < 0) continue;
		let terminate = false;
		for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, true)) {
			terminate = true;
			break;
		}
		if (terminate) break;
	}
	const content = state.getLines(startLine, nextLine, state.blkIndent, false).trim();
	state.line = nextLine;
	const token_o = state.push("paragraph_open", "p", 1);
	token_o.map = [startLine, state.line];
	const token_i = state.push("inline", "", 0);
	token_i.content = content;
	token_i.map = [startLine, state.line];
	token_i.children = [];
	state.push("paragraph_close", "p", -1);
	state.parentType = oldParentType;
	return true;
}

//#endregion
//#region src/rules/block/reference.ts
function isSpace$2(code$1) {
	switch (code$1) {
		case 9:
		case 32: return true;
	}
	return false;
}
function normalizeReference(str) {
	str = str.trim().replace(/\s+/g, " ");
	if ("ẞ".toLowerCase() === "Ṿ".toLowerCase()) str = str.toLowerCase();
	return str.toLowerCase().toUpperCase().toLowerCase();
}
function reference(state, startLine, _endLine, silent) {
	let pos = state.bMarks[startLine] + state.tShift[startLine];
	let max = state.eMarks[startLine];
	let nextLine = startLine + 1;
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	if (state.src.charCodeAt(pos) !== 91) return false;
	function getNextLine(nextLine$1) {
		const endLine = state.lineMax;
		if (nextLine$1 >= endLine || state.isEmpty(nextLine$1)) return null;
		let isContinuation = false;
		if (state.sCount[nextLine$1] - state.blkIndent > 3) isContinuation = true;
		if (state.sCount[nextLine$1] < 0) isContinuation = true;
		if (!isContinuation) {
			const terminatorRules = state.md.block.ruler.getRules("reference");
			const oldParentType = state.parentType;
			state.parentType = "reference";
			let terminate = false;
			for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine$1, endLine, true)) {
				terminate = true;
				break;
			}
			state.parentType = oldParentType;
			if (terminate) return null;
		}
		const pos$1 = state.bMarks[nextLine$1] + state.tShift[nextLine$1];
		const max$1 = state.eMarks[nextLine$1];
		return state.src.slice(pos$1, max$1 + 1);
	}
	let str = state.src.slice(pos, max + 1);
	max = str.length;
	let labelEnd = -1;
	for (pos = 1; pos < max; pos++) {
		const ch = str.charCodeAt(pos);
		if (ch === 91) return false;
		else if (ch === 93) {
			labelEnd = pos;
			break;
		} else if (ch === 10) {
			const lineContent = getNextLine(nextLine);
			if (lineContent !== null) {
				str += lineContent;
				max = str.length;
				nextLine++;
			}
		} else if (ch === 92) {
			pos++;
			if (pos < max && str.charCodeAt(pos) === 10) {
				const lineContent = getNextLine(nextLine);
				if (lineContent !== null) {
					str += lineContent;
					max = str.length;
					nextLine++;
				}
			}
		}
	}
	if (labelEnd < 0 || str.charCodeAt(labelEnd + 1) !== 58) return false;
	for (pos = labelEnd + 2; pos < max; pos++) {
		const ch = str.charCodeAt(pos);
		if (ch === 10) {
			const lineContent = getNextLine(nextLine);
			if (lineContent !== null) {
				str += lineContent;
				max = str.length;
				nextLine++;
			}
		} else if (isSpace$2(ch)) {} else break;
	}
	const destRes = state.md.helpers.parseLinkDestination(str, pos, max);
	if (!destRes.ok) return false;
	const href = state.md.normalizeLink(destRes.str);
	if (!state.md.validateLink(href)) return false;
	pos = destRes.pos;
	const destEndPos = pos;
	const destEndLineNo = nextLine;
	const start = pos;
	for (; pos < max; pos++) {
		const ch = str.charCodeAt(pos);
		if (ch === 10) {
			const lineContent = getNextLine(nextLine);
			if (lineContent !== null) {
				str += lineContent;
				max = str.length;
				nextLine++;
			}
		} else if (isSpace$2(ch)) {} else break;
	}
	let titleRes = state.md.helpers.parseLinkTitle(str, pos, max);
	while (titleRes.can_continue) {
		const lineContent = getNextLine(nextLine);
		if (lineContent === null) break;
		str += lineContent;
		pos = max;
		max = str.length;
		nextLine++;
		titleRes = state.md.helpers.parseLinkTitle(str, pos, max, titleRes);
	}
	let title;
	if (pos < max && start !== pos && titleRes.ok) {
		title = titleRes.str;
		pos = titleRes.pos;
	} else {
		title = "";
		pos = destEndPos;
		nextLine = destEndLineNo;
	}
	while (pos < max) {
		if (!isSpace$2(str.charCodeAt(pos))) break;
		pos++;
	}
	if (pos < max && str.charCodeAt(pos) !== 10) {
		if (title) {
			title = "";
			pos = destEndPos;
			nextLine = destEndLineNo;
			while (pos < max) {
				if (!isSpace$2(str.charCodeAt(pos))) break;
				pos++;
			}
		}
	}
	if (pos < max && str.charCodeAt(pos) !== 10) return false;
	const label = normalizeReference(str.slice(1, labelEnd));
	if (!label) return false;
	if (silent) return true;
	if (typeof state.env.references === "undefined") state.env.references = {};
	if (typeof state.env.references[label] === "undefined") state.env.references[label] = {
		title,
		href
	};
	state.line = nextLine;
	return true;
}

//#endregion
//#region src/rules/block/table.ts
function isSpace$1(code$1) {
	switch (code$1) {
		case 9:
		case 32: return true;
	}
	return false;
}
const MAX_AUTOCOMPLETED_CELLS = 65536;
function getLine(state, line) {
	const pos = state.bMarks[line] + state.tShift[line];
	const max = state.eMarks[line];
	return state.src.slice(pos, max);
}
function escapedSplit(str) {
	const result = [];
	const max = str.length;
	let pos = 0;
	let ch = str.charCodeAt(pos);
	let isEscaped = false;
	let lastPos = 0;
	let current = "";
	while (pos < max) {
		if (ch === 124) if (!isEscaped) {
			result.push(current + str.substring(lastPos, pos));
			current = "";
			lastPos = pos + 1;
		} else {
			current += str.substring(lastPos, pos - 1);
			lastPos = pos;
		}
		isEscaped = ch === 92;
		pos++;
		ch = str.charCodeAt(pos);
	}
	result.push(current + str.substring(lastPos));
	return result;
}
function table(state, startLine, endLine, silent) {
	if (startLine + 2 > endLine) return false;
	let nextLine = startLine + 1;
	if (state.sCount[nextLine] < state.blkIndent) return false;
	if (state.sCount[nextLine] - state.blkIndent >= 4) return false;
	let pos = state.bMarks[nextLine] + state.tShift[nextLine];
	if (pos >= state.eMarks[nextLine]) return false;
	const firstCh = state.src.charCodeAt(pos++);
	if (firstCh !== 124 && firstCh !== 45 && firstCh !== 58) return false;
	if (pos >= state.eMarks[nextLine]) return false;
	const secondCh = state.src.charCodeAt(pos++);
	if (secondCh !== 124 && secondCh !== 45 && secondCh !== 58 && !isSpace$1(secondCh)) return false;
	if (firstCh === 45 && isSpace$1(secondCh)) return false;
	while (pos < state.eMarks[nextLine]) {
		const ch = state.src.charCodeAt(pos);
		if (ch !== 124 && ch !== 45 && ch !== 58 && !isSpace$1(ch)) return false;
		pos++;
	}
	let lineText = getLine(state, startLine + 1);
	let columns = lineText.split("|");
	const aligns = [];
	for (let i = 0; i < columns.length; i++) {
		const t = columns[i].trim();
		if (!t) if (i === 0 || i === columns.length - 1) continue;
		else return false;
		if (!/^:?-+:?$/.test(t)) return false;
		if (t.charCodeAt(t.length - 1) === 58) aligns.push(t.charCodeAt(0) === 58 ? "center" : "right");
		else if (t.charCodeAt(0) === 58) aligns.push("left");
		else aligns.push("");
	}
	lineText = getLine(state, startLine).trim();
	if (!lineText.includes("|")) return false;
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	columns = escapedSplit(lineText);
	if (columns.length && columns[0] === "") columns.shift();
	if (columns.length && columns[columns.length - 1] === "") columns.pop();
	const columnCount = columns.length;
	if (columnCount === 0 || columnCount !== aligns.length) return false;
	if (silent) return true;
	const oldParentType = state.parentType;
	state.parentType = "table";
	const terminatorRules = state.md.block.ruler.getRules("blockquote");
	const token_to = state.push("table_open", "table", 1);
	const tableLines = [startLine, 0];
	token_to.map = tableLines;
	const token_tho = state.push("thead_open", "thead", 1);
	token_tho.map = [startLine, startLine + 1];
	const token_htro = state.push("tr_open", "tr", 1);
	token_htro.map = [startLine, startLine + 1];
	for (let i = 0; i < columns.length; i++) {
		const token_ho = state.push("th_open", "th", 1);
		if (aligns[i]) token_ho.attrs = [["style", `text-align:${aligns[i]}`]];
		const token_il = state.push("inline", "", 0);
		token_il.content = columns[i].trim();
		token_il.children = [];
		state.push("th_close", "th", -1);
	}
	state.push("tr_close", "tr", -1);
	state.push("thead_close", "thead", -1);
	let tbodyLines;
	let autocompletedCells = 0;
	for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
		if (state.sCount[nextLine] < state.blkIndent) break;
		let terminate = false;
		for (let i = 0, l = terminatorRules.length; i < l; i++) if (terminatorRules[i](state, nextLine, endLine, true)) {
			terminate = true;
			break;
		}
		if (terminate) break;
		lineText = getLine(state, nextLine).trim();
		if (!lineText) break;
		if (state.sCount[nextLine] - state.blkIndent >= 4) break;
		columns = escapedSplit(lineText);
		if (columns.length && columns[0] === "") columns.shift();
		if (columns.length && columns[columns.length - 1] === "") columns.pop();
		autocompletedCells += columnCount - columns.length;
		if (autocompletedCells > MAX_AUTOCOMPLETED_CELLS) break;
		if (nextLine === startLine + 2) {
			const token_tbo = state.push("tbody_open", "tbody", 1);
			token_tbo.map = tbodyLines = [startLine + 2, 0];
		}
		const token_tro = state.push("tr_open", "tr", 1);
		token_tro.map = [nextLine, nextLine + 1];
		for (let i = 0; i < columnCount; i++) {
			const token_tdo = state.push("td_open", "td", 1);
			if (aligns[i]) token_tdo.attrs = [["style", `text-align:${aligns[i]}`]];
			const token_il = state.push("inline", "", 0);
			token_il.content = columns[i] ? columns[i].trim() : "";
			token_il.children = [];
			state.push("td_close", "td", -1);
		}
		state.push("tr_close", "tr", -1);
	}
	if (tbodyLines) {
		state.push("tbody_close", "tbody", -1);
		tbodyLines[1] = nextLine;
	}
	state.push("table_close", "table", -1);
	tableLines[1] = nextLine;
	state.parentType = oldParentType;
	state.line = nextLine;
	return true;
}

//#endregion
//#region src/parse/parser_block/ruler.ts
/**
* Block-level rule management with Ruler pattern
*/
var BlockRuler = class {
	_rules = [];
	push(name, fn, options) {
		this._rules.push({
			name,
			enabled: true,
			fn,
			alt: options?.alt || []
		});
	}
	getRules(chainName) {
		if (chainName === "") return this._rules.filter((rule) => rule.enabled).map((rule) => rule.fn);
		const result = [];
		for (const rule of this._rules) if (rule.enabled && (!chainName || rule.alt.includes(chainName))) result.push(rule.fn);
		return result;
	}
	at(name, fn, options) {
		const index = this._rules.findIndex((r) => r.name === name);
		if (index === -1) throw new Error(`Parser rule not found: ${name}`);
		this._rules[index].fn = fn;
		if (options?.alt) this._rules[index].alt = options.alt;
	}
	enable(names, ignoreInvalid) {
		const nameList = Array.isArray(names) ? names : [names];
		const result = [];
		nameList.forEach((name) => {
			const idx = this._rules.findIndex((r) => r.name === name);
			if (idx === -1) {
				if (ignoreInvalid) return;
				throw new Error(`Rules manager: invalid rule name ${name}`);
			}
			this._rules[idx].enabled = true;
			result.push(name);
		});
		return result;
	}
	disable(names, ignoreInvalid) {
		const nameList = Array.isArray(names) ? names : [names];
		const result = [];
		nameList.forEach((name) => {
			const idx = this._rules.findIndex((r) => r.name === name);
			if (idx === -1) {
				if (ignoreInvalid) return;
				throw new Error(`Rules manager: invalid rule name ${name}`);
			}
			this._rules[idx].enabled = false;
			result.push(name);
		});
		return result;
	}
};

//#endregion
//#region src/parse/parser_block/state_block.ts
function isSpace(code$1) {
	switch (code$1) {
		case 9:
		case 32: return true;
	}
	return false;
}
var StateBlock = class {
	src;
	md;
	env;
	tokens;
	bMarks = [];
	eMarks = [];
	tShift = [];
	sCount = [];
	bsCount = [];
	blkIndent = 0;
	line = 0;
	lineMax = 0;
	tight = false;
	ddIndent = -1;
	listIndent = -1;
	parentType = "root";
	level = 0;
	constructor(src, md, env, tokens) {
		this.src = src;
		this.md = md;
		this.env = env;
		this.tokens = tokens;
		const s = this.src;
		let indent = 0;
		let offset = 0;
		let start = 0;
		let indent_found = false;
		for (let pos = 0, len = s.length; pos < len; pos++) {
			const ch = s.charCodeAt(pos);
			if (!indent_found) if (isSpace(ch)) {
				indent++;
				if (ch === 9) offset += 4 - offset % 4;
				else offset++;
				continue;
			} else indent_found = true;
			if (ch === 10 || pos === len - 1) {
				if (ch !== 10) pos++;
				this.bMarks.push(start);
				this.eMarks.push(pos);
				this.tShift.push(indent);
				this.sCount.push(offset);
				this.bsCount.push(0);
				indent_found = false;
				indent = 0;
				offset = 0;
				start = pos + 1;
			}
		}
		this.bMarks.push(s.length);
		this.eMarks.push(s.length);
		this.tShift.push(0);
		this.sCount.push(0);
		this.bsCount.push(0);
		this.lineMax = this.bMarks.length - 1;
	}
	push(type, tag, nesting) {
		const token = {
			type,
			tag,
			level: this.level,
			content: "",
			block: true,
			nesting
		};
		if (nesting < 0) this.level--;
		token.level = this.level;
		if (nesting > 0) this.level++;
		this.tokens.push(token);
		return token;
	}
	isEmpty(line) {
		return this.bMarks[line] + this.tShift[line] >= this.eMarks[line];
	}
	skipEmptyLines(from) {
		for (let max = this.lineMax; from < max; from++) if (this.bMarks[from] + this.tShift[from] < this.eMarks[from]) break;
		return from;
	}
	skipSpaces(pos) {
		for (let max = this.src.length; pos < max; pos++) if (!isSpace(this.src.charCodeAt(pos))) break;
		return pos;
	}
	skipSpacesBack(pos, min) {
		if (pos <= min) return pos;
		while (pos > min) if (!isSpace(this.src.charCodeAt(--pos))) return pos + 1;
		return pos;
	}
	skipChars(pos, code$1) {
		for (let max = this.src.length; pos < max; pos++) if (this.src.charCodeAt(pos) !== code$1) break;
		return pos;
	}
	skipCharsBack(pos, code$1, min) {
		if (pos <= min) return pos;
		while (pos > min) if (code$1 !== this.src.charCodeAt(--pos)) return pos + 1;
		return pos;
	}
	getLines(begin, end, indent, keepLastLF) {
		if (begin >= end) return "";
		const queue = new Array(end - begin);
		for (let i = 0, line = begin; line < end; line++, i++) {
			let lineIndent = 0;
			const lineStart = this.bMarks[line];
			let first = lineStart;
			let last;
			if (line + 1 < end || keepLastLF) last = this.eMarks[line] + 1;
			else last = this.eMarks[line];
			while (first < last && lineIndent < indent) {
				const ch = this.src.charCodeAt(first);
				if (isSpace(ch)) if (ch === 9) lineIndent += 4 - (lineIndent + this.bsCount[line]) % 4;
				else lineIndent++;
				else if (first - lineStart < this.tShift[line]) lineIndent++;
				else break;
				first++;
			}
			if (lineIndent > indent) queue[i] = new Array(lineIndent - indent + 1).join(" ") + this.src.slice(first, last);
			else queue[i] = this.src.slice(first, last);
		}
		return queue.join("");
	}
};

//#endregion
//#region src/parse/parser_block.ts
const _rules$1 = [
	[
		"table",
		table,
		["paragraph", "reference"]
	],
	["code", code],
	[
		"fence",
		fence,
		[
			"paragraph",
			"reference",
			"blockquote",
			"list"
		]
	],
	[
		"blockquote",
		blockquote,
		[
			"paragraph",
			"reference",
			"blockquote",
			"list"
		]
	],
	[
		"hr",
		hr,
		[
			"paragraph",
			"reference",
			"blockquote",
			"list"
		]
	],
	[
		"list",
		list,
		[
			"paragraph",
			"reference",
			"blockquote"
		]
	],
	["reference", reference],
	[
		"html_block",
		html_block,
		[
			"paragraph",
			"reference",
			"blockquote"
		]
	],
	[
		"heading",
		heading,
		[
			"paragraph",
			"reference",
			"blockquote"
		]
	],
	["lheading", lheading],
	["paragraph", paragraph]
];
var ParserBlock = class {
	ruler;
	constructor() {
		this.ruler = new BlockRuler();
		for (let i = 0; i < _rules$1.length; i++) this.ruler.push(_rules$1[i][0], _rules$1[i][1], { alt: (_rules$1[i][2] || []).slice() });
	}
	/**
	* Generate tokens for input range
	*/
	tokenize(state, startLine, endLine) {
		const rules = this.ruler.getRules("");
		const len = rules.length;
		const maxNesting = state.md.options.maxNesting;
		let line = startLine;
		let hasEmptyLines = false;
		while (line < endLine) {
			state.line = line = state.skipEmptyLines(line);
			if (line >= endLine) break;
			if (state.sCount[line] < state.blkIndent) break;
			if (state.level >= maxNesting) {
				state.line = endLine;
				break;
			}
			const prevLine = state.line;
			let ok = false;
			for (let i = 0; i < len; i++) {
				ok = rules[i](state, line, endLine, false);
				if (ok) {
					if (prevLine >= state.line) throw new Error("block rule didn't increment state.line");
					break;
				}
			}
			if (!ok) throw new Error("none of the block rules matched");
			state.tight = !hasEmptyLines;
			if (state.isEmpty(state.line - 1)) hasEmptyLines = true;
			line = state.line;
			if (line < endLine && state.isEmpty(line)) {
				hasEmptyLines = true;
				line++;
				state.line = line;
			}
		}
	}
	/**
	* ParserBlock.parse(src, md, env, outTokens)
	*
	* Process input string and push block tokens into `outTokens`
	*/
	parse(src, md, env, outTokens) {
		if (!src) return;
		const state = new StateBlock(src, md, env, outTokens);
		this.tokenize(state, state.line, state.lineMax);
	}
};

//#endregion
//#region src/rules/inline/autolink.ts
/**
* Process autolinks '<protocol:...>'
*/
const EMAIL_RE = /^[\w.!#$%&'*+/=?^`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
const AUTOLINK_RE = /^[a-z][a-z0-9+.-]{1,31}:[^<>\x00-\x20]*$/i;
function autolink(state, silent) {
	let pos = state.pos;
	if (state.src.charCodeAt(pos) !== 60) return false;
	const start = state.pos;
	const max = state.posMax;
	for (;;) {
		if (++pos >= max) return false;
		const ch = state.src.charCodeAt(pos);
		if (ch === 60) return false;
		if (ch === 62) break;
	}
	const url = state.src.slice(start + 1, pos);
	if (AUTOLINK_RE.test(url)) {
		const fullUrl = state.md.normalizeLink(url);
		if (!state.md.validateLink(fullUrl)) return false;
		if (!silent) {
			const token_o = state.push("link_open", "a", 1);
			token_o.attrs = [["href", fullUrl]];
			token_o.markup = "autolink";
			token_o.info = "auto";
			const token_t = state.push("text", "", 0);
			token_t.content = state.md.normalizeLinkText(url);
			const token_c = state.push("link_close", "a", -1);
			token_c.markup = "autolink";
			token_c.info = "auto";
		}
		state.pos += url.length + 2;
		return true;
	}
	if (EMAIL_RE.test(url)) {
		const fullUrl = state.md.normalizeLink(`mailto:${url}`);
		if (!state.md.validateLink(fullUrl)) return false;
		if (!silent) {
			const token_o = state.push("link_open", "a", 1);
			token_o.attrs = [["href", fullUrl]];
			token_o.markup = "autolink";
			token_o.info = "auto";
			const token_t = state.push("text", "", 0);
			token_t.content = state.md.normalizeLinkText(url);
			const token_c = state.push("link_close", "a", -1);
			token_c.markup = "autolink";
			token_c.info = "auto";
		}
		state.pos += url.length + 2;
		return true;
	}
	return false;
}
var autolink_default = autolink;

//#endregion
//#region src/rules/inline/backticks.ts
/**
* Parse backticks (inline code)
*/
function backticks(state, silent) {
	let pos = state.pos;
	if (state.src.charCodeAt(pos) !== 96) return false;
	const start = pos;
	pos++;
	const max = state.posMax;
	while (pos < max && state.src.charCodeAt(pos) === 96) pos++;
	const marker = state.src.slice(start, pos);
	const openerLength = marker.length;
	if (state.backticksScanned && (state.backticks[openerLength] || 0) <= start) {
		if (!silent) state.pending += marker;
		state.pos += openerLength;
		return true;
	}
	let matchEnd = pos;
	let matchStart;
	while ((matchStart = state.src.indexOf("`", matchEnd)) !== -1) {
		matchEnd = matchStart + 1;
		while (matchEnd < max && state.src.charCodeAt(matchEnd) === 96) matchEnd++;
		const closerLength = matchEnd - matchStart;
		if (closerLength === openerLength) {
			if (!silent) {
				const token = state.push("code_inline", "code", 0);
				token.markup = marker;
				token.content = state.src.slice(pos, matchStart).replace(/\n/g, " ").replace(/^ (.+) $/, "$1");
			}
			state.pos = matchEnd;
			return true;
		}
		state.backticks[closerLength] = matchStart;
	}
	state.backticksScanned = true;
	if (!silent) state.pending += marker;
	state.pos += openerLength;
	return true;
}
var backticks_default = backticks;

//#endregion
//#region src/rules/inline/balance_pairs.ts
function processDelimiters(delimiters) {
	const openersBottom = {};
	const max = delimiters.length;
	if (!max) return;
	let headerIdx = 0;
	let lastTokenIdx = -2;
	const jumps = [];
	for (let closerIdx = 0; closerIdx < max; closerIdx++) {
		const closer = delimiters[closerIdx];
		jumps.push(0);
		if (delimiters[headerIdx].marker !== closer.marker || lastTokenIdx !== closer.token - 1) headerIdx = closerIdx;
		lastTokenIdx = closer.token;
		closer.length = closer.length || 0;
		if (!closer.close) continue;
		if (!Object.prototype.hasOwnProperty.call(openersBottom, closer.marker)) openersBottom[closer.marker] = [
			-1,
			-1,
			-1,
			-1,
			-1,
			-1
		];
		const minOpenerIdx = openersBottom[closer.marker][(closer.open ? 3 : 0) + closer.length % 3];
		let openerIdx = headerIdx - jumps[headerIdx] - 1;
		let newMinOpenerIdx = openerIdx;
		for (; openerIdx > minOpenerIdx; openerIdx -= jumps[openerIdx] + 1) {
			const opener = delimiters[openerIdx];
			if (opener.marker !== closer.marker) continue;
			if (opener.open && opener.end < 0) {
				let isOddMatch = false;
				if (opener.close || closer.open) {
					if ((opener.length + closer.length) % 3 === 0) {
						if (opener.length % 3 !== 0 || closer.length % 3 !== 0) isOddMatch = true;
					}
				}
				if (!isOddMatch) {
					const lastJump = openerIdx > 0 && !delimiters[openerIdx - 1].open ? jumps[openerIdx - 1] + 1 : 0;
					jumps[closerIdx] = closerIdx - openerIdx + lastJump;
					jumps[openerIdx] = lastJump;
					closer.open = false;
					opener.end = closerIdx;
					opener.close = false;
					newMinOpenerIdx = -1;
					lastTokenIdx = -2;
					break;
				}
			}
		}
		if (newMinOpenerIdx !== -1) openersBottom[closer.marker][(closer.open ? 3 : 0) + (closer.length || 0) % 3] = newMinOpenerIdx;
	}
}
function balance_pairs(state) {
	const tokens_meta = state.tokens_meta;
	const max = state.tokens_meta.length;
	processDelimiters(state.delimiters);
	for (let curr = 0; curr < max; curr++) if (tokens_meta[curr] && tokens_meta[curr].delimiters) processDelimiters(tokens_meta[curr].delimiters);
}
var balance_pairs_default = balance_pairs;

//#endregion
//#region src/rules/inline/emphasis.ts
function emphasis_tokenize(state, silent) {
	const start = state.pos;
	const marker = state.src.charCodeAt(start);
	if (silent) return false;
	if (marker !== 95 && marker !== 42) return false;
	const scanned = state.scanDelims(state.pos, marker === 42);
	if (!scanned || scanned.length === 0) return false;
	for (let i = 0; i < scanned.length; i++) {
		const token = state.push("text", "", 0);
		token.content = String.fromCharCode(marker);
		state.delimiters.push({
			marker,
			length: scanned.length,
			token: state.tokens.length - 1,
			end: -1,
			open: scanned.can_open,
			close: scanned.can_close
		});
	}
	state.pos += scanned.length;
	return true;
}
function postProcess(state, delimiters) {
	const max = delimiters.length;
	for (let i = max - 1; i >= 0; i--) {
		const startDelim = delimiters[i];
		if (startDelim.marker !== 95 && startDelim.marker !== 42) continue;
		if (startDelim.end === -1) continue;
		const endDelim = delimiters[startDelim.end];
		const isStrong = i > 0 && delimiters[i - 1].end === startDelim.end + 1 && delimiters[i - 1].marker === startDelim.marker && delimiters[i - 1].token === startDelim.token - 1 && delimiters[startDelim.end + 1].token === endDelim.token + 1;
		const ch = String.fromCharCode(startDelim.marker);
		const token_o = state.tokens[startDelim.token];
		token_o.type = isStrong ? "strong_open" : "em_open";
		token_o.tag = isStrong ? "strong" : "em";
		token_o.nesting = 1;
		token_o.markup = isStrong ? ch + ch : ch;
		token_o.content = "";
		const token_c = state.tokens[endDelim.token];
		token_c.type = isStrong ? "strong_close" : "em_close";
		token_c.tag = isStrong ? "strong" : "em";
		token_c.nesting = -1;
		token_c.markup = isStrong ? ch + ch : ch;
		token_c.content = "";
		if (isStrong) {
			state.tokens[delimiters[i - 1].token].content = "";
			state.tokens[delimiters[startDelim.end + 1].token].content = "";
			i--;
		}
	}
}
function emphasis_postProcess(state) {
	const tokens_meta = state.tokens_meta;
	const max = state.tokens_meta.length;
	postProcess(state, state.delimiters);
	for (let curr = 0; curr < max; curr++) if (tokens_meta[curr] && tokens_meta[curr].delimiters) postProcess(state, tokens_meta[curr].delimiters);
}
const emphasis = {
	tokenize: emphasis_tokenize,
	postProcess: emphasis_postProcess
};

//#endregion
//#region src/rules/inline/entity.ts
/**
* Process html entity - &#123;, &#xAF;, &quot;, ...
*/
const DIGITAL_RE = /^&#(x[a-f0-9]{1,6}|\d{1,7});/i;
const NAMED_RE = /^&([a-z][a-z0-9]{1,31});/i;
const entities = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: "\"",
	apos: "'",
	nbsp: "\xA0"
};
function isValidEntityCode(code$1) {
	if (code$1 >= 55296 && code$1 <= 57343) return false;
	if (code$1 >= 1114111) return false;
	return true;
}
function fromCodePoint(code$1) {
	return String.fromCodePoint(code$1);
}
function decodeHTML(str) {
	const match = str.match(/^&([a-z][a-z0-9]{1,31});/i);
	if (match && entities[match[1]]) return entities[match[1]];
	return str;
}
function entity(state, silent) {
	const pos = state.pos;
	const max = state.posMax;
	if (state.src.charCodeAt(pos) !== 38) return false;
	if (pos + 1 >= max) return false;
	if (state.src.charCodeAt(pos + 1) === 35) {
		const match = state.src.slice(pos).match(DIGITAL_RE);
		if (match) {
			if (!silent) {
				const code$1 = match[1][0].toLowerCase() === "x" ? Number.parseInt(match[1].slice(1), 16) : Number.parseInt(match[1], 10);
				const token = state.push("text_special", "", 0);
				token.content = isValidEntityCode(code$1) ? fromCodePoint(code$1) : fromCodePoint(65533);
				token.markup = match[0];
				token.info = "entity";
			}
			state.pos += match[0].length;
			return true;
		}
	} else {
		const match = state.src.slice(pos).match(NAMED_RE);
		if (match) {
			const decoded = decodeHTML(match[0]);
			if (decoded !== match[0]) {
				if (!silent) {
					const token = state.push("text_special", "", 0);
					token.content = decoded;
					token.markup = match[0];
					token.info = "entity";
				}
				state.pos += match[0].length;
				return true;
			}
		}
	}
	return false;
}
var entity_default = entity;

//#endregion
//#region src/rules/inline/escape.ts
/**
* Inline rule: escape
* Process escaped characters
*/
const ESCAPED = [
	92,
	96,
	42,
	95,
	123,
	125,
	91,
	93,
	40,
	41,
	35,
	43,
	45,
	46,
	33,
	124
];
function escape(state, silent) {
	const { pos, posMax, src } = state;
	if (src.charCodeAt(pos) !== 92) return false;
	const pos_next = pos + 1;
	if (pos_next >= posMax) return false;
	const ch = src.charCodeAt(pos_next);
	if (ch === 10) {
		if (!silent) state.push("hardbreak", "br", 0);
		state.pos += 2;
		return true;
	}
	if (ch < 128 && ESCAPED.includes(ch)) {
		if (!silent) state.pending += src[pos_next];
		state.pos += 2;
		return true;
	}
	return false;
}
var escape_default = escape;

//#endregion
//#region src/rules/inline/fragments_join.ts
function fragments_join(state) {
	let curr, last;
	let level = 0;
	const tokens = state.tokens;
	const max = state.tokens.length;
	for (curr = last = 0; curr < max; curr++) {
		const token = tokens[curr];
		if (!token) continue;
		if (token.nesting && token.nesting < 0) level--;
		token.level = level;
		if (token.nesting && token.nesting > 0) level++;
		if (token.type === "text" && curr + 1 < max && tokens[curr + 1]?.type === "text") tokens[curr + 1].content = token.content + tokens[curr + 1].content;
		else {
			if (curr !== last) tokens[last] = token;
			last++;
		}
	}
	if (curr !== last) tokens.length = last;
}
var fragments_join_default = fragments_join;

//#endregion
//#region src/rules/inline/html_inline.ts
/**
* Process html tags
*/
const HTML_TAG_RE = /^<\/?[a-z][a-z0-9-]*(?:\s+[a-z_:][\w:.-]*(?:\s*=\s*(?:[^"'=<>`\s]+|'[^']*'|"[^"]*"))?)*\s*\/?>/i;
function isLinkOpen(str) {
	return /^<a[>\s]/i.test(str);
}
function isLinkClose(str) {
	return /^<\/a\s*>/i.test(str);
}
function isLetter(ch) {
	const lc = ch | 32;
	return lc >= 97 && lc <= 122;
}
function html_inline(state, silent) {
	if (!state.md.options.html) return false;
	const max = state.posMax;
	const pos = state.pos;
	if (state.src.charCodeAt(pos) !== 60 || pos + 2 >= max) return false;
	const ch = state.src.charCodeAt(pos + 1);
	if (ch !== 33 && ch !== 63 && ch !== 47 && !isLetter(ch)) return false;
	const match = state.src.slice(pos).match(HTML_TAG_RE);
	if (!match) return false;
	if (!silent) {
		const token = state.push("html_inline", "", 0);
		token.content = match[0];
		if (isLinkOpen(token.content)) state.linkLevel++;
		if (isLinkClose(token.content)) state.linkLevel--;
	}
	state.pos += match[0].length;
	return true;
}
var html_inline_default = html_inline;

//#endregion
//#region src/helpers/parse_link_destination.ts
/**
* Parse link destination: returns { ok, pos, str }
*/
function parseLinkDestination(str, start, max) {
	let code$1;
	let pos = start;
	const result = {
		ok: false,
		pos: 0,
		str: ""
	};
	if (str.charCodeAt(pos) === 60) {
		pos++;
		while (pos < max) {
			code$1 = str.charCodeAt(pos);
			if (code$1 === 10) return result;
			if (code$1 === 60) return result;
			if (code$1 === 62) {
				result.pos = pos + 1;
				result.str = str.slice(start + 1, pos);
				result.ok = true;
				return result;
			}
			if (code$1 === 92 && pos + 1 < max) {
				pos += 2;
				continue;
			}
			pos++;
		}
		return result;
	}
	let level = 0;
	while (pos < max) {
		code$1 = str.charCodeAt(pos);
		if (code$1 === 32) break;
		if (code$1 < 32 || code$1 === 127) break;
		if (code$1 === 92 && pos + 1 < max) {
			if (str.charCodeAt(pos + 1) === 32) break;
			pos += 2;
			continue;
		}
		if (code$1 === 40) {
			level++;
			if (level > 32) return result;
		}
		if (code$1 === 41) {
			if (level === 0) break;
			level--;
		}
		pos++;
	}
	if (start === pos) return result;
	if (level !== 0) return result;
	result.str = str.slice(start, pos);
	result.pos = pos;
	result.ok = true;
	return result;
}
var parse_link_destination_default = parseLinkDestination;

//#endregion
//#region src/helpers/parse_link_label.ts
/**
* Parse link label: returns the end position of label or -1 if not found
* Assumes first character ([) already matches
*/
function parseLinkLabel(state, start, disableNested) {
	let level = 1;
	let found = false;
	let marker;
	let prevPos;
	const max = state.posMax;
	const oldPos = state.pos;
	state.pos = start + 1;
	while (state.pos < max) {
		marker = state.src.charCodeAt(state.pos);
		if (marker === 93) {
			level--;
			if (level === 0) {
				found = true;
				break;
			}
		}
		prevPos = state.pos;
		state.md.inline.skipToken(state);
		if (marker === 91) {
			if (prevPos === state.pos - 1) level++;
			else if (disableNested) {
				state.pos = oldPos;
				return -1;
			}
		}
	}
	let labelEnd = -1;
	if (found) labelEnd = state.pos;
	state.pos = oldPos;
	return labelEnd;
}
var parse_link_label_default = parseLinkLabel;

//#endregion
//#region src/helpers/parse_link_title.ts
/**
* Parse link title: returns { ok, can_continue, pos, str, marker }
*/
function parseLinkTitle(str, start, max, prev_state) {
	let code$1;
	let pos = start;
	const state = {
		ok: false,
		can_continue: false,
		pos: 0,
		str: "",
		marker: 0
	};
	if (prev_state) {
		state.str = prev_state.str;
		state.marker = prev_state.marker;
	} else {
		if (pos >= max) return state;
		let marker = str.charCodeAt(pos);
		if (marker !== 34 && marker !== 39 && marker !== 40) return state;
		start++;
		pos++;
		if (marker === 40) marker = 41;
		state.marker = marker;
	}
	while (pos < max) {
		code$1 = str.charCodeAt(pos);
		if (code$1 === state.marker) {
			state.pos = pos + 1;
			state.str += str.slice(start, pos);
			state.ok = true;
			return state;
		} else if (code$1 === 40 && state.marker === 41) return state;
		else if (code$1 === 92 && pos + 1 < max) pos++;
		pos++;
	}
	state.can_continue = true;
	state.str += str.slice(start, pos);
	return state;
}
var parse_link_title_default = parseLinkTitle;

//#endregion
//#region src/rules/inline/image.ts
function image(state, silent) {
	let code$1, content, label, pos, ref, res, title, start;
	let href = "";
	const oldPos = state.pos;
	const max = state.posMax;
	if (state.src.charCodeAt(state.pos) !== 33) return false;
	if (state.src.charCodeAt(state.pos + 1) !== 91) return false;
	const labelStart = state.pos + 2;
	const labelEnd = parse_link_label_default(state, state.pos + 1, false);
	if (labelEnd < 0) return false;
	pos = labelEnd + 1;
	if (pos < max && state.src.charCodeAt(pos) === 40) {
		pos++;
		for (; pos < max; pos++) {
			code$1 = state.src.charCodeAt(pos);
			if (code$1 !== 32 && code$1 !== 10) break;
		}
		if (pos >= max) return false;
		start = pos;
		res = parse_link_destination_default(state.src, pos, state.posMax);
		if (res.ok) {
			href = res.str;
			pos = res.pos;
			for (; pos < max; pos++) {
				code$1 = state.src.charCodeAt(pos);
				if (code$1 !== 32 && code$1 !== 10) break;
			}
			res = parse_link_title_default(state.src, pos, state.posMax);
			if (pos < max && res.ok) {
				title = res.str;
				pos = res.pos;
				for (; pos < max; pos++) {
					code$1 = state.src.charCodeAt(pos);
					if (code$1 !== 32 && code$1 !== 10) break;
				}
			} else title = "";
		}
		if (pos >= max || state.src.charCodeAt(pos) !== 41) {
			state.pos = oldPos;
			return false;
		}
		pos++;
	} else {
		if (typeof state.env.references === "undefined") return false;
		if (pos < max && state.src.charCodeAt(pos) === 91) {
			start = pos + 1;
			pos = parse_link_label_default(state, pos);
			if (pos >= 0) label = state.src.slice(start, pos++);
			else pos = labelEnd + 1;
		} else pos = labelEnd + 1;
		if (!label) label = state.src.slice(labelStart, labelEnd);
		ref = state.env.references[label && label.toLowerCase()];
		if (!ref) {
			state.pos = oldPos;
			return false;
		}
		href = ref.href;
		title = ref.title;
	}
	if (!silent) {
		content = state.src.slice(labelStart, labelEnd);
		const token = state.push("image", "img", 0);
		token.attrs = [["src", href], ["alt", content]];
		if (title) token.attrs.push(["title", title]);
	}
	state.pos = pos;
	state.posMax = max;
	return true;
}
var image_default = image;

//#endregion
//#region src/rules/inline/link.ts
function link(state, silent) {
	let code$1, label, res, ref;
	let href = "";
	let title = "";
	let start = state.pos;
	let parseReference = true;
	if (state.src.charCodeAt(state.pos) !== 91) return false;
	const oldPos = state.pos;
	const max = state.posMax;
	const labelStart = state.pos + 1;
	const labelEnd = parse_link_label_default(state, state.pos, true);
	if (labelEnd < 0) return false;
	let pos = labelEnd + 1;
	if (pos < max && state.src.charCodeAt(pos) === 40) {
		parseReference = false;
		pos++;
		for (; pos < max; pos++) {
			code$1 = state.src.charCodeAt(pos);
			if (code$1 !== 32 && code$1 !== 10) break;
		}
		if (pos >= max) return false;
		start = pos;
		res = parse_link_destination_default(state.src, pos, state.posMax);
		if (res.ok) {
			href = res.str;
			pos = res.pos;
			for (; pos < max; pos++) {
				code$1 = state.src.charCodeAt(pos);
				if (code$1 !== 32 && code$1 !== 10) break;
			}
			res = parse_link_title_default(state.src, pos, state.posMax);
			if (pos < max && res.ok) {
				title = res.str;
				pos = res.pos;
				for (; pos < max; pos++) {
					code$1 = state.src.charCodeAt(pos);
					if (code$1 !== 32 && code$1 !== 10) break;
				}
			}
		}
		if (pos >= max || state.src.charCodeAt(pos) !== 41) parseReference = true;
		pos++;
	}
	if (parseReference) {
		if (typeof state.env.references === "undefined") return false;
		if (pos < max && state.src.charCodeAt(pos) === 91) {
			start = pos + 1;
			pos = parse_link_label_default(state, pos);
			if (pos >= 0) label = state.src.slice(start, pos++);
			else pos = labelEnd + 1;
		} else pos = labelEnd + 1;
		if (!label) label = state.src.slice(labelStart, labelEnd);
		ref = state.env.references[label && label.toLowerCase()];
		if (!ref) {
			state.pos = oldPos;
			return false;
		}
		href = ref.href;
		title = ref.title;
	}
	if (!silent) {
		state.pos = labelStart;
		state.posMax = labelEnd;
		const token_o = state.push("link_open", "a", 1);
		const attrs = [["href", href]];
		token_o.attrs = attrs;
		if (title) attrs.push(["title", title]);
		state.linkLevel++;
		state.md.inline.tokenize(state);
		state.linkLevel--;
		state.push("link_close", "a", -1);
	}
	state.pos = pos;
	state.posMax = max;
	return true;
}
var link_default = link;

//#endregion
//#region src/rules/inline/newline.ts
/**
* Inline rule: newline
* Process newlines
*/
function newline(state, silent) {
	const { pos, src, posMax } = state;
	if (src.charCodeAt(pos) !== 10) return false;
	const pmax = state.pending.length - 1;
	const max = posMax;
	if (!silent) if (pmax >= 0 && state.pending.charCodeAt(pmax) === 32) if (pmax >= 1 && state.pending.charCodeAt(pmax - 1) === 32) {
		let ws = pmax - 1;
		while (ws >= 1 && state.pending.charCodeAt(ws - 1) === 32) ws--;
		state.pending = state.pending.slice(0, ws);
		state.push("hardbreak", "br", 0);
	} else {
		state.pending = state.pending.slice(0, -1);
		state.push("softbreak", "br", 0);
	}
	else state.push("softbreak", "br", 0);
	state.pos++;
	while (state.pos < max && src.charCodeAt(state.pos) === 32) state.pos++;
	return true;
}
var newline_default = newline;

//#endregion
//#region src/rules/inline/text.ts
/**
* Inline rule: text
* Skip all tokens except for the text token
*/
const TEXT_RE = /^[^*_\\[\]`<!\n]+/;
function text(state, silent) {
	const { pos, src } = state;
	const match = src.slice(pos).match(TEXT_RE);
	if (!match) return false;
	if (!silent) state.pending += match[0];
	state.pos += match[0].length;
	return true;
}
var text_default = text;

//#endregion
//#region src/parse/parser_inline/ruler.ts
var InlineRuler = class {
	rules = [];
	/**
	* Push new rule to the end of chain
	*/
	push(name, fn, options) {
		this.rules.push({
			name,
			fn,
			alt: options?.alt || []
		});
	}
	/**
	* Get rules for specified chain name (or empty string for default)
	* Note: chainName is ignored for inline rules, always returns all rules
	*/
	getRules(_chainName) {
		return this.rules.map((rule) => rule.fn);
	}
	/**
	* Get rule by name
	*/
	at(name) {
		return this.rules.find((rule) => rule.name === name);
	}
};

//#endregion
//#region src/parse/parser_inline/state_inline.ts
/**
* StateInline - state object for inline parser
*/
var StateInline = class {
	src;
	md;
	env;
	outTokens;
	tokens;
	tokens_meta;
	pos;
	posMax;
	level;
	pending;
	pendingLevel;
	cache;
	delimiters;
	_prev_delimiters;
	backticks;
	backticksScanned;
	linkLevel;
	constructor(src, md, env, outTokens) {
		this.src = src;
		this.md = md;
		this.env = env;
		this.outTokens = outTokens;
		this.tokens = outTokens;
		this.tokens_meta = new Array(outTokens.length);
		this.pos = 0;
		this.posMax = src.length;
		this.level = 0;
		this.pending = "";
		this.pendingLevel = 0;
		this.cache = {};
		this.delimiters = [];
		this._prev_delimiters = [];
		this.backticks = {};
		this.backticksScanned = false;
		this.linkLevel = 0;
	}
	/**
	* Push pending text as a text token
	*/
	pushPending() {
		const token = {
			type: "text",
			content: this.pending,
			level: this.pendingLevel
		};
		this.tokens.push(token);
		this.tokens_meta.push(null);
		this.pending = "";
		return token;
	}
	/**
	* Push a new token to the output
	*/
	push(type, tag, nesting) {
		if (this.pending) this.pushPending();
		const token = {
			type,
			tag,
			level: this.level
		};
		let token_meta = null;
		if (nesting < 0) {
			this.level--;
			this.delimiters = this._prev_delimiters.pop() || [];
		}
		token.level = this.level;
		if (nesting > 0) {
			this.level++;
			this._prev_delimiters.push(this.delimiters);
			this.delimiters = [];
			token_meta = { delimiters: this.delimiters };
		}
		this.pendingLevel = this.level;
		this.tokens.push(token);
		this.tokens_meta.push(token_meta);
		return token;
	}
	/**
	* Scan delimiter run (for emphasis)
	*/
	scanDelims(start, canSplitWord) {
		const { src, posMax } = this;
		const marker = src.charCodeAt(start);
		let pos = start;
		let count = 0;
		while (pos < posMax && src.charCodeAt(pos) === marker) {
			count++;
			pos++;
		}
		if (count < 1) return null;
		const lastChar = start > 0 ? src.charCodeAt(start - 1) : 32;
		const nextChar = pos < posMax ? src.charCodeAt(pos) : 32;
		const isLastPunctChar = lastChar === 32 || lastChar === 10;
		const isNextPunctChar = nextChar === 32 || nextChar === 10;
		const isLastWhiteSpace = lastChar === 32;
		const isNextWhiteSpace = nextChar === 32;
		let can_open = true;
		let can_close = true;
		if (isNextWhiteSpace) can_open = false;
		else if (isNextPunctChar) {
			if (!(isLastWhiteSpace || isLastPunctChar)) can_open = false;
		}
		if (isLastWhiteSpace) can_close = false;
		else if (isLastPunctChar) {
			if (!(isNextWhiteSpace || isNextPunctChar)) can_close = false;
		}
		if (!canSplitWord) {
			can_open = can_open && (!isLastPunctChar || isLastWhiteSpace);
			can_close = can_close && (!isNextPunctChar || isNextWhiteSpace);
		}
		return {
			can_open,
			can_close,
			length: count
		};
	}
};

//#endregion
//#region src/parse/parser_inline/index.ts
/**
* ParserInline - inline parser with Ruler-based rule management
*/
var ParserInline = class {
	ruler;
	ruler2;
	constructor() {
		this.ruler = new InlineRuler();
		this.ruler2 = new InlineRuler();
		this.ruler.push("text", text_default);
		this.ruler.push("newline", newline_default);
		this.ruler.push("escape", escape_default);
		this.ruler.push("backticks", backticks_default);
		this.ruler.push("emphasis", emphasis.tokenize);
		this.ruler.push("link", link_default);
		this.ruler.push("image", image_default);
		this.ruler.push("autolink", autolink_default);
		this.ruler.push("html_inline", html_inline_default);
		this.ruler.push("entity", entity_default);
		this.ruler2.push("balance_pairs", balance_pairs_default);
		this.ruler2.push("emphasis", emphasis.postProcess);
		this.ruler2.push("fragments_join", fragments_join_default);
	}
	/**
	* Skip single token by running all rules in validation mode
	*/
	skipToken(state) {
		const pos = state.pos;
		const rules = this.ruler.getRules("");
		const len = rules.length;
		const posMax = state.posMax;
		const maxNesting = state.md?.options?.maxNesting || 100;
		if (typeof state.cache[pos] !== "undefined") {
			state.pos = state.cache[pos];
			return;
		}
		let ok = false;
		if (state.level < maxNesting) for (let i = 0; i < len; i++) {
			ok = rules[i](state, true);
			if (ok) break;
		}
		else state.pos = posMax;
		if (!ok) state.pos++;
		state.cache[pos] = state.pos;
	}
	/**
	* Generate tokens for input string
	*/
	tokenize(state) {
		const rules = this.ruler.getRules("");
		const len = rules.length;
		const end = state.posMax;
		const maxNesting = state.md?.options?.maxNesting || 100;
		while (state.pos < end) {
			const prevPos = state.pos;
			let ok = false;
			if (state.level < maxNesting) for (let i = 0; i < len; i++) {
				ok = rules[i](state, false);
				if (ok) {
					if (prevPos >= state.pos) throw new Error("inline rule didn't increment state.pos");
					break;
				}
			}
			if (ok) {
				if (state.pos >= end) break;
				continue;
			}
			state.pending += state.src[state.pos++];
		}
		if (state.pending) state.pushPending();
	}
	/**
	* ParserInline.parse(str, md, env, outTokens)
	*
	* Process input string and push inline tokens into `outTokens`.
	* Matches the signature from original markdown-it/lib/parser_inline.mjs
	*/
	parse(str, md, env, outTokens) {
		const state = new StateInline(str, md, env, outTokens);
		this.tokenize(state);
		const rules2 = this.ruler2.getRules("");
		const len = rules2.length;
		for (let i = 0; i < len; i++) rules2[i](state, false);
	}
};

//#endregion
//#region src/parse/state.ts
var State = class {
	src;
	env;
	tokens;
	inlineMode;
	md;
	constructor(src, env = {}) {
		this.src = src || "";
		this.env = env;
		this.tokens = [];
		this.inlineMode = false;
	}
};

//#endregion
//#region src/parse/parser_core.ts
const _rules = [
	["normalize", normalize],
	["block", block],
	["inline", inline],
	["linkify", linkify],
	["replacements", replacements],
	["smartquotes", smartquotes],
	["text_join", text_join]
];
var ParserCore = class {
	state;
	block;
	inline;
	ruler;
	constructor(src) {
		this.block = new ParserBlock();
		this.inline = new ParserInline();
		this.ruler = new CoreRuler();
		for (let i = 0; i < _rules.length; i++) this.ruler.push(_rules[i][0], _rules[i][1]);
		if (typeof src === "string") this.state = new State(src);
	}
	/**
	* Create a fresh State instance for given input.
	*/
	createState(src, env = {}) {
		return new State(src, env);
	}
	/**
	* Process tokens for the provided state. If state.inlineMode is true,
	* generate a single `inline` token from src and run inline parser only.
	*/
	process(state) {
		const extendedState = state;
		extendedState.md = {
			block: this.block,
			inline: this.inline,
			options: {
				html: true,
				xhtmlOut: false,
				breaks: false,
				langPrefix: "language-",
				linkify: false,
				typographer: false,
				quotes: "“”‘’",
				maxNesting: 100
			},
			helpers: {
				parseLinkLabel: () => ({
					ok: false,
					pos: 0
				}),
				parseLinkDestination: () => ({
					ok: false,
					str: "",
					pos: 0
				}),
				parseLinkTitle: () => ({
					ok: false,
					str: "",
					pos: 0,
					can_continue: false
				})
			},
			normalizeLink,
			normalizeLinkText,
			validateLink
		};
		const rules = this.ruler.getRules("");
		for (let i = 0; i < rules.length; i++) rules[i](extendedState);
	}
	/**
	* Convenience: parse src/env and return tokens.
	*/
	parse(src, env = {}) {
		if (typeof src === "string") {
			const state = this.createState(src, env);
			this.process(state);
			return state;
		}
		if (this.state) {
			this.process(this.state);
			return this.state;
		}
		throw new Error("No input provided to parse and no internal state available");
	}
	getTokens() {
		return this.state ? this.state.tokens : [];
	}
};

//#endregion
//#region src/parse/index.ts
/**
* High-level parse function returning token array. This is a small shim
* around `ParserCore` to make a tree-shakable public API.
*/
function parse(src, env = {}) {
	return new ParserCore().parse(src, env).tokens;
}

//#endregion
//#region src/render/utils.ts
/**
* Common utility functions for escaping HTML and unescaping entities
*/
const HTML_ESCAPE_TEST_RE = /[&<>"]/;
const HTML_ESCAPE_REPLACE_RE = /[&<>"]/g;
const HTML_REPLACEMENTS = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;"
};
function replaceUnsafeChar(ch) {
	return HTML_REPLACEMENTS[ch] || ch;
}
/**
* Escape HTML characters to prevent XSS
*/
function escapeHtml(str) {
	if (HTML_ESCAPE_TEST_RE.test(str)) return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar);
	return str;
}
const UNESCAPE_ALL_RE = new RegExp(`${/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g.source}|${/&([a-z#][a-z0-9]{1,31});/gi.source}`, "gi");
const DIGITAL_ENTITY_TEST_RE = /^#(?:x[a-f0-9]{1,8}|\d{1,8})$/i;
/**
* Unescape all backslash escapes and HTML entities
*/
function unescapeAll(str) {
	if (!str.includes("\\") && !str.includes("&")) return str;
	return str.replace(UNESCAPE_ALL_RE, (match, escaped, entity$1) => {
		if (escaped) return escaped;
		if (DIGITAL_ENTITY_TEST_RE.test(entity$1)) {
			const code$1 = entity$1[1].toLowerCase() === "x" ? Number.parseInt(entity$1.slice(2), 16) : Number.parseInt(entity$1.slice(1), 10);
			if (code$1 >= 55296 && code$1 <= 57343) return "�";
			if (code$1 >= 128 && code$1 <= 159) return "�";
			return String.fromCodePoint(code$1);
		}
		return match;
	});
}

//#endregion
//#region src/render/renderer.ts
var Renderer = class {
	options;
	constructor(options = {}) {
		this.options = {
			langPrefix: "language-",
			...options
		};
	}
	render(tokens, options = {}) {
		this.options = {
			...this.options,
			...options
		};
		let output = "";
		tokens.forEach((token) => {
			output += this.renderToken(token);
		});
		return output;
	}
	renderAttrs(token) {
		if (!token.attrs || token.attrs.length === 0) return "";
		return ` ${token.attrs.map(([name, value]) => `${escapeHtml(name)}="${escapeHtml(value)}"`).join(" ")}`;
	}
	renderToken(token) {
		switch (token.type) {
			case "paragraph_open": return "<p>";
			case "paragraph_close": return "</p>";
			case "paragraph":
				if (Array.isArray(token.children) && token.children.length > 0) return `<p>${this.renderInline(token.children)}</p>`;
				return `<p>${token.content}</p>`;
			case "heading": return `<h${token.level}>${token.content}</h${token.level}>`;
			case "inline": return this.renderInline(token.children || []);
			case "code_block": return `<pre${this.renderAttrs(token)}><code>${escapeHtml(token.content)}</code></pre>\n`;
			case "fence": return this.renderFence(token);
			case "code_inline": return `<code${this.renderAttrs(token)}>${escapeHtml(token.content)}</code>`;
			default: return "";
		}
	}
	attrIndex(token, name) {
		if (!token.attrs) return -1;
		for (let i = 0; i < token.attrs.length; i++) if (token.attrs[i][0] === name) return i;
		return -1;
	}
	renderFence(token) {
		const info = token.info ? unescapeAll(token.info).trim() : "";
		let langName = "";
		let langAttrs = "";
		if (info) {
			const arr = info.split(/(\s+)/g);
			langName = arr[0];
			langAttrs = arr.slice(2).join("");
		}
		let highlighted;
		if (this.options.highlight) highlighted = this.options.highlight(token.content, langName, langAttrs) || escapeHtml(token.content);
		else highlighted = escapeHtml(token.content);
		if (highlighted.indexOf("<pre") === 0) return `${highlighted}\n`;
		if (info) {
			const i = this.attrIndex(token, "class");
			const tmpAttrs = token.attrs ? token.attrs.slice() : [];
			if (i < 0) tmpAttrs.push(["class", (this.options.langPrefix || "language-") + langName]);
			else {
				tmpAttrs[i] = tmpAttrs[i].slice();
				tmpAttrs[i][1] += ` ${this.options.langPrefix || "language-"}${langName}`;
			}
			const tmpToken = {
				...token,
				attrs: tmpAttrs
			};
			return `<pre><code${this.renderAttrs(tmpToken)}>${highlighted}</code></pre>\n`;
		}
		return `<pre><code${this.renderAttrs(token)}>${highlighted}</code></pre>\n`;
	}
	renderInline(tokens = []) {
		return (tokens || []).map((token) => {
			switch (token.type) {
				case "text": return token.content;
				case "strong_open": return "<strong>";
				case "strong_close": return "</strong>";
				case "em_open": return "<em>";
				case "em_close": return "</em>";
				case "code_inline": return `<code${this.renderAttrs(token)}>${escapeHtml(token.content)}</code>`;
				default: return "";
			}
		}).join("");
	}
};
var renderer_default = Renderer;

//#endregion
//#region src/render/index.ts
/**
* Render tokens to HTML string using the Renderer class.
* This small wrapper allows importing just the render functionality.
*/
function render(tokens, options = {}, _env = {}) {
	if (!Array.isArray(tokens)) throw new TypeError("render expects token array as first argument");
	return new renderer_default(options).render(tokens, options);
}

//#endregion
export { parse, render };
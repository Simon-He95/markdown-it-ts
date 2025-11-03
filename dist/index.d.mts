//#region src/types/index.d.ts

interface Token {
  type: string;
  tag?: string;
  attrs?: [string, string][];
  map?: number[];
  nesting?: number;
  level: number;
  children?: Token[];
  content: string;
  markup?: string;
  info?: string;
  hidden?: boolean;
}
type RendererOptions = {
  langPrefix?: string;
  highlight?: (str: string, lang: string, attrs: string) => string;
};
//#endregion
//#region src/parse/index.d.ts
/**
 * High-level parse function returning token array. This is a small shim
 * around `ParserCore` to make a tree-shakable public API.
 */
declare function parse(src: string, env?: Record<string, unknown>): Token[];
//#endregion
//#region src/render/index.d.ts
/**
 * Render tokens to HTML string using the Renderer class.
 * This small wrapper allows importing just the render functionality.
 */
declare function render(tokens: Token[], options?: RendererOptions, _env?: Record<string, unknown>): string;
//#endregion
export { parse, render };
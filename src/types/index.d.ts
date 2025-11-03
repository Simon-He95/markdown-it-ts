// src/types/index.d.ts

export interface MarkdownItOptions {
  html?: boolean;
  xhtmlOut?: boolean;
  breaks?: boolean;
  langPrefix?: string;
  linkify?: boolean;
  typographer?: boolean;
  quotes?: string | string[];
  highlight?: (str: string, lang: string) => string;
}

export interface Token {
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

export interface State {
  src: string;
  env: Record<string, unknown>;
  tokens: Token[];
  inlineMode?: boolean;
}

export interface Rule {
  name: string;
  validate?: (state: State) => boolean | void;
  parse?: (state: State) => void;
}

export type RendererOptions = {
  langPrefix?: string
  highlight?: (str: string, lang: string, attrs: string) => string
}

export interface MarkdownIt {
  parse(src: string, env?: Record<string, unknown>): Token[];
  render(src: string, env?: Record<string, unknown>): string;
  renderInline(src: string, env?: Record<string, unknown>): string;
  set(options: MarkdownItOptions): this;
  enable(list: string | string[], ignoreInvalid?: boolean): this;
  disable(list: string | string[], ignoreInvalid?: boolean): this;
  use(plugin: (md: MarkdownIt, ...params: any[]) => void, ...params: any[]): this;
  validateLink(url: string): boolean;
  normalizeLink(url: string): string;
  normalizeLinkText(url: string): string;
}

export type MarkdownItPreset = 'default' | 'commonmark' | 'zero';

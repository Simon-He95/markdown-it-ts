// src/types/index.d.ts

export interface MarkdownItOptions {
  html?: boolean;
  xhtmlOut?: boolean;
  breaks?: boolean;
  langPrefix?: string;
  linkify?: boolean;
  typographer?: boolean;
  quotes?: string | string[];
  highlight?: ((str: string, lang: string, attrs: string) => string) | null;
  stream?: boolean;
}

// Token is now a class exported from src/common/token.ts
// This re-export maintains compatibility
export { Token } from '../common/token'

export interface State {
  src: string;
  env: Record<string, unknown>;
  tokens: Token[];
}

export interface Rule {
  name: string;
  validate?: (state: State) => boolean | void;
  parse?: (state: State) => void;
}

export interface StreamStats {
  total: number;
  cacheHits: number;
  appendHits: number;
  fullParses: number;
  resets: number;
  lastMode: 'idle' | 'cache' | 'append' | 'full' | 'reset';
}

export type RendererOptions = {
  langPrefix?: string;
  highlight?: ((str: string, lang: string, attrs: string) => string) | null;
  xhtmlOut?: boolean;
  breaks?: boolean;
}

export type MarkdownItPluginFn = (md: MarkdownIt, ...params: any[]) => void;
export type MarkdownItPluginModule = { default: MarkdownItPluginFn };
export type MarkdownItPlugin = MarkdownItPluginFn | MarkdownItPluginModule;

export interface MarkdownIt {
  parse(src: string, env?: Record<string, unknown>): Token[];
  render(src: string, env?: Record<string, unknown>): string;
  renderInline(src: string, env?: Record<string, unknown>): string;
  set(options: MarkdownItOptions): this;
  enable(list: string | string[], ignoreInvalid?: boolean): this;
  disable(list: string | string[], ignoreInvalid?: boolean): this;
  use(plugin: MarkdownItPlugin, ...params: any[]): this;
  validateLink(url: string): boolean;
  normalizeLink(url: string): string;
  normalizeLinkText(url: string): string;
  renderer: import('../render/renderer').Renderer;
  stream: {
    enabled: boolean;
    parse(src: string, env?: Record<string, unknown>): Token[];
    reset(): void;
    peek(): Token[];
    stats(): StreamStats;
    resetStats(): void;
  };
}

export type MarkdownItPreset = 'default' | 'commonmark' | 'zero';

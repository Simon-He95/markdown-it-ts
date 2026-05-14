// src/types/index.d.ts
// Compatibility layer: re-export public types from runtime source to avoid drift.

export type {
  MarkdownItExperimentalOptions,
  MarkdownItOptions,
  RendererOptions,
  MarkdownItPlugin,
  MarkdownItPluginFn,
  MarkdownItPluginModule,
  MarkdownIt,
} from '../index'

export type { Token } from '../common/token'
export type MarkdownItPreset = 'default' | 'commonmark' | 'zero'

// Minimal State and Rule interfaces kept for compatibility with older helpers
export interface State {
  src: string
  env: Record<string, unknown>
  tokens: import('../common/token').Token[]
}

export interface Rule {
  name: string
  validate?: (state: State) => boolean | void
  parse?: (state: State) => void
}

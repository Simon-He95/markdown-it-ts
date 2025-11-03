import type { MarkdownItOptions } from '../types/index.d'

const zeroPreset: MarkdownItOptions = {
  html: false,
  xhtmlOut: false,
  breaks: false,
  langPrefix: 'language-',
  linkify: false,
  typographer: false,
}

export default zeroPreset

import {
  FEATURE_MIXED_CORPUS,
  makeFeatureMixedDocument,
  makeStockSubsetParts,
} from './perf-corpora.mjs'

function repeatSections(targetChars, makeSection) {
  let output = ''
  let index = 0
  while (output.length < targetChars)
    output += makeSection(index++)
  return output
}

export const FEATURE_STRESS_CORPORA = [
  {
    id: 'plain-text',
    label: 'Long multiline plain-text paragraphs',
    description: 'Long paragraphs with line continuations and no inline Markdown markers.',
    expectedParsePath: 'plain',
    expectedRenderPath: 'token-renderer',
    makeDocument: targetChars => repeatSections(targetChars, index => `Plain paragraph ${index} contains ordinary prose with deliberately long lines for scanner throughput.\nThe continuation line keeps this outside the single-line stock subset while remaining plain text.\n\n`),
  },
  {
    id: 'inline-formatting',
    label: 'Emphasis, strong, and inline code',
    description: 'Dense emphasis, strong text, combined delimiters, escapes, and inline code.',
    expectedParsePath: 'plain',
    expectedRenderPath: 'token-renderer',
    makeDocument: targetChars => repeatSections(targetChars, index => `Paragraph ${index} has *emphasis ${index}*, **strong ${index}**, ***combined ${index}***, \`inline code ${index}\`, and \\*escaped ${index}\\*.\n\n`),
  },
  {
    id: 'links-media-autolinks',
    label: 'Links, images, and autolinks',
    description: 'Inline links, images, angle-bracket autolinks, and varied destinations.',
    expectedParsePath: 'plain',
    expectedRenderPath: 'token-renderer',
    makeDocument: targetChars => repeatSections(targetChars, index => `Paragraph ${index}: [link ${index}](https://example.com/path/${index}?q=${index}) ![image ${index}](https://example.com/image-${index}.png) <https://example.org/auto/${index}>.\n\n`),
  },
  {
    id: 'nested-blocks',
    label: 'Nested lists and blockquotes',
    description: 'Ordered lists, nested bullet lists, and formatted blockquotes.',
    expectedParsePath: 'plain',
    expectedRenderPath: 'token-renderer',
    makeDocument: targetChars => repeatSections(targetChars, index => `> Quote ${index}\n>\n> - quoted item ${index}\n>   - nested quote item ${index}\n\n1. Ordered item ${index}\n   - nested bullet ${index}\n     - deep bullet ${index}\n2. Ordered item ${index + 1}\n\n`),
  },
  {
    id: 'tables-strikethrough',
    label: 'Tables and strikethrough',
    description: 'GFM tables with alignment plus strikethrough inline content.',
    expectedParsePath: 'plain',
    expectedRenderPath: 'token-renderer',
    makeDocument: targetChars => repeatSections(targetChars, index => `| Feature | Value | State |\n|:--|--:|:--:|\n| row ${index} | ${index} | ~~old~~ new |\n| row ${index + 1} | ${index + 1} | active |\n\n`),
  },
  {
    id: 'fenced-code',
    label: 'Tilde fenced code',
    description: 'Varied tilde fences and info strings that intentionally bypass stock-fast.',
    expectedParsePath: 'plain',
    expectedRenderPath: 'token-renderer',
    makeDocument: targetChars => repeatSections(targetChars, index => `~~~ts title=section-${index}\nconst section${index} = ${index}\nconsole.log(section${index})\n~~~\n\n`),
  },
  {
    ...FEATURE_MIXED_CORPUS,
    makeDocument: makeFeatureMixedDocument,
  },
]

export function makeUniqueStockSubsetDocument(targetChars) {
  return repeatSections(targetChars, index => `## Unique section ${index}\n\nUnique paragraph ${index} carries varied plain content number ${index}.\n\n- item ${index} alpha\n- item ${index} beta\n- item ${index} gamma\n\n\`\`\`js\nconsole.log(${index})\n\`\`\`\n\n`)
}

export const STOCK_BOUNDARY_CORPORA = [
  {
    id: 'stock-repeated',
    label: 'Stock subset, repeated content',
    description: 'The existing high-repetition specialized stock corpus.',
    expectedParsePath: 'stock-fast',
    expectedRenderPath: 'stock-fast',
    makeDocument: targetChars => makeStockSubsetParts(targetChars).join(''),
  },
  {
    id: 'stock-unique',
    label: 'Stock subset, unique content',
    description: 'Supported stock blocks with paragraph and list content varied per section.',
    expectedParsePath: 'stock-fast',
    expectedRenderPath: 'stock-fast',
    makeDocument: makeUniqueStockSubsetDocument,
  },
  {
    id: 'stock-near-miss',
    label: 'Stock subset with a late unsupported construct',
    description: 'A stock-shaped document with inline emphasis appended near the end to measure late fallback cost.',
    expectedParsePath: 'plain',
    expectedRenderPath: 'token-renderer',
    makeDocument(targetChars) {
      const prefix = makeStockSubsetParts(Math.max(0, targetChars - 80)).join('')
      return `${prefix}Late fallback uses **strong text** after the stock-shaped prefix.\n`
    },
  },
]

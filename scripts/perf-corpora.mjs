export const STOCK_SUBSET_CORPUS = {
  id: 'stock-subset',
  label: 'Synthetic stock subset',
  kind: 'synthetic-specialized',
  description: 'ATX headings, plain single-line paragraphs, flat tight bullet lists, and fenced code blocks.',
  repetition: 'Paragraph text and flat list source repeat intentionally; headings and fenced code vary by section.',
  expectedParsePath: 'stock-fast',
  expectedRenderPath: 'stock-fast',
}

export const FEATURE_MIXED_CORPUS = {
  id: 'feature-mixed',
  label: 'Synthetic feature-mixed',
  kind: 'synthetic-feature-stress',
  description: 'A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.',
  repetition: 'Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.',
  expectedParsePath: 'plain',
  expectedRenderPath: 'token-renderer',
}

export const REAL_WORLD_CORPUS_FILES = [
  {
    id: 'real-world-architecture',
    label: 'docs/architecture.md',
    path: 'docs/architecture.md',
    kind: 'real-world',
    provenance: 'Documentation authored and distributed in this MIT-licensed repository.',
  },
  {
    id: 'real-world-development',
    label: 'docs/development.md',
    path: 'docs/development.md',
    kind: 'real-world',
    provenance: 'Documentation authored and distributed in this MIT-licensed repository.',
  },
  {
    id: 'real-world-security',
    label: 'docs/security.md',
    path: 'docs/security.md',
    kind: 'real-world',
    provenance: 'Documentation authored and distributed in this MIT-licensed repository.',
  },
]

export function stockSubsetParagraph(index) {
  return `## Section ${index}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${index})\n\`\`\`\n\n`
}

export function makeStockSubsetParts(targetChars) {
  const parts = []
  let length = 0
  let index = 0
  while (length < targetChars) {
    const part = stockSubsetParagraph(index++)
    parts.push(part)
    length += part.length
  }
  return parts
}

export function featureMixedSection(index) {
  return `## Feature section ${index}\n\nParagraph ${index} uses *emphasis*, **strong text**, [a link](https://example.com/${index}), ![image ${index}](https://example.com/${index}.png), \`inline code ${index}\`, and an escaped \\*literal marker\\*.\n\n> A blockquote for section ${index} with **formatting**.\n>\n> - quoted item ${index}\n> - another quoted item ${index + 1}\n\n1. Ordered item ${index}\n   - nested bullet ${index}\n   - nested bullet ${index + 1}\n2. Ordered item ${index + 1}\n\n- Parent item ${index}\n  - Child item ${index}\n    - Deep item ${index}\n\n| Feature | Value |\n|:--|--:|\n| section | ${index} |\n| enabled | yes |\n\n~~Removed ${index}~~ and retained text.\n\n---\n\n\`\`\`ts\nconst section${index} = ${index}\nconsole.log(section${index})\n\`\`\`\n\n`
}

export function makeFeatureMixedDocument(targetChars) {
  let output = ''
  let index = 0
  while (output.length < targetChars)
    output += featureMixedSection(index++)
  return output
}

export function firstDifference(left, right, excerptRadius = 60) {
  if (left === right) {
    return {
      equal: true,
      firstDifferenceIndex: null,
      leftLength: left.length,
      rightLength: right.length,
      leftExcerpt: '',
      rightExcerpt: '',
    }
  }

  const sharedLength = Math.min(left.length, right.length)
  let index = 0
  while (index < sharedLength && left.charCodeAt(index) === right.charCodeAt(index))
    index++

  const start = Math.max(0, index - excerptRadius)
  const endLeft = Math.min(left.length, index + excerptRadius)
  const endRight = Math.min(right.length, index + excerptRadius)
  return {
    equal: false,
    firstDifferenceIndex: index,
    leftLength: left.length,
    rightLength: right.length,
    leftExcerpt: left.slice(start, endLeft),
    rightExcerpt: right.slice(start, endRight),
  }
}

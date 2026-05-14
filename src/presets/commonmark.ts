// Preset data for CommonMark — kept as a plain object for now.
const commonmark = {
  options: {
    html: true,
    xhtmlOut: true,
    breaks: false,
    langPrefix: 'language-',
    linkify: false,
    typographer: false,
    quotes: '\u201C\u201D\u2018\u2019',
    highlight: null,
    maxNesting: 20,
  },
  components: {
    core: {
      rules: [
        'normalize',
        'block',
        'inline',
        'text_join',
      ],
    },
    block: {
      rules: [
        'blockquote',
        'code',
        'fence',
        'heading',
        'hr',
        'html_block',
        'lheading',
        'list',
        'reference',
        'paragraph',
      ],
    },
    inline: {
      rules: [
        'autolink',
        'backticks',
        'emphasis',
        'entity',
        'escape',
        'html_inline',
        'image',
        'link',
        'newline',
        'text',
      ],
    },
    inline2: {
      rules: [
        'balance_pairs',
        'emphasis',
        'fragments_join',
      ],
    },
  },
}

export default commonmark

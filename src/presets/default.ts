const defaultPreset = {
  options: {
    html: false,
    xhtmlOut: false,
    breaks: false,
    langPrefix: 'language-',
    linkify: false,
    typographer: false,
    quotes: '“”‘’',
    highlight: null,
  },
  components: {
    core: {
      rules: ['inline', 'block'],
    },
    block: {
      rules: ['paragraph', 'heading', 'fenced_code'],
    },
    inline: {
      rules: ['emphasis', 'strong', 'link'],
    },
  },
}

export default defaultPreset

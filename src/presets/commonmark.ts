// Preset data for CommonMark — kept as a plain object for now.
const commonmark = {
  options: {
    html: false,
    xhtmlOut: false,
    breaks: false,
    langPrefix: 'language-',
    linkify: false,
    typographer: false,
  },
  components: {
    core: {
      rules: [
        // Add core rules specific to CommonMark here
      ],
    },
    block: {
      rules: [
        // Add block rules specific to CommonMark here
      ],
    },
    inline: {
      rules: [
        // Add inline rules specific to CommonMark here
      ],
    },
  },
}

export default commonmark

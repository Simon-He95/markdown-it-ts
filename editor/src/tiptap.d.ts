import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emojiPalette: {
      insertEmoji: (nameOrGlyph: string) => ReturnType
    }
    calloutQuote: {
      setCalloutQuote: (attrs?: { text?: string, author?: string }) => ReturnType
    }
    video: {
      setVideo: (attrs: { src: string, title?: string }) => ReturnType
    }
  }
}

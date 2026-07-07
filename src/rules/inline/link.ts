import { normalizeReference } from '../../common/utils'
import parseLinkDestination from '../../helpers/parse_link_destination'
/**
 * Inline rule: link [text](url "title") and [text][ref]
 */
import parseLinkLabel from '../../helpers/parse_link_label'
import parseLinkTitle from '../../helpers/parse_link_title'

// Fast path: skip whitespace inline
function skipSpaces(src: string, pos: number, max: number): number {
  while (pos < max) {
    const code = src.charCodeAt(pos)
    if (code !== 0x20 && code !== 0x0A)
      break
    pos++
  }
  return pos
}

export function link(state: any, silent?: boolean): boolean {
  // Early bailout - check first char without variable allocation
  if (state.src.charCodeAt(state.pos) !== 0x5B /* [ */)
    return false

  const src = state.src
  const oldPos = state.pos
  const max = state.posMax
  const labelStart = state.pos + 1
  const labelEnd = parseLinkLabel(state, state.pos, true)
  
  if (labelEnd < 0)
    return false

  let pos = labelEnd + 1
  let href = ''
  let title = ''
  let parseReference = true

  // Try inline link syntax [text](url "title")
  if (pos < max && src.charCodeAt(pos) === 0x28 /* ( */) {
    pos = skipSpaces(src, pos + 1, max)
    
    // Try to parse destination
    const destRes = parseLinkDestination(src, pos, max)
    if (destRes.ok) {
      const normalized = state.md.normalizeLink(destRes.str)
      if (state.md.validateLink(normalized)) {
        href = normalized
        pos = destRes.pos
        parseReference = false
      }
    }
    else if (pos < max && src.charCodeAt(pos) === 0x29 /* ) */) {
      // Empty destination is valid: [link]()
      href = ''
      parseReference = false
    }
    
    // Continue if we have a valid inline link so far
    if (!parseReference) {
      // Skip spaces before title
      pos = skipSpaces(src, pos, max)
      
      // Try to parse title
      if (pos < max && src.charCodeAt(pos) !== 0x29 /* ) */) {
        const titleRes = parseLinkTitle(src, pos, max)
        if (titleRes.ok) {
          title = titleRes.str
          pos = skipSpaces(src, titleRes.pos, max)
        }
      }
      
      // Validate closing paren
      if (pos < max && src.charCodeAt(pos) === 0x29 /* ) */) {
        pos++
      }
      else {
        parseReference = true
      }
    }
  }
  
  // Reference link syntax [text][ref] or [text]
  if (parseReference) {
    if (typeof state.env.references === 'undefined')
      return false
    
    let label: string
    
    // Reset pos to after label
    pos = labelEnd + 1
    
    // Explicit reference [text][ref] or [text][]
    if (pos < max && src.charCodeAt(pos) === 0x5B /* [ */) {
      const refStart = pos + 1
      const refEnd = parseLinkLabel(state, pos)
      if (refEnd >= 0) {
        label = src.slice(refStart, refEnd)
        // Empty reference [text][] means use same label as text
        if (!label)
          label = src.slice(labelStart, labelEnd)
        pos = refEnd + 1
      }
      else {
        // parseLinkLabel failed completely
        label = src.slice(labelStart, labelEnd)
        // Don't update pos since parseLinkLabel failed
      }
    }
    else {
      // Implicit reference [text]
      label = src.slice(labelStart, labelEnd)
    }
    
    const ref = state.env.references[normalizeReference(label)]
    if (!ref) {
      state.pos = oldPos
      return false
    }
    
    href = ref.href
    title = ref.title
  }
  
  // Generate tokens
  if (!silent) {
    state.pos = labelStart
    state.posMax = labelEnd
    
    const token_o = state.push('link_open', 'a', 1)
    token_o.attrs = title ? [['href', href], ['title', title]] : [['href', href]]
    
    state.linkLevel++
    state.md.inline.tokenize(state)
    state.linkLevel--
    
    state.push('link_close', 'a', -1)
  }
  
  state.pos = pos
  state.posMax = max
  return true
}

export default link

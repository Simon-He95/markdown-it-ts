/**
 * Task List Plugin for markdown-it-ts
 *
 * Renders GitHub Flavored Markdown (GFM) style task lists:
 *   - [ ] Unchecked item
 *   - [x] Checked item
 *   - [X] Also checked
 *
 * @example
 * ```typescript
 * import markdownIt from 'markdown-it-ts'
 * import { taskListPlugin } from 'markdown-it-ts/plugins/task-lists'
 *
 * const md = markdownIt().use(taskListPlugin)
 * const html = md.render('- [x] Done\n- [ ] Todo')
 * ```
 */

import type { MarkdownIt } from '../index'
import type { Token } from '../common/token'

export interface TaskListOptions {
  /**
   * CSS class for the containing <ul> element
   * @default 'task-list'
   */
  listClass?: string

  /**
   * CSS class for list items containing checkboxes
   * @default 'task-list-item'
   */
  itemClass?: string

  /**
   * CSS class for the checkbox input element
   * @default 'task-list-checkbox'
   */
  checkboxClass?: string

  /**
   * Render checkboxes as disabled (non-interactive)
   * @default true
   */
  disabled?: boolean

  /**
   * Use divs instead of native checkbox inputs (for SSR compatibility)
   * @default false
   */
  divCheckbox?: boolean
}

const defaultOptions: Required<TaskListOptions> = {
  listClass: 'task-list',
  itemClass: 'task-list-item',
  checkboxClass: 'task-list-checkbox',
  disabled: true,
  divCheckbox: false,
}

// Pattern to match task list markers at start of list item content
// Matches: [ ] or [x] or [X] followed by at least one space
const TASK_PATTERN = /^\[([ xX])\]\s+/

/**
 * Task list plugin for markdown-it-ts
 *
 * Transforms list items starting with `[ ]` or `[x]` into checkbox inputs.
 */
export function taskListPlugin(md: MarkdownIt, options: TaskListOptions = {}): void {
  const opts: Required<TaskListOptions> = { ...defaultOptions, ...options }

  // Add a core rule to transform task list items after inline parsing
  md.core.ruler.after('inline', 'task_lists', (state) => {
    const tokens = state.tokens

    // Track which list tokens contain task items (by token index)
    const taskListIndices = new Set<number>()

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      // Look for list_item_open tokens
      if (token.type !== 'list_item_open') continue

      // Find the inline content within this list item
      // Structure: list_item_open -> paragraph_open -> inline -> paragraph_close -> list_item_close
      // Or: list_item_open -> inline (tight list) -> list_item_close
      let inlineToken: Token | null = null

      for (let j = i + 1; j < tokens.length; j++) {
        const t = tokens[j]
        if (t.type === 'list_item_close') break
        if (t.type === 'inline' && t.content) {
          inlineToken = t
          break
        }
      }

      if (!inlineToken) continue

      // Check if content starts with task marker
      const match = inlineToken.content.match(TASK_PATTERN)
      if (!match) continue

      const isChecked = match[1].toLowerCase() === 'x'

      // Remove the task marker from the inline content
      inlineToken.content = inlineToken.content.slice(match[0].length)

      // Also update children if they exist (the parsed inline tokens)
      if (inlineToken.children && inlineToken.children.length > 0) {
        const firstChild = inlineToken.children[0]
        if (firstChild.type === 'text' && firstChild.content) {
          const childMatch = firstChild.content.match(TASK_PATTERN)
          if (childMatch) {
            firstChild.content = firstChild.content.slice(childMatch[0].length)
          }
        }
      }

      // Add class to list_item_open token
      token.attrJoin('class', opts.itemClass)

      // Create checkbox token and insert at beginning of inline children
      const TokenConstructor = (state as any).Token
      const checkboxToken = new TokenConstructor('html_inline', '', 0) as Token

      if (opts.divCheckbox) {
        // SSR-friendly div-based checkbox
        const checkedClass = isChecked ? ' checked' : ''
        checkboxToken.content = `<span class="${opts.checkboxClass}${checkedClass}" aria-checked="${isChecked}"></span> `
      } else {
        // Native checkbox input
        const disabledAttr = opts.disabled ? ' disabled' : ''
        const checkedAttr = isChecked ? ' checked' : ''
        checkboxToken.content = `<input type="checkbox" class="${opts.checkboxClass}"${checkedAttr}${disabledAttr}> `
      }

      if (inlineToken.children) {
        inlineToken.children.unshift(checkboxToken)
      } else {
        inlineToken.children = [checkboxToken]
      }

      // Find the parent list and mark it as a task list
      for (let k = i - 1; k >= 0; k--) {
        const t = tokens[k]
        if (t.type === 'bullet_list_open' || t.type === 'ordered_list_open') {
          taskListIndices.add(k)
          break
        }
      }
    }

    // Add task-list class to all containing lists
    for (const idx of taskListIndices) {
      tokens[idx].attrJoin('class', opts.listClass)
    }
  })
}

export default taskListPlugin


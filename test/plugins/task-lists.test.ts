import { describe, it, expect } from 'vitest'
import markdownIt from '../../src/index'
import { taskListPlugin } from '../../src/plugins/task-lists'

describe('taskListPlugin', () => {
  const md = markdownIt().use(taskListPlugin)

  describe('basic task lists', () => {
    it('should render unchecked items', () => {
      const result = md.render('- [ ] Todo item')
      expect(result).toContain('<input type="checkbox"')
      expect(result).toContain('class="task-list-checkbox"')
      expect(result).not.toContain('checked')
      expect(result).toContain('disabled')
      expect(result).toContain('Todo item')
    })

    it('should render checked items with lowercase x', () => {
      const result = md.render('- [x] Done item')
      expect(result).toContain('<input type="checkbox"')
      expect(result).toContain('checked')
      expect(result).toContain('Done item')
    })

    it('should render checked items with uppercase X', () => {
      const result = md.render('- [X] Also done')
      expect(result).toContain('checked')
      expect(result).toContain('Also done')
    })

    it('should add task-list class to the list', () => {
      const result = md.render('- [x] Item')
      expect(result).toContain('class="task-list"')
    })

    it('should add task-list-item class to list items', () => {
      const result = md.render('- [ ] Item')
      expect(result).toContain('class="task-list-item"')
    })
  })

  describe('mixed lists', () => {
    it('should handle mixed checked/unchecked items', () => {
      const result = md.render(`- [x] Done
- [ ] Todo
- [X] Also done`)
      expect(result.match(/checked/g)?.length).toBe(2)
      expect(result).toContain('Done')
      expect(result).toContain('Todo')
      expect(result).toContain('Also done')
    })

    it('should handle task items mixed with regular items', () => {
      const result = md.render(`- [x] Task item
- Regular item
- [ ] Another task`)
      // Regular items should not have checkbox
      expect(result.match(/<input type="checkbox"/g)?.length).toBe(2)
    })
  })

  describe('ordered lists', () => {
    it('should work with ordered lists', () => {
      const result = md.render(`1. [x] First
2. [ ] Second`)
      expect(result).toContain('<ol')
      expect(result).toContain('checked')
      expect(result).toContain('First')
      expect(result).toContain('Second')
    })
  })

  describe('nested lists', () => {
    it('should handle nested task lists', () => {
      const result = md.render(`- [x] Parent
  - [ ] Child
  - [x] Another child`)
      expect(result.match(/<input type="checkbox"/g)?.length).toBe(3)
    })
  })

  describe('options', () => {
    it('should allow custom classes', () => {
      const customMd = markdownIt().use(taskListPlugin, {
        listClass: 'my-list',
        itemClass: 'my-item',
        checkboxClass: 'my-checkbox',
      })
      const result = customMd.render('- [x] Item')
      expect(result).toContain('class="my-list"')
      expect(result).toContain('class="my-item"')
      expect(result).toContain('class="my-checkbox"')
    })

    it('should allow enabled checkboxes', () => {
      const customMd = markdownIt().use(taskListPlugin, { disabled: false })
      const result = customMd.render('- [x] Item')
      expect(result).not.toContain('disabled')
    })

    it('should support div-based checkboxes', () => {
      const customMd = markdownIt().use(taskListPlugin, { divCheckbox: true })
      const result = customMd.render('- [x] Item')
      expect(result).toContain('<span class="task-list-checkbox checked"')
      expect(result).toContain('aria-checked="true"')
      expect(result).not.toContain('<input')
    })
  })

  describe('edge cases', () => {
    it('should not match items without space after bracket', () => {
      const result = md.render('- [x]No space')
      expect(result).not.toContain('<input type="checkbox"')
    })

    it('should not match items with wrong format', () => {
      const result = md.render('- [xx] Double x')
      expect(result).not.toContain('<input type="checkbox"')
    })

    it('should handle task item with minimal text', () => {
      const result = md.render('- [x] .')
      expect(result).toContain('<input type="checkbox"')
      expect(result).toContain('checked')
    })

    it('should not match when only whitespace follows checkbox', () => {
      // Edge case: trailing whitespace gets trimmed by markdown-it
      const result = md.render('- [x] ')
      // This becomes just "[x]" after trimming, which doesn't match the pattern
      expect(result).not.toContain('<input type="checkbox"')
    })

    it('should preserve inline formatting in task items', () => {
      const result = md.render('- [x] **Bold** and *italic*')
      expect(result).toContain('<strong>Bold</strong>')
      expect(result).toContain('<em>italic</em>')
    })

    it('should preserve links in task items', () => {
      const result = md.render('- [ ] Check [this](http://example.com)')
      expect(result).toContain('<a href="http://example.com"')
    })
  })
})


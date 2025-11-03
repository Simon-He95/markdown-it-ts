import { parse, render } from './src/index'

console.log('Testing inline rules implementation:\n')

// Test 1: Basic text
const test1 = render(parse('Hello world'))
console.log('1. Basic text:', test1.trim())

// Test 2: Emphasis
const test2 = render(parse('Hello *world* from markdown-it-ts'))
console.log('2. Emphasis:', test2.trim())

// Test 3: Strong
const test3 = render(parse('Hello **world** test'))
console.log('3. Strong:', test3.trim())

// Test 4: Inline code (backticks)
const test4 = render(parse('Use `console.log()` to print'))
console.log('4. Inline code:', test4.trim())

// Test 5: Escape
const test5 = render(parse('Use \\* to escape asterisk'))
console.log('5. Escape:', test5.trim())

// Test 6: Autolink
const test6 = render(parse('Visit <https://example.com> for more'))
console.log('6. Autolink:', test6.trim())

// Test 7: Entity
const test7 = render(parse('Use &amp; for ampersand'))
console.log('7. Entity:', test7.trim())

// Test 8: HTML inline
const test8 = render(parse('Use <em>html</em> tags'))
console.log('8. HTML inline:', test8.trim())

console.log('\n✓ All inline rules tested')

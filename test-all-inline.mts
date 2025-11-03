import { parse, render } from './src/index'

console.log('Testing link and image inline rules:\n')

// Test 1: Simple link
const test1 = render(parse('[GitHub](https://github.com)'))
console.log('1. Simple link:')
console.log(test1.trim())
console.log()

// Test 2: Link with title
const test2 = render(parse('[GitHub](https://github.com "Visit GitHub")'))
console.log('2. Link with title:')
console.log(test2.trim())
console.log()

// Test 3: Simple image
const test3 = render(parse('![Alt text](https://example.com/image.png)'))
console.log('3. Simple image:')
console.log(test3.trim())
console.log()

// Test 4: Image with title
const test4 = render(parse('![Alt text](https://example.com/image.png "Image title")'))
console.log('4. Image with title:')
console.log(test4.trim())
console.log()

// Test 5: Inline code
const test5 = render(parse('Use `console.log()` to print'))
console.log('5. Inline code:')
console.log(test5.trim())
console.log()

// Test 6: Emphasis and strong
const test6 = render(parse('This is *italic* and **bold** text'))
console.log('6. Emphasis and strong:')
console.log(test6.trim())
console.log()

// Test 7: Autolink
const test7 = render(parse('Visit <https://example.com> for more'))
console.log('7. Autolink:')
console.log(test7.trim())
console.log()

// Test 8: Mixed inline elements
const test8 = render(parse('Check [this **link**](https://example.com) with `code` and *emphasis*'))
console.log('8. Mixed inline elements:')
console.log(test8.trim())
console.log()

console.log('✓ All inline rules tested')

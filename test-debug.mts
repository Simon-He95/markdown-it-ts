import { parse } from './src/parse'
import { render } from './src/render'

console.log('🔍 Debug Test\n')

// Test 1: Simple text
console.log('Test 1: Simple paragraph')
const tokens1 = parse('Hello world')
console.log('Tokens:', JSON.stringify(tokens1, null, 2))
console.log()

// Test 2: With emphasis
console.log('Test 2: With emphasis')
const tokens2 = parse('Hello *world*')
console.log('Tokens:', JSON.stringify(tokens2, null, 2))
console.log()

// Test 3: Render
console.log('Test 3: Render simple paragraph')
try {
  const html = render(tokens1)
  console.log('HTML:', html)
}
catch (error) {
  console.error('Render error:', error)
}
console.log()

// Test 4: Render with emphasis
console.log('Test 4: Render with emphasis')
try {
  const html = render(tokens2)
  console.log('HTML:', html)
}
catch (error) {
  console.error('Render error:', error)
}

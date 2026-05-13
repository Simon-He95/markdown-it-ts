# Security Policy

## Markdown rendering and sanitization

`markdown-it-ts` is a Markdown parser and renderer. It is not an HTML sanitizer.

By default, raw HTML is disabled. If you enable raw HTML with:

```ts
const md = MarkdownIt({ html: true })
```

you must sanitize the rendered HTML before injecting it into a browser DOM, especially when rendering untrusted user input.

Recommended pattern:

```ts
const html = md.render(userMarkdown)
const safeHtml = sanitize(html)
```

Use a sanitizer appropriate for your runtime and security model.

## Plugins

Plugins can add new parsing and rendering behavior. Treat plugins as trusted code. A plugin may introduce unsafe HTML, unsafe attributes, DOM clobbering, or protocol-handling behavior.

## Reporting vulnerabilities

Please report security issues privately through GitHub Security Advisories or by contacting the maintainer.

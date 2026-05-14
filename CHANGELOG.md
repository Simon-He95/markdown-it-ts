# Changelog

## 1.0.0

### Breaking Changes

- Removed experimental stream, chunk, editable, and strategy helpers from root named exports.
- Import large-input helpers from `markdown-it-ts/experimental` or explicit subpaths instead of `markdown-it-ts`.
- Corresponding experimental type-only root exports moved to `markdown-it-ts/experimental` or documented subpaths.
- `markdown-it-ts` is ESM-only and requires Node.js >= 18.
- `withRenderer` remains available as an advanced helper from the root entry and `markdown-it-ts/plugins/with-renderer`.

### Migration

| 0.x import | 1.0 import |
| --- | --- |
| `import { StreamBuffer } from 'markdown-it-ts'` | `import { StreamBuffer } from 'markdown-it-ts/experimental'` or `markdown-it-ts/stream/buffer` |
| `import { chunkedParse } from 'markdown-it-ts'` | `import { chunkedParse } from 'markdown-it-ts/experimental'` or `markdown-it-ts/stream/chunked` |
| `import { recommendFullChunkStrategy } from 'markdown-it-ts'` | `import { recommendFullChunkStrategy } from 'markdown-it-ts/support/chunk_recommend'` |
| `import { UnboundedBuffer } from 'markdown-it-ts'` | `import { UnboundedBuffer } from 'markdown-it-ts/experimental'` |
| `import type { StreamStats } from 'markdown-it-ts'` | `import type { StreamStats } from 'markdown-it-ts/experimental'` |

### Validation

- Added type smoke tests for plugin authoring and root export boundaries.
- Added packed-package and bundler smoke coverage for the published export map.
- Hardened release publishing so tags must match the package version and the tested tarball is published.

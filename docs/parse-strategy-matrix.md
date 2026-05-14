# Parse Strategy Matrix

This matrix captures the recommended default parser strategy by input size and workload.

| Size | Default one-shot | Best default-eligible one-shot | Default append | Best default-eligible append |
|---:|:--|:--|:--|:--|
| 100,000 | full-default (3.3600ms) | full-default (3.3600ms) | stream-default (4.8536ms) | stream-default (4.8536ms) |
| 500,000 | full-default (24.60ms) | full-auto (23.88ms) | stream-default (30.28ms) | stream-default (30.28ms) |
| 1,000,000 | full-default (52.39ms) | full-20k-12 (46.34ms) | stream-default (64.05ms) | stream-default (64.05ms) |
| 5,000,000 | full-default (288.48ms) | full-auto (256.84ms) | stream-default (388.18ms) | stream-default (388.18ms) |
| 20,000,000 | full-default (998.70ms) | full-default (998.70ms) | stream-default (3920.46ms) | stream-32k-16 (3758.66ms) |

## Notes

- One-shot `md.parse(src)` should stay within 10% of the best default-eligible full-parse strategy.
- Append-heavy `md.stream.parse(src)` should stay within 10% of the best default-eligible stream strategy.
- `iterable-*` and `unbounded-* sink` remain advanced baselines and are not treated as required default paths.
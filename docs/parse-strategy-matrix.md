# Parse Strategy Matrix

This matrix captures the recommended default parser strategy by input size and workload.

| Size | Default one-shot | Best default-eligible one-shot | Default append | Best default-eligible append |
|---:|:--|:--|:--|:--|
| 100,000 | full-default (4.0953ms) | full-default (4.0953ms) | stream-default (5.7955ms) | stream-default (5.7955ms) |
| 500,000 | full-default (29.03ms) | full-default (29.03ms) | stream-default (32.37ms) | stream-default (32.37ms) |
| 1,000,000 | full-default (57.94ms) | full-64k-16 (56.37ms) | stream-default (65.60ms) | stream-default (65.60ms) |
| 5,000,000 | full-default (290.97ms) | full-default (290.97ms) | stream-default (385.01ms) | stream-default (385.01ms) |
| 20,000,000 | full-default (1151.20ms) | full-default (1151.20ms) | stream-default (4546.08ms) | stream-32k-16 (4359.07ms) |

## Notes

- One-shot `md.parse(src)` should stay within 10% of the best default-eligible full-parse strategy.
- Append-heavy `md.stream.parse(src)` should stay within 10% of the best default-eligible stream strategy.
- `iterable-*` and `unbounded-* sink` remain advanced baselines and are not treated as required default paths.
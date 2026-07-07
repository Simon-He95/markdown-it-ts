# Parser Family Hotspots

Lower ratio is better. Hotspots come from internal parser rule profiling (`core/block/inline/inline2`).

| Fixture | TS ms | markdown-it ms | Ratio | Top hotspot |
|:--|---:|---:|---:|:--|
| plain_text | 0.5955 | 0.4991 | 1.193 | core.block (0.571ms) |
| entity | 1.7084 | 1.5067 | 1.134 | core.inline (13.2062ms) |
| reference_list | 2.8073 | 2.5367 | 1.107 | core.block (14.9772ms) |
| html_inline | 2.5873 | 2.3970 | 1.079 | core.inline (17.6765ms) |
| blockquote_flat | 1.0828 | 1.0111 | 1.071 | core.block (4.9174ms) |
| lheading | 2.7910 | 2.6093 | 1.070 | core.inline (48.0984ms) |
| blockquote_nested | 1.3514 | 1.2683 | 1.066 | block.blockquote (30.9063ms) |
| hr | 2.2776 | 2.2083 | 1.031 | core.block (7.4473ms) |
| autolink | 2.2532 | 2.2164 | 1.017 | core.inline (10.05ms) |
| code_block | 0.5123 | 0.5188 | 0.988 | core.block (0.4975ms) |
| emphasis_worst | 2.5320 | 2.5754 | 0.983 | core.inline (16.5684ms) |
| heading | 2.4539 | 2.5136 | 0.976 | core.inline (29.4845ms) |
| emphasis_nested | 3.0134 | 3.1039 | 0.971 | core.inline (18.1657ms) |
| links_flat | 2.3602 | 2.4352 | 0.969 | core.inline (9.5849ms) |
| escape | 2.6919 | 2.7871 | 0.966 | core.inline (24.7191ms) |
| list_nested | 3.0672 | 3.2699 | 0.938 | block.list (61.9528ms) |
| list_flat | 2.4347 | 2.6351 | 0.924 | core.block (18.1434ms) |
| emphasis_flat | 3.5388 | 3.8297 | 0.924 | core.inline (26.8217ms) |
| table | 2.0894 | 2.3576 | 0.886 | core.inline (7.128ms) |
| backticks | 1.5717 | 1.8005 | 0.873 | core.inline (8.9858ms) |
| fence | 0.6242 | 0.7358 | 0.848 | core.block (1.1118ms) |
| reference_flat | 4.8300 | 7.3799 | 0.654 | core.inline (31.2142ms) |
| reference_nested | 5.3679 | 8.7786 | 0.611 | core.inline (89.4252ms) |
| newline | 1.8559 | 3.1492 | 0.589 | core.inline (9.3367ms) |
| links_nested | 7.4242 | 23.4884 | 0.316 | inline.link (127.3671ms) |

## Detail

### plain_text

- Input chars: 41679
- markdown-it-ts: 0.5955ms
- markdown-it: 0.4991ms
- Ratio: 1.193

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.5710 | 0.571000 | 0.571000 |
| core | inline | 1 | 1 | 0.4068 | 0.406792 | 0.406792 |
| inline | text | 143 | 99 | 0.1393 | 0.000208 | 0.004750 |
| block | reference | 77 | 11 | 0.0795 | 0.000166 | 0.013167 |
| inline | link | 22 | 22 | 0.0496 | 0.002667 | 0.005709 |
| block | paragraph | 66 | 66 | 0.0174 | 0.000250 | 0.001250 |
| block | lheading | 66 | 0 | 0.0117 | 0.000166 | 0.000917 |
| inline | emphasis | 44 | 22 | 0.0093 | 0.000145 | 0.001333 |

### entity

- Input chars: 40016
- markdown-it-ts: 1.7084ms
- markdown-it: 1.5067ms
- Ratio: 1.134

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 13.2062 | 13.206208 | 13.206208 |
| core | block | 1 | 1 | 2.6736 | 2.673625 | 2.673625 |
| inline | entity | 2562 | 1464 | 0.7304 | 0.000250 | 0.008000 |
| inline | text | 5001 | 2318 | 0.5760 | 0.000084 | 0.003541 |
| inline | newline | 2683 | 121 | 0.2489 | 0.000083 | 0.002375 |
| inline | linkify | 2683 | 0 | 0.2298 | 0.000083 | 0.000791 |
| inline | link | 2562 | 0 | 0.2281 | 0.000083 | 0.008958 |
| inline | html_inline | 2562 | 0 | 0.2215 | 0.000083 | 0.001709 |

### reference_list

- Input chars: 40664
- markdown-it-ts: 2.8073ms
- markdown-it: 2.5367ms
- Ratio: 1.107

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 14.9772 | 14.977250 | 14.977250 |
| block | reference | 2600 | 2600 | 9.0185 | 0.003458 | 0.042000 |
| block | blockquote | 5199 | 0 | 0.5185 | 0.000083 | 0.052875 |
| block | table | 5199 | 0 | 0.4839 | 0.000083 | 0.001542 |
| block | hr | 5199 | 0 | 0.4770 | 0.000083 | 0.007958 |
| block | list | 5199 | 0 | 0.4769 | 0.000083 | 0.000792 |
| block | fence | 5199 | 0 | 0.4675 | 0.000083 | 0.000792 |
| block | html_block | 2599 | 0 | 0.2761 | 0.000084 | 0.006833 |

### html_inline

- Input chars: 40248
- markdown-it-ts: 2.5873ms
- markdown-it: 2.3970ms
- Ratio: 1.079

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 17.6765 | 17.676542 | 17.676542 |
| core | block | 1 | 1 | 6.5321 | 6.532125 | 6.532125 |
| inline | text | 5927 | 2106 | 0.6974 | 0.000084 | 0.011541 |
| inline | html_inline | 3432 | 1014 | 0.5987 | 0.000125 | 0.012167 |
| block | paragraph | 1249 | 1249 | 0.5136 | 0.000250 | 0.003917 |
| inline | autolink | 3432 | 0 | 0.4972 | 0.000125 | 0.001625 |
| block | html_block | 1639 | 234 | 0.4192 | 0.000250 | 0.030125 |
| block | lheading | 1249 | 0 | 0.3941 | 0.000167 | 0.007500 |

### blockquote_flat

- Input chars: 40016
- markdown-it-ts: 1.0828ms
- markdown-it: 1.0111ms
- Ratio: 1.071

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 4.9174 | 4.917417 | 4.917417 |
| block | blockquote | 1149 | 165 | 3.5204 | 0.000208 | 0.084917 |
| core | inline | 1 | 1 | 2.8935 | 2.893459 | 2.893459 |
| inline | text | 2788 | 1476 | 0.3599 | 0.000125 | 0.001541 |
| block | paragraph | 328 | 328 | 0.2005 | 0.000666 | 0.005625 |
| inline | newline | 1312 | 1148 | 0.1497 | 0.000125 | 0.001375 |
| block | hr | 984 | 0 | 0.1316 | 0.000125 | 0.023208 |
| block | fence | 1149 | 0 | 0.1282 | 0.000125 | 0.000916 |

### lheading

- Input chars: 40002
- markdown-it-ts: 2.7910ms
- markdown-it: 2.6093ms
- Ratio: 1.070

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 48.0984 | 48.098416 | 48.098416 |
| core | block | 1 | 1 | 2.6908 | 2.690833 | 2.690833 |
| inline | text | 14158 | 1061 | 1.2609 | 0.000083 | 0.015833 |
| inline | newline | 13097 | 707 | 1.1782 | 0.000083 | 0.005792 |
| inline | linkify | 13097 | 0 | 1.1288 | 0.000083 | 0.005584 |
| inline | html_inline | 12390 | 0 | 1.0688 | 0.000083 | 0.007209 |
| inline | autolink | 12390 | 0 | 1.0364 | 0.000083 | 0.022708 |
| inline | image | 12390 | 0 | 1.0287 | 0.000083 | 0.014583 |

### blockquote_nested

- Input chars: 40115
- markdown-it-ts: 1.3514ms
- markdown-it: 1.2683ms
- Ratio: 1.066

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | blockquote | 4188 | 1814 | 30.9063 | 0.000083 | 0.127709 |
| core | block | 1 | 1 | 8.3812 | 8.381167 | 8.381167 |
| core | inline | 1 | 1 | 1.2313 | 1.231250 | 1.231250 |
| block | paragraph | 679 | 679 | 0.7535 | 0.001167 | 0.006583 |
| block | lheading | 679 | 0 | 0.6689 | 0.001083 | 0.005875 |
| block | fence | 4188 | 0 | 0.3379 | 0.000083 | 0.000375 |
| block | table | 2493 | 0 | 0.2157 | 0.000083 | 0.003417 |
| block | html_block | 2374 | 0 | 0.2053 | 0.000083 | 0.000459 |

### hr

- Input chars: 40044
- markdown-it-ts: 2.2776ms
- markdown-it: 2.2083ms
- Ratio: 1.031

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 7.4473 | 7.447292 | 7.447292 |
| core | inline | 1 | 1 | 3.1821 | 3.182125 | 3.182125 |
| block | lheading | 564 | 0 | 1.2490 | 0.002083 | 0.028667 |
| block | paragraph | 564 | 564 | 1.1373 | 0.001875 | 0.027375 |
| block | hr | 3382 | 2818 | 0.7425 | 0.000208 | 0.051125 |
| inline | emphasis | 564 | 564 | 0.4531 | 0.000750 | 0.003208 |
| block | table | 3382 | 0 | 0.3193 | 0.000083 | 0.000917 |
| block | blockquote | 3382 | 0 | 0.3041 | 0.000083 | 0.000917 |

### autolink

- Input chars: 40104
- markdown-it-ts: 2.2532ms
- markdown-it: 2.2164ms
- Ratio: 1.017

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 10.0500 | 10.050000 | 10.050000 |
| core | block | 1 | 1 | 3.2860 | 3.286042 | 3.286042 |
| inline | autolink | 1872 | 288 | 1.4514 | 0.000084 | 0.057917 |
| block | paragraph | 217 | 217 | 1.1719 | 0.006750 | 0.017917 |
| block | lheading | 217 | 0 | 1.1255 | 0.006542 | 0.016750 |
| inline | text | 3959 | 1512 | 0.5108 | 0.000084 | 0.012375 |
| inline | newline | 2447 | 575 | 0.2609 | 0.000084 | 0.001041 |
| inline | linkify | 2447 | 0 | 0.2115 | 0.000083 | 0.000625 |

### code_block

- Input chars: 40020
- markdown-it-ts: 0.5123ms
- markdown-it: 0.5188ms
- Ratio: 0.988

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.4975 | 0.497542 | 0.497542 |
| block | code | 1 | 1 | 0.1736 | 0.173583 | 0.173583 |
| core | normalize | 1 | 1 | 0.0028 | 0.002792 | 0.002792 |
| core | inline | 1 | 1 | 0.0009 | 0.000917 | 0.000917 |
| core | smartquotes | 1 | 1 | 0.0004 | 0.000417 | 0.000417 |
| core | linkify | 1 | 1 | 0.0004 | 0.000375 | 0.000375 |
| block | table | 1 | 0 | 0.0003 | 0.000333 | 0.000333 |
| core | replacements | 1 | 1 | 0.0003 | 0.000292 | 0.000292 |

### emphasis_worst

- Input chars: 40136
- markdown-it-ts: 2.5320ms
- markdown-it: 2.5754ms
- Ratio: 0.983

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 16.5684 | 16.568417 | 16.568417 |
| core | block | 1 | 1 | 3.4338 | 3.433833 | 3.433833 |
| inline | text | 11367 | 5568 | 1.2560 | 0.000084 | 0.009709 |
| inline | emphasis | 5568 | 5568 | 1.0966 | 0.000167 | 0.007333 |
| block | paragraph | 465 | 465 | 0.8076 | 0.001500 | 0.032083 |
| block | lheading | 465 | 0 | 0.7304 | 0.001291 | 0.005666 |
| inline | newline | 5799 | 231 | 0.5068 | 0.000083 | 0.004667 |
| inline | linkify | 5799 | 0 | 0.5015 | 0.000083 | 0.001709 |

### heading

- Input chars: 40098
- markdown-it-ts: 2.4539ms
- markdown-it: 2.5136ms
- Ratio: 0.976

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 29.4845 | 29.484458 | 29.484458 |
| core | block | 1 | 1 | 13.7965 | 13.796541 | 13.796541 |
| block | heading | 2932 | 2606 | 1.7133 | 0.000208 | 1.135167 |
| block | paragraph | 326 | 326 | 1.2872 | 0.003583 | 0.026875 |
| block | lheading | 326 | 0 | 1.2680 | 0.003417 | 0.053708 |
| block | reference | 2282 | 0 | 1.0963 | 0.000375 | 0.047375 |
| inline | text | 7824 | 652 | 0.8319 | 0.000084 | 0.006167 |
| inline | escape | 7172 | 1630 | 0.8107 | 0.000125 | 0.014291 |

### emphasis_nested

- Input chars: 40145
- markdown-it-ts: 3.0134ms
- markdown-it: 3.1039ms
- Ratio: 0.971

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 18.1657 | 18.165666 | 18.165666 |
| core | block | 1 | 1 | 3.5108 | 3.510833 | 3.510833 |
| inline | text | 11913 | 5439 | 1.2585 | 0.000084 | 0.006125 |
| inline | emphasis | 6216 | 6216 | 1.2301 | 0.000167 | 0.007084 |
| block | paragraph | 519 | 519 | 0.7459 | 0.001375 | 0.013834 |
| block | lheading | 519 | 0 | 0.6654 | 0.001000 | 0.014083 |
| inline | linkify | 6474 | 0 | 0.5620 | 0.000083 | 0.007333 |
| inline | newline | 6474 | 258 | 0.5478 | 0.000083 | 0.000542 |

### links_flat

- Input chars: 40712
- markdown-it-ts: 2.3602ms
- markdown-it: 2.4352ms
- Ratio: 0.969

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.5849 | 9.584875 | 9.584875 |
| inline | link | 1120 | 280 | 3.8613 | 0.000125 | 1.443542 |
| core | block | 1 | 1 | 2.0837 | 2.083666 | 2.083666 |
| inline | image | 840 | 168 | 0.4705 | 0.000083 | 0.028917 |
| inline | text | 3359 | 952 | 0.4158 | 0.000084 | 0.001375 |
| inline | newline | 2407 | 391 | 0.2280 | 0.000083 | 0.001458 |
| inline | linkify | 2407 | 0 | 0.2094 | 0.000083 | 0.000959 |
| inline | escape | 2016 | 896 | 0.1996 | 0.000083 | 0.005750 |

### escape

- Input chars: 40077
- markdown-it-ts: 2.6919ms
- markdown-it: 2.7871ms
- Ratio: 0.966

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 24.7191 | 24.719125 | 24.719125 |
| core | block | 1 | 1 | 3.8772 | 3.877208 | 3.877208 |
| inline | text | 20804 | 4380 | 1.8460 | 0.000083 | 0.003084 |
| inline | escape | 15768 | 15549 | 1.7121 | 0.000084 | 0.016167 |
| inline | linkify | 16424 | 0 | 1.4163 | 0.000083 | 0.010459 |
| inline | newline | 16424 | 656 | 1.3828 | 0.000083 | 0.008875 |
| core | text_join | 1 | 1 | 0.4121 | 0.412083 | 0.412083 |
| block | paragraph | 877 | 877 | 0.3000 | 0.000291 | 0.008042 |

### list_nested

- Input chars: 40215
- markdown-it-ts: 3.0672ms
- markdown-it: 3.2699ms
- Ratio: 0.938

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | list | 8189 | 5459 | 61.9528 | 0.000125 | 0.173333 |
| core | block | 1 | 1 | 24.3872 | 24.387167 | 24.387167 |
| block | paragraph | 2100 | 2100 | 5.2046 | 0.002167 | 0.056666 |
| block | lheading | 2100 | 0 | 4.8217 | 0.002083 | 0.016875 |
| core | inline | 1 | 1 | 3.5517 | 3.551666 | 3.551666 |
| block | hr | 9448 | 0 | 1.0145 | 0.000125 | 0.009000 |
| block | fence | 9448 | 0 | 0.9462 | 0.000084 | 0.037792 |
| block | blockquote | 9448 | 0 | 0.8921 | 0.000084 | 0.001083 |

### list_flat

- Input chars: 40248
- markdown-it-ts: 2.4347ms
- markdown-it: 2.6351ms
- Ratio: 0.924

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 18.1434 | 18.143375 | 18.143375 |
| block | list | 5227 | 2887 | 16.5541 | 0.000125 | 0.178458 |
| block | paragraph | 2340 | 2340 | 2.4619 | 0.000375 | 0.042000 |
| block | lheading | 2340 | 0 | 2.2208 | 0.000209 | 0.047166 |
| block | hr | 7956 | 156 | 0.7723 | 0.000083 | 0.006083 |
| block | fence | 7956 | 0 | 0.6934 | 0.000083 | 0.030041 |
| block | blockquote | 7956 | 0 | 0.6782 | 0.000083 | 0.031333 |
| core | inline | 1 | 1 | 0.6743 | 0.674291 | 0.674291 |

### emphasis_flat

- Input chars: 40145
- markdown-it-ts: 3.5388ms
- markdown-it: 3.8297ms
- Ratio: 0.924

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 26.8217 | 26.821708 | 26.821708 |
| core | block | 1 | 1 | 3.5504 | 3.550375 | 3.550375 |
| inline | text | 18129 | 8547 | 1.8768 | 0.000084 | 0.016791 |
| inline | emphasis | 9324 | 9324 | 1.7191 | 0.000167 | 0.027500 |
| inline | linkify | 9582 | 0 | 0.8609 | 0.000083 | 0.017750 |
| inline | strikethrough | 9324 | 0 | 0.8381 | 0.000083 | 0.024250 |
| inline | newline | 9582 | 258 | 0.8064 | 0.000083 | 0.006125 |
| inline | escape | 9324 | 0 | 0.7692 | 0.000083 | 0.004917 |

### table

- Input chars: 40132
- markdown-it-ts: 2.0894ms
- markdown-it: 2.3576ms
- Ratio: 0.886

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 7.1280 | 7.128042 | 7.128042 |
| core | block | 1 | 1 | 4.7153 | 4.715292 | 4.715292 |
| block | table | 317 | 238 | 4.3231 | 0.011250 | 0.073208 |
| inline | text | 1641 | 79 | 0.1579 | 0.000083 | 0.008125 |
| inline | emphasis | 1562 | 158 | 0.1511 | 0.000083 | 0.004125 |
| inline | linkify | 1562 | 0 | 0.1354 | 0.000083 | 0.000750 |
| inline | newline | 1562 | 0 | 0.1319 | 0.000083 | 0.004916 |
| inline | strikethrough | 1562 | 0 | 0.1250 | 0.000083 | 0.000500 |

### backticks

- Input chars: 40000
- markdown-it-ts: 1.5717ms
- markdown-it: 1.8005ms
- Ratio: 0.873

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 8.9858 | 8.985792 | 8.985792 |
| core | block | 1 | 1 | 5.5186 | 5.518583 | 5.518583 |
| block | paragraph | 626 | 626 | 1.5589 | 0.002417 | 0.021042 |
| block | lheading | 626 | 0 | 1.5112 | 0.002292 | 0.013834 |
| inline | text | 6874 | 2500 | 0.6950 | 0.000084 | 0.008500 |
| inline | backticks | 3750 | 3750 | 0.6930 | 0.000167 | 0.023709 |
| inline | linkify | 4374 | 0 | 0.3884 | 0.000083 | 0.007667 |
| inline | newline | 4374 | 624 | 0.3830 | 0.000083 | 0.004875 |

### fence

- Input chars: 40020
- markdown-it-ts: 0.6242ms
- markdown-it: 0.7358ms
- Ratio: 0.848

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 1.1118 | 1.111750 | 1.111750 |
| block | fence | 580 | 580 | 0.3504 | 0.000500 | 0.033625 |
| block | table | 580 | 0 | 0.0506 | 0.000083 | 0.001166 |
| block | code | 580 | 0 | 0.0468 | 0.000083 | 0.000417 |
| core | inline | 1 | 1 | 0.0037 | 0.003708 | 0.003708 |
| core | normalize | 1 | 1 | 0.0029 | 0.002875 | 0.002875 |
| core | text_join | 1 | 1 | 0.0017 | 0.001667 | 0.001667 |
| core | linkify | 1 | 1 | 0.0010 | 0.001041 | 0.001041 |

### reference_flat

- Input chars: 40290
- markdown-it-ts: 4.8300ms
- markdown-it: 7.3799ms
- Ratio: 0.654

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 31.2142 | 31.214250 | 31.214250 |
| core | block | 1 | 1 | 5.3945 | 5.394458 | 5.394458 |
| inline | link | 5950 | 595 | 4.5232 | 0.000417 | 0.819042 |
| block | reference | 596 | 340 | 3.0403 | 0.003416 | 0.116125 |
| inline | text | 7479 | 1360 | 0.8388 | 0.000084 | 0.001334 |
| inline | newline | 6119 | 169 | 0.7170 | 0.000125 | 0.025958 |
| inline | linkify | 6119 | 0 | 0.6658 | 0.000125 | 0.000708 |
| inline | strikethrough | 5950 | 0 | 0.6246 | 0.000084 | 0.001917 |

### reference_nested

- Input chars: 40092
- markdown-it-ts: 5.3679ms
- markdown-it: 8.7786ms
- Ratio: 0.611

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 89.4252 | 89.425250 | 89.425250 |
| core | block | 1 | 1 | 3.0781 | 3.078084 | 3.078084 |
| inline | text | 29171 | 4056 | 2.8853 | 0.000084 | 0.016958 |
| inline | link | 19032 | 0 | 2.5041 | 0.000125 | 0.037750 |
| inline | emphasis | 23400 | 4368 | 2.3357 | 0.000083 | 0.004792 |
| inline | newline | 25115 | 1715 | 2.2455 | 0.000083 | 0.025875 |
| inline | linkify | 25115 | 0 | 2.1645 | 0.000083 | 0.010000 |
| inline | strikethrough | 23400 | 0 | 2.0080 | 0.000083 | 0.067458 |

### newline

- Input chars: 40068
- markdown-it-ts: 1.8559ms
- markdown-it: 3.1492ms
- Ratio: 0.589

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.3367 | 9.336708 | 9.336708 |
| core | block | 1 | 1 | 3.0839 | 3.083916 | 3.083916 |
| inline | text | 12083 | 6360 | 1.2361 | 0.000084 | 0.002708 |
| inline | newline | 5723 | 4133 | 0.6343 | 0.000125 | 0.004375 |
| inline | linkify | 5723 | 0 | 0.4954 | 0.000083 | 0.001625 |
| block | paragraph | 637 | 637 | 0.3978 | 0.000666 | 0.003625 |
| core | text_join | 1 | 1 | 0.1920 | 0.191958 | 0.191958 |
| inline | escape | 1590 | 1590 | 0.1873 | 0.000125 | 0.001583 |

### links_nested

- Input chars: 40064
- markdown-it-ts: 7.4242ms
- markdown-it: 23.4884ms
- Ratio: 0.316

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| inline | link | 26240 | 512 | 127.3671 | 0.000084 | 0.341875 |
| core | inline | 1 | 1 | 109.7033 | 109.703291 | 109.703291 |
| core | block | 1 | 1 | 4.0691 | 4.069083 | 4.069083 |
| inline | text | 33023 | 6656 | 3.0996 | 0.000083 | 0.017541 |
| inline | linkify | 26367 | 0 | 2.3168 | 0.000083 | 0.015041 |
| inline | newline | 26367 | 127 | 2.3047 | 0.000083 | 0.019875 |
| inline | html_inline | 25728 | 0 | 2.2929 | 0.000083 | 0.015208 |
| inline | image | 25728 | 0 | 2.2626 | 0.000083 | 0.011583 |


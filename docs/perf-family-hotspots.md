# Parser Family Hotspots

Lower ratio is better. Hotspots come from internal parser rule profiling (`core/block/inline/inline2`).

| Fixture | TS ms | markdown-it ms | Ratio | Top hotspot |
|:--|---:|---:|---:|:--|
| entity | 1.5976 | 1.4955 | 1.068 | core.inline (11.9323ms) |
| reference_list | 2.6416 | 2.4947 | 1.059 | core.block (14.217ms) |
| html_inline | 2.4142 | 2.2894 | 1.055 | core.inline (16.289ms) |
| blockquote_flat | 1.0337 | 1.0182 | 1.015 | core.block (4.4548ms) |
| heading | 2.4760 | 2.4467 | 1.012 | core.inline (28.4224ms) |
| links_flat | 2.3457 | 2.3412 | 1.002 | core.inline (10.7494ms) |
| autolink | 2.1261 | 2.1232 | 1.001 | core.inline (9.4674ms) |
| hr | 2.1434 | 2.1694 | 0.988 | core.block (7.1197ms) |
| plain_text | 0.9373 | 0.9595 | 0.977 | core.block (0.4839ms) |
| lheading | 2.5205 | 2.6132 | 0.965 | core.inline (45.8743ms) |
| table | 2.1054 | 2.2349 | 0.942 | core.inline (7.1462ms) |
| escape | 2.5608 | 2.7419 | 0.934 | core.inline (23.5855ms) |
| list_flat | 2.3291 | 2.5017 | 0.931 | core.block (16.8561ms) |
| emphasis_nested | 2.8087 | 3.0830 | 0.911 | core.inline (18.0933ms) |
| list_nested | 2.8791 | 3.2111 | 0.897 | block.list (51.907ms) |
| blockquote_nested | 1.1539 | 1.2901 | 0.894 | block.blockquote (29.6098ms) |
| emphasis_worst | 2.3144 | 2.6630 | 0.869 | core.inline (17.0678ms) |
| emphasis_flat | 3.4103 | 3.9715 | 0.859 | core.inline (26.7139ms) |
| backticks | 1.5225 | 1.7875 | 0.852 | core.block (12.7283ms) |
| code_block | 0.3895 | 0.5286 | 0.737 | core.block (0.3927ms) |
| newline | 2.3131 | 3.3060 | 0.700 | core.inline (9.4745ms) |
| fence | 0.4788 | 0.7403 | 0.647 | core.block (0.9219ms) |
| reference_flat | 4.6328 | 7.1630 | 0.647 | core.inline (29.4272ms) |
| reference_nested | 5.1104 | 8.5495 | 0.598 | core.inline (85.5379ms) |
| links_nested | 7.0778 | 23.0743 | 0.307 | inline.link (120.8252ms) |

## Detail

### entity

- Input chars: 40016
- markdown-it-ts: 1.5976ms
- markdown-it: 1.4955ms
- Ratio: 1.068

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 11.9323 | 11.932291 | 11.932291 |
| core | block | 1 | 1 | 2.4423 | 2.442334 | 2.442334 |
| inline | entity | 2562 | 1464 | 0.7023 | 0.000250 | 0.004917 |
| inline | text | 5001 | 2318 | 0.5514 | 0.000084 | 0.001208 |
| inline | newline | 2683 | 121 | 0.2405 | 0.000083 | 0.001292 |
| inline | strikethrough | 2562 | 0 | 0.2344 | 0.000083 | 0.017833 |
| inline | linkify | 2683 | 0 | 0.2292 | 0.000083 | 0.000625 |
| inline | emphasis | 2562 | 0 | 0.2205 | 0.000083 | 0.000666 |

### reference_list

- Input chars: 40664
- markdown-it-ts: 2.6416ms
- markdown-it: 2.4947ms
- Ratio: 1.059

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 14.2170 | 14.217041 | 14.217041 |
| block | reference | 2600 | 2600 | 8.8886 | 0.003334 | 0.047375 |
| block | table | 5199 | 0 | 0.4957 | 0.000084 | 0.001083 |
| block | list | 5199 | 0 | 0.4882 | 0.000083 | 0.000625 |
| block | fence | 5199 | 0 | 0.4749 | 0.000083 | 0.000292 |
| block | hr | 5199 | 0 | 0.4744 | 0.000083 | 0.000375 |
| block | blockquote | 5199 | 0 | 0.4742 | 0.000083 | 0.000542 |
| block | html_block | 2599 | 0 | 0.2949 | 0.000125 | 0.000666 |

### html_inline

- Input chars: 40248
- markdown-it-ts: 2.4142ms
- markdown-it: 2.2894ms
- Ratio: 1.055

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 16.2890 | 16.289000 | 16.289000 |
| core | block | 1 | 1 | 5.9906 | 5.990625 | 5.990625 |
| inline | text | 5927 | 2106 | 0.6300 | 0.000084 | 0.001292 |
| inline | html_inline | 3432 | 1014 | 0.5533 | 0.000125 | 0.002125 |
| block | paragraph | 1249 | 1249 | 0.5281 | 0.000250 | 0.006084 |
| inline | autolink | 3432 | 0 | 0.4841 | 0.000125 | 0.005083 |
| block | html_block | 1639 | 234 | 0.4092 | 0.000250 | 0.011125 |
| block | lheading | 1249 | 0 | 0.3753 | 0.000167 | 0.004625 |

### blockquote_flat

- Input chars: 40016
- markdown-it-ts: 1.0337ms
- markdown-it: 1.0182ms
- Ratio: 1.015

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 4.4548 | 4.454833 | 4.454833 |
| block | blockquote | 1149 | 165 | 3.2749 | 0.000208 | 0.079334 |
| core | inline | 1 | 1 | 3.1553 | 3.155250 | 3.155250 |
| inline | text | 2788 | 1476 | 0.4059 | 0.000125 | 0.047209 |
| block | paragraph | 328 | 328 | 0.1733 | 0.000645 | 0.004750 |
| inline | newline | 1312 | 1148 | 0.1483 | 0.000125 | 0.000917 |
| block | list | 984 | 0 | 0.1451 | 0.000125 | 0.036375 |
| block | hr | 984 | 0 | 0.1322 | 0.000125 | 0.023666 |

### heading

- Input chars: 40098
- markdown-it-ts: 2.4760ms
- markdown-it: 2.4467ms
- Ratio: 1.012

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 28.4224 | 28.422417 | 28.422417 |
| core | block | 1 | 1 | 13.7728 | 13.772792 | 13.772792 |
| block | reference | 2282 | 0 | 1.9526 | 0.000375 | 0.910625 |
| block | lheading | 326 | 0 | 1.4700 | 0.003417 | 0.168125 |
| block | paragraph | 326 | 326 | 1.3433 | 0.003584 | 0.043583 |
| inline | text | 7824 | 652 | 0.8328 | 0.000084 | 0.010959 |
| inline | escape | 7172 | 1630 | 0.7894 | 0.000125 | 0.001667 |
| inline | linkify | 7172 | 0 | 0.7523 | 0.000084 | 0.000708 |

### links_flat

- Input chars: 40712
- markdown-it-ts: 2.3457ms
- markdown-it: 2.3412ms
- Ratio: 1.002

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 10.7494 | 10.749417 | 10.749417 |
| inline | link | 1400 | 168 | 2.2135 | 0.000084 | 0.029125 |
| core | block | 1 | 1 | 1.8627 | 1.862667 | 1.862667 |
| inline | text | 5487 | 1232 | 0.5962 | 0.000084 | 0.001250 |
| inline | image | 1232 | 168 | 0.4101 | 0.000083 | 0.005833 |
| inline | newline | 4255 | 391 | 0.3758 | 0.000083 | 0.000750 |
| inline | escape | 3864 | 2464 | 0.3658 | 0.000083 | 0.000916 |
| inline | linkify | 4255 | 0 | 0.3655 | 0.000083 | 0.000542 |

### autolink

- Input chars: 40104
- markdown-it-ts: 2.1261ms
- markdown-it: 2.1232ms
- Ratio: 1.001

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.4674 | 9.467417 | 9.467417 |
| core | block | 1 | 1 | 3.1412 | 3.141250 | 3.141250 |
| inline | autolink | 1872 | 288 | 1.3354 | 0.000084 | 0.009834 |
| block | paragraph | 217 | 217 | 1.1722 | 0.006708 | 0.030167 |
| block | lheading | 217 | 0 | 1.1110 | 0.006500 | 0.014375 |
| inline | text | 3959 | 1512 | 0.4803 | 0.000084 | 0.001084 |
| inline | newline | 2447 | 575 | 0.2592 | 0.000083 | 0.001125 |
| inline | linkify | 2447 | 0 | 0.2132 | 0.000083 | 0.000458 |

### hr

- Input chars: 40044
- markdown-it-ts: 2.1434ms
- markdown-it: 2.1694ms
- Ratio: 0.988

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 7.1197 | 7.119750 | 7.119750 |
| core | inline | 1 | 1 | 3.1448 | 3.144834 | 3.144834 |
| block | lheading | 564 | 0 | 1.2492 | 0.002083 | 0.029000 |
| block | paragraph | 564 | 564 | 1.0884 | 0.001833 | 0.025917 |
| block | hr | 3382 | 2818 | 0.6556 | 0.000208 | 0.016541 |
| inline | emphasis | 564 | 564 | 0.4639 | 0.000750 | 0.012500 |
| block | blockquote | 3382 | 0 | 0.3181 | 0.000083 | 0.020292 |
| block | table | 3382 | 0 | 0.3140 | 0.000083 | 0.001250 |

### plain_text

- Input chars: 41679
- markdown-it-ts: 0.9373ms
- markdown-it: 0.9595ms
- Ratio: 0.977

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.4839 | 0.483916 | 0.483916 |
| core | inline | 1 | 1 | 0.4607 | 0.460708 | 0.460708 |
| inline | text | 143 | 99 | 0.1352 | 0.000208 | 0.004875 |
| block | reference | 77 | 11 | 0.0815 | 0.000166 | 0.019416 |
| inline | link | 22 | 22 | 0.0672 | 0.002938 | 0.013916 |
| block | paragraph | 66 | 66 | 0.0190 | 0.000250 | 0.002583 |
| block | lheading | 66 | 0 | 0.0125 | 0.000167 | 0.001208 |
| inline2 | balance_pairs | 33 | 33 | 0.0120 | 0.000125 | 0.002167 |

### lheading

- Input chars: 40002
- markdown-it-ts: 2.5205ms
- markdown-it: 2.6132ms
- Ratio: 0.965

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 45.8743 | 45.874333 | 45.874333 |
| core | block | 1 | 1 | 3.8071 | 3.807084 | 3.807084 |
| inline | text | 14158 | 1061 | 1.2076 | 0.000083 | 0.001250 |
| inline | linkify | 13097 | 0 | 1.1151 | 0.000083 | 0.001459 |
| inline | newline | 13097 | 707 | 1.1128 | 0.000083 | 0.003333 |
| inline | html_inline | 12390 | 0 | 1.0421 | 0.000083 | 0.000459 |
| inline | escape | 12390 | 0 | 1.0070 | 0.000083 | 0.000625 |
| inline | emphasis | 12390 | 0 | 0.9987 | 0.000083 | 0.000667 |

### table

- Input chars: 40132
- markdown-it-ts: 2.1054ms
- markdown-it: 2.2349ms
- Ratio: 0.942

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 7.1462 | 7.146208 | 7.146208 |
| core | block | 1 | 1 | 4.8745 | 4.874542 | 4.874542 |
| block | table | 317 | 238 | 4.5724 | 0.012083 | 0.084875 |
| inline | backticks | 1562 | 0 | 0.1792 | 0.000083 | 0.054084 |
| inline | autolink | 1404 | 0 | 0.1740 | 0.000083 | 0.062291 |
| inline | emphasis | 1562 | 158 | 0.1582 | 0.000083 | 0.005417 |
| inline | text | 1641 | 79 | 0.1413 | 0.000083 | 0.000875 |
| inline | linkify | 1562 | 0 | 0.1350 | 0.000083 | 0.000709 |

### escape

- Input chars: 40077
- markdown-it-ts: 2.5608ms
- markdown-it: 2.7419ms
- Ratio: 0.934

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 23.5855 | 23.585500 | 23.585500 |
| core | block | 1 | 1 | 3.5420 | 3.542000 | 3.542000 |
| inline | text | 20804 | 4380 | 1.7990 | 0.000083 | 0.000708 |
| inline | escape | 15768 | 15549 | 1.6551 | 0.000084 | 0.013542 |
| inline | linkify | 16424 | 0 | 1.4015 | 0.000083 | 0.000750 |
| inline | newline | 16424 | 656 | 1.3476 | 0.000083 | 0.000500 |
| core | text_join | 1 | 1 | 0.3793 | 0.379333 | 0.379333 |
| block | paragraph | 877 | 877 | 0.2800 | 0.000292 | 0.003167 |

### list_flat

- Input chars: 40248
- markdown-it-ts: 2.3291ms
- markdown-it: 2.5017ms
- Ratio: 0.931

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 16.8561 | 16.856083 | 16.856083 |
| block | list | 5227 | 2887 | 15.4905 | 0.000125 | 0.152417 |
| block | paragraph | 2340 | 2340 | 2.3251 | 0.000458 | 0.007625 |
| block | lheading | 2340 | 0 | 2.0912 | 0.000209 | 0.011959 |
| block | hr | 7956 | 156 | 0.7446 | 0.000083 | 0.000792 |
| core | inline | 1 | 1 | 0.6501 | 0.650125 | 0.650125 |
| block | fence | 7956 | 0 | 0.6477 | 0.000083 | 0.000291 |
| block | blockquote | 7956 | 0 | 0.6363 | 0.000083 | 0.000333 |

### emphasis_nested

- Input chars: 40145
- markdown-it-ts: 2.8087ms
- markdown-it: 3.0830ms
- Ratio: 0.911

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 18.0933 | 18.093292 | 18.093292 |
| core | block | 1 | 1 | 3.2804 | 3.280375 | 3.280375 |
| inline | text | 11913 | 5439 | 1.2685 | 0.000084 | 0.055625 |
| inline | emphasis | 6216 | 6216 | 1.2140 | 0.000167 | 0.005250 |
| block | paragraph | 519 | 519 | 0.7150 | 0.002375 | 0.011541 |
| block | lheading | 519 | 0 | 0.6550 | 0.001333 | 0.006125 |
| inline | linkify | 6474 | 0 | 0.5745 | 0.000083 | 0.008416 |
| inline | newline | 6474 | 258 | 0.5471 | 0.000083 | 0.001666 |

### list_nested

- Input chars: 40215
- markdown-it-ts: 2.8791ms
- markdown-it: 3.2111ms
- Ratio: 0.897

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | list | 8189 | 5459 | 51.9070 | 0.000125 | 0.129917 |
| core | block | 1 | 1 | 20.0798 | 20.079833 | 20.079833 |
| block | paragraph | 2100 | 2100 | 4.0486 | 0.001709 | 0.022542 |
| block | lheading | 2100 | 0 | 3.7596 | 0.001625 | 0.015000 |
| core | inline | 1 | 1 | 3.1857 | 3.185709 | 3.185709 |
| block | hr | 9448 | 0 | 0.8890 | 0.000083 | 0.010750 |
| block | fence | 9448 | 0 | 0.7805 | 0.000083 | 0.006209 |
| block | table | 8294 | 0 | 0.7663 | 0.000083 | 0.001500 |

### blockquote_nested

- Input chars: 40115
- markdown-it-ts: 1.1539ms
- markdown-it: 1.2901ms
- Ratio: 0.894

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | blockquote | 4188 | 1814 | 29.6098 | 0.000084 | 0.111792 |
| core | block | 1 | 1 | 7.8732 | 7.873250 | 7.873250 |
| core | inline | 1 | 1 | 1.2627 | 1.262750 | 1.262750 |
| block | paragraph | 679 | 679 | 0.7238 | 0.001125 | 0.004458 |
| block | lheading | 679 | 0 | 0.6434 | 0.001083 | 0.003500 |
| block | fence | 4188 | 0 | 0.3481 | 0.000083 | 0.000500 |
| block | html_block | 2374 | 0 | 0.2098 | 0.000083 | 0.000833 |
| block | table | 2493 | 0 | 0.2053 | 0.000083 | 0.000792 |

### emphasis_worst

- Input chars: 40136
- markdown-it-ts: 2.3144ms
- markdown-it: 2.6630ms
- Ratio: 0.869

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 17.0678 | 17.067834 | 17.067834 |
| core | block | 1 | 1 | 3.1913 | 3.191333 | 3.191333 |
| inline | emphasis | 5568 | 5568 | 1.6470 | 0.000167 | 0.563375 |
| inline | text | 11367 | 5568 | 1.2072 | 0.000084 | 0.004458 |
| block | paragraph | 465 | 465 | 0.7533 | 0.002416 | 0.047500 |
| block | lheading | 465 | 0 | 0.6038 | 0.001417 | 0.010666 |
| inline | linkify | 5799 | 0 | 0.5166 | 0.000083 | 0.002000 |
| inline | newline | 5799 | 231 | 0.5153 | 0.000083 | 0.008292 |

### emphasis_flat

- Input chars: 40145
- markdown-it-ts: 3.4103ms
- markdown-it: 3.9715ms
- Ratio: 0.859

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 26.7139 | 26.713875 | 26.713875 |
| core | block | 1 | 1 | 3.3552 | 3.355166 | 3.355166 |
| inline | text | 18129 | 8547 | 1.8039 | 0.000084 | 0.002917 |
| inline | emphasis | 9324 | 9324 | 1.7223 | 0.000167 | 0.003833 |
| inline | linkify | 9582 | 0 | 0.8623 | 0.000083 | 0.002042 |
| inline | newline | 9582 | 258 | 0.8223 | 0.000083 | 0.000709 |
| inline | strikethrough | 9324 | 0 | 0.8135 | 0.000083 | 0.007709 |
| inline | escape | 9324 | 0 | 0.7850 | 0.000083 | 0.004208 |

### backticks

- Input chars: 40000
- markdown-it-ts: 1.5225ms
- markdown-it: 1.7875ms
- Ratio: 0.852

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 12.7283 | 12.728250 | 12.728250 |
| core | inline | 1 | 1 | 8.6568 | 8.656791 | 8.656791 |
| block | lheading | 626 | 0 | 6.7323 | 0.002292 | 3.611250 |
| block | paragraph | 626 | 626 | 2.8509 | 0.002458 | 1.015334 |
| inline | backticks | 3750 | 3750 | 0.6678 | 0.000167 | 0.027584 |
| inline | text | 6874 | 2500 | 0.6446 | 0.000084 | 0.001250 |
| block | fence | 1874 | 0 | 0.5846 | 0.000083 | 0.378041 |
| inline | linkify | 4374 | 0 | 0.3769 | 0.000083 | 0.001166 |

### code_block

- Input chars: 40020
- markdown-it-ts: 0.3895ms
- markdown-it: 0.5286ms
- Ratio: 0.737

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.3927 | 0.392750 | 0.392750 |
| block | code | 1 | 1 | 0.1959 | 0.195875 | 0.195875 |
| block | table | 1 | 0 | 0.0033 | 0.003334 | 0.003334 |
| core | normalize | 1 | 1 | 0.0030 | 0.003041 | 0.003041 |
| core | inline | 1 | 1 | 0.0005 | 0.000541 | 0.000541 |
| core | replacements | 1 | 1 | 0.0005 | 0.000500 | 0.000500 |
| core | smartquotes | 1 | 1 | 0.0004 | 0.000375 | 0.000375 |
| core | linkify | 1 | 1 | 0.0003 | 0.000333 | 0.000333 |

### newline

- Input chars: 40068
- markdown-it-ts: 2.3131ms
- markdown-it: 3.3060ms
- Ratio: 0.700

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.4745 | 9.474458 | 9.474458 |
| core | block | 1 | 1 | 2.8812 | 2.881167 | 2.881167 |
| inline | text | 12083 | 6360 | 1.2352 | 0.000084 | 0.001292 |
| inline | newline | 5723 | 4133 | 0.6356 | 0.000125 | 0.001709 |
| inline | linkify | 5723 | 0 | 0.5012 | 0.000083 | 0.000750 |
| block | paragraph | 637 | 637 | 0.3770 | 0.000625 | 0.003750 |
| core | text_join | 1 | 1 | 0.2195 | 0.219542 | 0.219542 |
| inline | escape | 1590 | 1590 | 0.1903 | 0.000125 | 0.001708 |

### fence

- Input chars: 40020
- markdown-it-ts: 0.4788ms
- markdown-it: 0.7403ms
- Ratio: 0.647

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.9219 | 0.921917 | 0.921917 |
| block | fence | 580 | 580 | 0.2826 | 0.000459 | 0.003750 |
| block | table | 580 | 0 | 0.0488 | 0.000083 | 0.000958 |
| block | code | 580 | 0 | 0.0467 | 0.000083 | 0.000500 |
| core | normalize | 1 | 1 | 0.0034 | 0.003375 | 0.003375 |
| core | inline | 1 | 1 | 0.0024 | 0.002375 | 0.002375 |
| core | text_join | 1 | 1 | 0.0017 | 0.001666 | 0.001666 |
| core | smartquotes | 1 | 1 | 0.0005 | 0.000459 | 0.000459 |

### reference_flat

- Input chars: 40290
- markdown-it-ts: 4.6328ms
- markdown-it: 7.1630ms
- Ratio: 0.647

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 29.4272 | 29.427166 | 29.427166 |
| core | block | 1 | 1 | 5.4174 | 5.417416 | 5.417416 |
| inline | link | 5950 | 595 | 3.5904 | 0.000417 | 0.066000 |
| block | reference | 596 | 340 | 2.7373 | 0.003333 | 0.053541 |
| inline | text | 7479 | 1360 | 0.8234 | 0.000084 | 0.002709 |
| inline | newline | 6119 | 169 | 0.6839 | 0.000125 | 0.003875 |
| inline | linkify | 6119 | 0 | 0.6642 | 0.000125 | 0.000667 |
| inline | emphasis | 5950 | 0 | 0.6413 | 0.000125 | 0.003916 |

### reference_nested

- Input chars: 40092
- markdown-it-ts: 5.1104ms
- markdown-it: 8.5495ms
- Ratio: 0.598

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 85.5379 | 85.537916 | 85.537916 |
| inline | text | 29171 | 4056 | 2.8346 | 0.000084 | 0.018041 |
| inline | link | 19032 | 0 | 2.4447 | 0.000125 | 0.040334 |
| inline | emphasis | 23400 | 4368 | 2.3132 | 0.000083 | 0.017417 |
| inline | newline | 25115 | 1715 | 2.2927 | 0.000083 | 0.002958 |
| inline | linkify | 25115 | 0 | 2.2297 | 0.000083 | 0.001208 |
| core | block | 1 | 1 | 2.0096 | 2.009584 | 2.009584 |
| inline | strikethrough | 23400 | 0 | 1.9292 | 0.000083 | 0.000500 |

### links_nested

- Input chars: 40064
- markdown-it-ts: 7.0778ms
- markdown-it: 23.0743ms
- Ratio: 0.307

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| inline | link | 26240 | 512 | 120.8252 | 0.000084 | 0.315375 |
| core | inline | 1 | 1 | 103.4757 | 103.475708 | 103.475708 |
| core | block | 1 | 1 | 2.9802 | 2.980209 | 2.980209 |
| inline | text | 33023 | 6656 | 2.9762 | 0.000083 | 0.018958 |
| inline | linkify | 26367 | 0 | 2.2621 | 0.000083 | 0.000708 |
| inline | newline | 26367 | 127 | 2.2182 | 0.000083 | 0.002333 |
| inline | html_inline | 25728 | 0 | 2.2133 | 0.000083 | 0.001334 |
| inline | emphasis | 26240 | 0 | 2.1777 | 0.000083 | 0.001250 |


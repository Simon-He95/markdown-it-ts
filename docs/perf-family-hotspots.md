# Parser Family Hotspots

Lower ratio is better. Hotspots come from internal parser rule profiling (`core/block/inline/inline2`).

| Fixture | TS ms | markdown-it ms | Ratio | Top hotspot |
|:--|---:|---:|---:|:--|
| reference_list | 2.1290 | 2.0286 | 1.049 | core.block (11.8956ms) |
| blockquote_nested | 1.0074 | 0.9841 | 1.024 | block.blockquote (24.4199ms) |
| plain_text | 0.3906 | 0.3951 | 0.989 | core.block (0.3995ms) |
| hr | 1.6770 | 1.7489 | 0.959 | core.block (5.5135ms) |
| code_block | 0.3965 | 0.4140 | 0.958 | core.block (0.3066ms) |
| autolink | 1.5840 | 1.6809 | 0.942 | core.inline (8.1466ms) |
| list_flat | 1.8944 | 2.0486 | 0.925 | core.block (16.0622ms) |
| list_nested | 2.3806 | 2.6749 | 0.890 | block.list (50.7102ms) |
| blockquote_flat | 0.7194 | 0.8123 | 0.886 | core.block (3.7745ms) |
| links_flat | 1.6266 | 1.8562 | 0.876 | core.inline (7.4455ms) |
| html_inline | 1.6114 | 1.8449 | 0.873 | core.inline (14.9199ms) |
| entity | 1.0392 | 1.2014 | 0.865 | core.inline (10.2348ms) |
| table | 1.4627 | 1.7405 | 0.840 | core.inline (5.9002ms) |
| emphasis_nested | 1.9288 | 2.4650 | 0.782 | core.inline (14.8984ms) |
| escape | 1.6598 | 2.1891 | 0.758 | core.inline (20.7436ms) |
| emphasis_worst | 1.5900 | 2.0996 | 0.757 | core.inline (13.6858ms) |
| emphasis_flat | 2.0850 | 2.9913 | 0.697 | core.inline (21.7635ms) |
| backticks | 0.9514 | 1.4127 | 0.673 | core.inline (7.1979ms) |
| heading | 1.3481 | 2.0278 | 0.665 | core.inline (25.355ms) |
| fence | 0.3999 | 0.6117 | 0.654 | core.block (0.7908ms) |
| reference_flat | 3.1612 | 5.7707 | 0.548 | core.inline (21.7101ms) |
| newline | 1.2860 | 2.4789 | 0.519 | core.inline (8.0057ms) |
| lheading | 0.9237 | 2.1295 | 0.434 | core.inline (41.743ms) |
| reference_nested | 2.0112 | 6.8780 | 0.292 | core.inline (74.8292ms) |
| links_nested | 3.2369 | 18.2864 | 0.177 | inline.link (99.7468ms) |

## Detail

### reference_list

- Input chars: 40664
- markdown-it-ts: 2.1290ms
- markdown-it: 2.0286ms
- Ratio: 1.049

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 11.8956 | 11.895584 | 11.895584 |
| block | reference | 2600 | 2600 | 7.2286 | 0.002750 | 0.058542 |
| block | list | 5199 | 0 | 0.3951 | 0.000083 | 0.000625 |
| block | table | 5199 | 0 | 0.3925 | 0.000083 | 0.001958 |
| block | blockquote | 5199 | 0 | 0.3911 | 0.000083 | 0.010917 |
| block | hr | 5199 | 0 | 0.3833 | 0.000083 | 0.000791 |
| block | fence | 5199 | 0 | 0.3804 | 0.000083 | 0.000709 |
| block | html_block | 2599 | 0 | 0.2220 | 0.000083 | 0.000792 |

### blockquote_nested

- Input chars: 40115
- markdown-it-ts: 1.0074ms
- markdown-it: 0.9841ms
- Ratio: 1.024

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | blockquote | 4188 | 1814 | 24.4199 | 0.000083 | 0.153000 |
| core | block | 1 | 1 | 6.4820 | 6.482042 | 6.482042 |
| core | inline | 1 | 1 | 0.9787 | 0.978750 | 0.978750 |
| block | paragraph | 679 | 679 | 0.5743 | 0.000875 | 0.005000 |
| block | lheading | 679 | 0 | 0.5127 | 0.000833 | 0.004750 |
| block | fence | 4188 | 0 | 0.2736 | 0.000083 | 0.000666 |
| block | hr | 2374 | 0 | 0.1798 | 0.000083 | 0.022458 |
| block | html_block | 2374 | 0 | 0.1705 | 0.000083 | 0.001541 |

### plain_text

- Input chars: 41679
- markdown-it-ts: 0.3906ms
- markdown-it: 0.3951ms
- Ratio: 0.989

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.3995 | 0.399541 | 0.399541 |
| core | inline | 1 | 1 | 0.3417 | 0.341709 | 0.341709 |
| inline | text | 143 | 99 | 0.1026 | 0.000125 | 0.003625 |
| inline | link | 22 | 22 | 0.0533 | 0.002208 | 0.009833 |
| block | reference | 77 | 11 | 0.0532 | 0.000125 | 0.008792 |
| block | paragraph | 66 | 66 | 0.0144 | 0.000167 | 0.000958 |
| block | lheading | 66 | 0 | 0.0090 | 0.000125 | 0.000417 |
| block | list | 87 | 0 | 0.0065 | 0.000083 | 0.000167 |

### hr

- Input chars: 40044
- markdown-it-ts: 1.6770ms
- markdown-it: 1.7489ms
- Ratio: 0.959

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 5.5135 | 5.513500 | 5.513500 |
| core | inline | 1 | 1 | 2.4270 | 2.427042 | 2.427042 |
| block | lheading | 564 | 0 | 0.9729 | 0.001500 | 0.052916 |
| block | paragraph | 564 | 564 | 0.7989 | 0.001333 | 0.016208 |
| block | hr | 3382 | 2818 | 0.4974 | 0.000166 | 0.003417 |
| inline | emphasis | 564 | 564 | 0.3503 | 0.000584 | 0.002334 |
| block | table | 3382 | 0 | 0.2556 | 0.000083 | 0.001667 |
| block | blockquote | 3382 | 0 | 0.2401 | 0.000083 | 0.000750 |

### code_block

- Input chars: 40020
- markdown-it-ts: 0.3965ms
- markdown-it: 0.4140ms
- Ratio: 0.958

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.3066 | 0.306625 | 0.306625 |
| block | code | 1 | 1 | 0.1518 | 0.151792 | 0.151792 |
| core | normalize | 1 | 1 | 0.0026 | 0.002583 | 0.002583 |
| block | table | 1 | 0 | 0.0013 | 0.001333 | 0.001333 |
| core | inline | 1 | 1 | 0.0009 | 0.000875 | 0.000875 |
| core | linkify | 1 | 1 | 0.0007 | 0.000667 | 0.000667 |
| core | smartquotes | 1 | 1 | 0.0006 | 0.000583 | 0.000583 |
| core | text_join | 1 | 1 | 0.0005 | 0.000542 | 0.000542 |

### autolink

- Input chars: 40104
- markdown-it-ts: 1.5840ms
- markdown-it: 1.6809ms
- Ratio: 0.942

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 8.1466 | 8.146584 | 8.146584 |
| core | block | 1 | 1 | 2.6557 | 2.655750 | 2.655750 |
| inline | autolink | 1872 | 288 | 1.1361 | 0.000083 | 0.024959 |
| block | paragraph | 217 | 217 | 0.9444 | 0.005375 | 0.021791 |
| block | lheading | 217 | 0 | 0.9338 | 0.005208 | 0.029334 |
| inline | text | 3959 | 1512 | 0.3883 | 0.000083 | 0.009250 |
| inline | newline | 2447 | 575 | 0.2024 | 0.000083 | 0.002584 |
| inline | linkify | 2447 | 0 | 0.1666 | 0.000083 | 0.000500 |

### list_flat

- Input chars: 40248
- markdown-it-ts: 1.8944ms
- markdown-it: 2.0486ms
- Ratio: 0.925

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 16.0622 | 16.062250 | 16.062250 |
| block | list | 5227 | 2887 | 14.7744 | 0.000084 | 1.266167 |
| block | paragraph | 2340 | 2340 | 2.0080 | 0.000375 | 0.052084 |
| block | lheading | 2340 | 0 | 1.7096 | 0.000167 | 0.009958 |
| block | hr | 7956 | 156 | 0.6259 | 0.000083 | 0.007333 |
| block | fence | 7956 | 0 | 0.5692 | 0.000083 | 0.033500 |
| block | blockquote | 7956 | 0 | 0.5567 | 0.000083 | 0.013083 |
| core | inline | 1 | 1 | 0.5160 | 0.516042 | 0.516042 |

### list_nested

- Input chars: 40215
- markdown-it-ts: 2.3806ms
- markdown-it: 2.6749ms
- Ratio: 0.890

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | list | 8189 | 5459 | 50.7102 | 0.000084 | 0.199000 |
| core | block | 1 | 1 | 19.8988 | 19.898750 | 19.898750 |
| block | paragraph | 2100 | 2100 | 4.3525 | 0.001708 | 0.065250 |
| block | lheading | 2100 | 0 | 4.0020 | 0.001666 | 0.048000 |
| core | inline | 1 | 1 | 3.0940 | 3.093959 | 3.093959 |
| block | hr | 9448 | 0 | 0.8606 | 0.000083 | 0.021416 |
| block | fence | 9448 | 0 | 0.7854 | 0.000083 | 0.011917 |
| block | blockquote | 9448 | 0 | 0.7753 | 0.000083 | 0.014250 |

### blockquote_flat

- Input chars: 40016
- markdown-it-ts: 0.7194ms
- markdown-it: 0.8123ms
- Ratio: 0.886

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 3.7745 | 3.774458 | 3.774458 |
| block | blockquote | 1149 | 165 | 2.8025 | 0.000166 | 0.080667 |
| core | inline | 1 | 1 | 2.5037 | 2.503750 | 2.503750 |
| inline | text | 2788 | 1476 | 0.3001 | 0.000125 | 0.010500 |
| block | paragraph | 328 | 328 | 0.1586 | 0.000500 | 0.018875 |
| inline | newline | 1312 | 1148 | 0.1133 | 0.000083 | 0.000792 |
| block | fence | 1149 | 0 | 0.1038 | 0.000083 | 0.000667 |
| block | html_block | 984 | 0 | 0.0992 | 0.000083 | 0.007583 |

### links_flat

- Input chars: 40712
- markdown-it-ts: 1.6266ms
- markdown-it: 1.8562ms
- Ratio: 0.876

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 7.4455 | 7.445458 | 7.445458 |
| inline | link | 1120 | 280 | 1.8634 | 0.000084 | 0.023833 |
| core | block | 1 | 1 | 1.7734 | 1.773416 | 1.773416 |
| inline | newline | 2407 | 391 | 1.2455 | 0.000083 | 1.080917 |
| inline | text | 3359 | 952 | 0.3204 | 0.000083 | 0.006708 |
| inline | image | 840 | 168 | 0.3063 | 0.000083 | 0.006375 |
| inline | linkify | 2407 | 0 | 0.1614 | 0.000083 | 0.000750 |
| inline | escape | 2016 | 896 | 0.1514 | 0.000083 | 0.005375 |

### html_inline

- Input chars: 40248
- markdown-it-ts: 1.6114ms
- markdown-it: 1.8449ms
- Ratio: 0.873

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 14.9199 | 14.919875 | 14.919875 |
| core | block | 1 | 1 | 5.1977 | 5.197708 | 5.197708 |
| inline | text | 5927 | 2106 | 1.2168 | 0.000083 | 0.701542 |
| inline | html_inline | 3432 | 1014 | 0.4669 | 0.000084 | 0.003458 |
| block | paragraph | 1249 | 1249 | 0.4318 | 0.000208 | 0.008375 |
| inline | autolink | 3432 | 0 | 0.3976 | 0.000125 | 0.006042 |
| block | html_block | 1639 | 234 | 0.3128 | 0.000208 | 0.005542 |
| block | lheading | 1249 | 0 | 0.3115 | 0.000125 | 0.004500 |

### entity

- Input chars: 40016
- markdown-it-ts: 1.0392ms
- markdown-it: 1.2014ms
- Ratio: 0.865

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 10.2348 | 10.234834 | 10.234834 |
| core | block | 1 | 1 | 2.6805 | 2.680459 | 2.680459 |
| block | paragraph | 611 | 611 | 0.7391 | 0.000208 | 0.584917 |
| inline | entity | 2562 | 1464 | 0.5804 | 0.000208 | 0.009333 |
| inline | text | 5001 | 2318 | 0.4351 | 0.000083 | 0.001083 |
| inline | strikethrough | 2562 | 0 | 0.2178 | 0.000083 | 0.025417 |
| inline | newline | 2683 | 121 | 0.1922 | 0.000083 | 0.001834 |
| inline | escape | 2562 | 0 | 0.1840 | 0.000083 | 0.017375 |

### table

- Input chars: 40132
- markdown-it-ts: 1.4627ms
- markdown-it: 1.7405ms
- Ratio: 0.840

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 5.9002 | 5.900250 | 5.900250 |
| core | block | 1 | 1 | 3.7287 | 3.728750 | 3.728750 |
| block | table | 317 | 238 | 3.4997 | 0.009625 | 0.068709 |
| inline | emphasis | 1562 | 158 | 0.1201 | 0.000083 | 0.003083 |
| inline | escape | 1562 | 0 | 0.1156 | 0.000042 | 0.017333 |
| inline | text | 1641 | 79 | 0.1123 | 0.000083 | 0.001083 |
| inline | linkify | 1562 | 0 | 0.1068 | 0.000083 | 0.000750 |
| inline | strikethrough | 1562 | 0 | 0.1000 | 0.000083 | 0.000459 |

### emphasis_nested

- Input chars: 40145
- markdown-it-ts: 1.9288ms
- markdown-it: 2.4650ms
- Ratio: 0.782

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 14.8984 | 14.898375 | 14.898375 |
| core | block | 1 | 1 | 2.6346 | 2.634583 | 2.634583 |
| inline | emphasis | 6216 | 6216 | 0.9832 | 0.000166 | 0.006291 |
| inline | text | 11913 | 5439 | 0.9457 | 0.000083 | 0.003083 |
| block | paragraph | 519 | 519 | 0.5681 | 0.001417 | 0.008209 |
| block | lheading | 519 | 0 | 0.5123 | 0.000791 | 0.003917 |
| inline | linkify | 6474 | 0 | 0.4393 | 0.000083 | 0.004250 |
| inline | newline | 6474 | 258 | 0.4221 | 0.000083 | 0.003208 |

### escape

- Input chars: 40077
- markdown-it-ts: 1.6598ms
- markdown-it: 2.1891ms
- Ratio: 0.758

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 20.7436 | 20.743625 | 20.743625 |
| core | block | 1 | 1 | 2.9220 | 2.921959 | 2.921959 |
| inline | text | 20804 | 4380 | 1.4189 | 0.000083 | 0.001292 |
| inline | escape | 15768 | 15549 | 1.2846 | 0.000083 | 0.004792 |
| inline | linkify | 16424 | 0 | 1.0932 | 0.000083 | 0.006042 |
| inline | newline | 16424 | 656 | 1.0517 | 0.000083 | 0.002167 |
| core | text_join | 1 | 1 | 0.7503 | 0.750292 | 0.750292 |
| block | paragraph | 877 | 877 | 0.2285 | 0.000250 | 0.002458 |

### emphasis_worst

- Input chars: 40136
- markdown-it-ts: 1.5900ms
- markdown-it: 2.0996ms
- Ratio: 0.757

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 13.6858 | 13.685750 | 13.685750 |
| core | block | 1 | 1 | 2.3897 | 2.389708 | 2.389708 |
| inline | text | 11367 | 5568 | 0.9689 | 0.000083 | 0.024292 |
| inline | emphasis | 5568 | 5568 | 0.8499 | 0.000125 | 0.006583 |
| block | paragraph | 465 | 465 | 0.5192 | 0.001291 | 0.011875 |
| block | lheading | 465 | 0 | 0.4599 | 0.000208 | 0.003833 |
| inline | linkify | 5799 | 0 | 0.3988 | 0.000083 | 0.006958 |
| inline | newline | 5799 | 231 | 0.3884 | 0.000083 | 0.005250 |

### emphasis_flat

- Input chars: 40145
- markdown-it-ts: 2.0850ms
- markdown-it: 2.9913ms
- Ratio: 0.697

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 21.7635 | 21.763458 | 21.763458 |
| core | block | 1 | 1 | 2.6771 | 2.677125 | 2.677125 |
| inline | text | 18129 | 8547 | 1.3721 | 0.000083 | 0.005250 |
| inline | emphasis | 9324 | 9324 | 1.2347 | 0.000125 | 0.007250 |
| inline | linkify | 9582 | 0 | 0.6434 | 0.000083 | 0.001541 |
| inline | newline | 9582 | 258 | 0.6180 | 0.000083 | 0.006875 |
| inline | strikethrough | 9324 | 0 | 0.6032 | 0.000083 | 0.013959 |
| inline | backticks | 9324 | 0 | 0.5958 | 0.000083 | 0.000708 |

### backticks

- Input chars: 40000
- markdown-it-ts: 0.9514ms
- markdown-it: 1.4127ms
- Ratio: 0.673

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 7.1979 | 7.197875 | 7.197875 |
| core | block | 1 | 1 | 4.4134 | 4.413375 | 4.413375 |
| block | paragraph | 626 | 626 | 1.2526 | 0.001917 | 0.011583 |
| block | lheading | 626 | 0 | 1.1869 | 0.001833 | 0.012417 |
| inline | text | 6874 | 2500 | 0.5058 | 0.000083 | 0.001417 |
| inline | backticks | 3750 | 3750 | 0.4927 | 0.000125 | 0.009125 |
| inline | linkify | 4374 | 0 | 0.2892 | 0.000083 | 0.001042 |
| inline | newline | 4374 | 624 | 0.2808 | 0.000083 | 0.000333 |

### heading

- Input chars: 40098
- markdown-it-ts: 1.3481ms
- markdown-it: 2.0278ms
- Ratio: 0.665

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 25.3550 | 25.355000 | 25.355000 |
| core | block | 1 | 1 | 11.0042 | 11.004250 | 11.004250 |
| block | lheading | 326 | 0 | 1.1132 | 0.002708 | 0.040250 |
| block | paragraph | 326 | 326 | 1.0655 | 0.002834 | 0.037583 |
| block | html_block | 2932 | 0 | 0.9980 | 0.000084 | 0.714917 |
| block | reference | 2282 | 0 | 0.8546 | 0.000292 | 0.037958 |
| inline | newline | 7172 | 0 | 0.8136 | 0.000125 | 0.028833 |
| inline | linkify | 7172 | 0 | 0.8061 | 0.000084 | 0.064209 |

### fence

- Input chars: 40020
- markdown-it-ts: 0.3999ms
- markdown-it: 0.6117ms
- Ratio: 0.654

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.7908 | 0.790833 | 0.790833 |
| block | fence | 580 | 580 | 0.2160 | 0.000375 | 0.003875 |
| block | table | 580 | 0 | 0.0408 | 0.000083 | 0.001791 |
| block | code | 580 | 0 | 0.0376 | 0.000083 | 0.000458 |
| core | normalize | 1 | 1 | 0.0030 | 0.003042 | 0.003042 |
| core | inline | 1 | 1 | 0.0029 | 0.002875 | 0.002875 |
| core | text_join | 1 | 1 | 0.0014 | 0.001375 | 0.001375 |
| core | smartquotes | 1 | 1 | 0.0009 | 0.000875 | 0.000875 |

### reference_flat

- Input chars: 40290
- markdown-it-ts: 3.1612ms
- markdown-it: 5.7707ms
- Ratio: 0.548

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 21.7101 | 21.710125 | 21.710125 |
| core | block | 1 | 1 | 4.0790 | 4.079042 | 4.079042 |
| inline | link | 5950 | 595 | 2.9891 | 0.000333 | 0.085875 |
| block | reference | 596 | 340 | 2.2509 | 0.002625 | 0.065500 |
| inline | text | 7479 | 1360 | 0.5776 | 0.000083 | 0.001166 |
| inline | linkify | 6119 | 0 | 0.4445 | 0.000083 | 0.031500 |
| inline | newline | 6119 | 169 | 0.4149 | 0.000042 | 0.003000 |
| inline | backticks | 5950 | 0 | 0.3826 | 0.000083 | 0.003208 |

### newline

- Input chars: 40068
- markdown-it-ts: 1.2860ms
- markdown-it: 2.4789ms
- Ratio: 0.519

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 8.0057 | 8.005708 | 8.005708 |
| core | block | 1 | 1 | 2.4414 | 2.441375 | 2.441375 |
| inline | text | 12083 | 6360 | 0.9692 | 0.000083 | 0.003083 |
| inline | newline | 5723 | 4133 | 0.4794 | 0.000083 | 0.008750 |
| inline | linkify | 5723 | 0 | 0.3863 | 0.000083 | 0.000708 |
| block | paragraph | 637 | 637 | 0.3035 | 0.000500 | 0.004041 |
| core | text_join | 1 | 1 | 0.2101 | 0.210125 | 0.210125 |
| inline | escape | 1590 | 1590 | 0.1549 | 0.000083 | 0.008250 |

### lheading

- Input chars: 40002
- markdown-it-ts: 0.9237ms
- markdown-it: 2.1295ms
- Ratio: 0.434

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 41.7430 | 41.743041 | 41.743041 |
| core | block | 1 | 1 | 3.1163 | 3.116333 | 3.116333 |
| inline | link | 12390 | 0 | 1.1796 | 0.000083 | 0.017875 |
| inline | autolink | 12390 | 0 | 1.0707 | 0.000083 | 0.021583 |
| inline | image | 12390 | 0 | 1.0685 | 0.000083 | 0.018917 |
| inline | linkify | 13097 | 0 | 1.0249 | 0.000083 | 0.023500 |
| inline | backticks | 12390 | 0 | 1.0228 | 0.000083 | 0.019375 |
| inline | entity | 12390 | 0 | 1.0064 | 0.000083 | 0.034000 |

### reference_nested

- Input chars: 40092
- markdown-it-ts: 2.0112ms
- markdown-it: 6.8780ms
- Ratio: 0.292

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 74.8292 | 74.829209 | 74.829209 |
| inline | text | 29171 | 4056 | 2.2514 | 0.000083 | 0.014459 |
| inline | link | 19032 | 0 | 2.1323 | 0.000084 | 0.040916 |
| inline | emphasis | 23400 | 4368 | 1.8439 | 0.000083 | 0.005875 |
| inline | linkify | 25115 | 0 | 1.7680 | 0.000083 | 0.019333 |
| inline | newline | 25115 | 1715 | 1.7471 | 0.000083 | 0.008292 |
| core | block | 1 | 1 | 1.6896 | 1.689583 | 1.689583 |
| inline | strikethrough | 23400 | 0 | 1.5655 | 0.000083 | 0.000958 |

### links_nested

- Input chars: 40064
- markdown-it-ts: 3.2369ms
- markdown-it: 18.2864ms
- Ratio: 0.177

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| inline | link | 26240 | 512 | 99.7468 | 0.000083 | 0.262541 |
| core | inline | 1 | 1 | 88.4913 | 88.491250 | 88.491250 |
| core | block | 1 | 1 | 2.5093 | 2.509292 | 2.509292 |
| inline | text | 33023 | 6656 | 2.3802 | 0.000083 | 0.007750 |
| inline | linkify | 26367 | 0 | 1.8087 | 0.000083 | 0.022208 |
| inline | newline | 26367 | 127 | 1.8032 | 0.000042 | 0.018875 |
| inline | emphasis | 26240 | 0 | 1.7645 | 0.000083 | 0.058083 |
| inline | html_inline | 25728 | 0 | 1.7569 | 0.000083 | 0.009958 |


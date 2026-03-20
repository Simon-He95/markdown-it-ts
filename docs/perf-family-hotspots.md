# Parser Family Hotspots

Lower ratio is better. Hotspots come from internal parser rule profiling (`core/block/inline/inline2`).

| Fixture | TS ms | markdown-it ms | Ratio | Top hotspot |
|:--|---:|---:|---:|:--|
| blockquote_flat | 1.4774 | 1.3167 | 1.122 | core.block (4.6676ms) |
| emphasis_nested | 3.6458 | 3.3225 | 1.097 | core.inline (18.4277ms) |
| list_nested | 3.6140 | 3.5450 | 1.019 | block.list (56.4566ms) |
| autolink | 2.3715 | 2.3508 | 1.009 | core.inline (9.8233ms) |
| html_inline | 2.7374 | 2.7345 | 1.001 | core.inline (16.965ms) |
| entity | 1.5974 | 1.6224 | 0.985 | core.inline (12.148ms) |
| list_flat | 2.9540 | 3.0242 | 0.977 | core.block (17.5559ms) |
| emphasis_flat | 3.9866 | 4.0796 | 0.977 | core.inline (26.9895ms) |
| hr | 2.4347 | 2.4973 | 0.975 | core.block (7.7799ms) |
| table | 2.6248 | 2.7188 | 0.965 | core.inline (8.0167ms) |
| reference_list | 2.4430 | 2.5324 | 0.965 | core.block (14.4012ms) |
| blockquote_nested | 1.3500 | 1.4095 | 0.958 | block.blockquote (36.9725ms) |
| emphasis_worst | 2.6891 | 2.8265 | 0.951 | core.inline (16.672ms) |
| lheading | 2.6078 | 2.7687 | 0.942 | core.inline (47.6579ms) |
| escape | 2.9513 | 3.1328 | 0.942 | core.inline (24.5091ms) |
| heading | 2.5629 | 2.7614 | 0.928 | core.inline (27.2756ms) |
| backticks | 1.7691 | 1.9156 | 0.924 | core.inline (10.2783ms) |
| plain_text | 0.4777 | 0.5488 | 0.870 | core.block (0.4752ms) |
| links_flat | 2.1591 | 2.6115 | 0.827 | core.inline (9.0298ms) |
| code_block | 0.4937 | 0.6002 | 0.823 | core.block (0.3699ms) |
| newline | 2.5253 | 3.3301 | 0.758 | core.inline (9.6042ms) |
| fence | 0.6509 | 0.8754 | 0.744 | core.block (0.9345ms) |
| reference_nested | 5.6831 | 9.2461 | 0.615 | core.inline (91.3978ms) |
| reference_flat | 2.9046 | 8.0482 | 0.361 | core.inline (26.6157ms) |
| links_nested | 4.9736 | 24.2600 | 0.205 | core.inline (91.9223ms) |

## Detail

### blockquote_flat

- Input chars: 40016
- markdown-it-ts: 1.4774ms
- markdown-it: 1.3167ms
- Ratio: 1.122

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 4.6676 | 4.667625 | 4.667625 |
| block | blockquote | 1149 | 165 | 3.2052 | 0.000125 | 0.191500 |
| core | inline | 1 | 1 | 2.8678 | 2.867750 | 2.867750 |
| inline | text | 2788 | 1476 | 0.3430 | 0.000125 | 0.003166 |
| block | paragraph | 328 | 328 | 0.2112 | 0.000708 | 0.007167 |
| inline | newline | 1312 | 1148 | 0.1517 | 0.000084 | 0.007750 |
| block | lheading | 328 | 0 | 0.1285 | 0.000416 | 0.007917 |
| block | fence | 1149 | 0 | 0.1053 | 0.000083 | 0.005292 |

### emphasis_nested

- Input chars: 40145
- markdown-it-ts: 3.6458ms
- markdown-it: 3.3225ms
- Ratio: 1.097

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 18.4277 | 18.427750 | 18.427750 |
| core | block | 1 | 1 | 3.5922 | 3.592167 | 3.592167 |
| inline | emphasis | 6216 | 6216 | 1.3445 | 0.000208 | 0.009292 |
| inline | text | 11913 | 5439 | 1.1614 | 0.000084 | 0.001917 |
| block | paragraph | 519 | 519 | 0.9224 | 0.002750 | 0.032917 |
| block | lheading | 519 | 0 | 0.7802 | 0.002458 | 0.011334 |
| inline | linkify | 6474 | 0 | 0.4897 | 0.000083 | 0.007292 |
| inline | newline | 6474 | 258 | 0.4781 | 0.000083 | 0.001000 |

### list_nested

- Input chars: 40215
- markdown-it-ts: 3.6140ms
- markdown-it: 3.5450ms
- Ratio: 1.019

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | list | 8189 | 5459 | 56.4566 | 0.000125 | 0.761375 |
| core | block | 1 | 1 | 21.4117 | 21.411666 | 21.411666 |
| block | paragraph | 2100 | 2100 | 4.7454 | 0.002041 | 0.040875 |
| block | lheading | 2100 | 0 | 4.3928 | 0.001917 | 0.074667 |
| core | inline | 1 | 1 | 3.0970 | 3.097000 | 3.097000 |
| block | fence | 8504 | 0 | 0.8084 | 0.000083 | 0.069333 |
| block | hr | 8504 | 0 | 0.7895 | 0.000083 | 0.001041 |
| block | table | 8294 | 0 | 0.7698 | 0.000083 | 0.012125 |

### autolink

- Input chars: 40104
- markdown-it-ts: 2.3715ms
- markdown-it: 2.3508ms
- Ratio: 1.009

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.8233 | 9.823333 | 9.823333 |
| core | block | 1 | 1 | 3.4913 | 3.491333 | 3.491333 |
| inline | autolink | 1872 | 288 | 1.4103 | 0.000084 | 0.021833 |
| block | paragraph | 217 | 217 | 1.3563 | 0.007625 | 0.032084 |
| block | lheading | 217 | 0 | 1.2928 | 0.007458 | 0.025042 |
| inline | text | 3959 | 1512 | 0.4594 | 0.000084 | 0.002500 |
| inline | newline | 2447 | 575 | 0.2407 | 0.000083 | 0.004833 |
| inline | linkify | 2447 | 0 | 0.1824 | 0.000083 | 0.001875 |

### html_inline

- Input chars: 40248
- markdown-it-ts: 2.7374ms
- markdown-it: 2.7345ms
- Ratio: 1.001

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 16.9650 | 16.964959 | 16.964959 |
| core | block | 1 | 1 | 6.1725 | 6.172500 | 6.172500 |
| inline | text | 5927 | 2106 | 0.6576 | 0.000084 | 0.035458 |
| block | paragraph | 1249 | 1249 | 0.6185 | 0.000292 | 0.005417 |
| inline | html_inline | 3432 | 1014 | 0.5535 | 0.000125 | 0.004875 |
| inline | autolink | 3432 | 0 | 0.4793 | 0.000125 | 0.005375 |
| block | lheading | 1249 | 0 | 0.4741 | 0.000208 | 0.004958 |
| block | html_block | 1639 | 234 | 0.3768 | 0.000250 | 0.004000 |

### entity

- Input chars: 40016
- markdown-it-ts: 1.5974ms
- markdown-it: 1.6224ms
- Ratio: 0.985

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 12.1480 | 12.148000 | 12.148000 |
| core | block | 1 | 1 | 2.4806 | 2.480584 | 2.480584 |
| inline | text | 5123 | 2440 | 0.6018 | 0.000084 | 0.003750 |
| inline | entity | 2562 | 610 | 0.5774 | 0.000208 | 0.005708 |
| inline | newline | 2683 | 121 | 0.2449 | 0.000083 | 0.013041 |
| block | paragraph | 611 | 611 | 0.2064 | 0.000291 | 0.007083 |
| inline | linkify | 2683 | 0 | 0.2038 | 0.000083 | 0.001334 |
| inline | autolink | 2562 | 0 | 0.2005 | 0.000083 | 0.000625 |

### list_flat

- Input chars: 40248
- markdown-it-ts: 2.9540ms
- markdown-it: 3.0242ms
- Ratio: 0.977

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 17.5559 | 17.555917 | 17.555917 |
| block | list | 5227 | 2887 | 15.8308 | 0.000125 | 0.236375 |
| block | paragraph | 2340 | 2340 | 3.0137 | 0.000583 | 0.055000 |
| block | lheading | 2340 | 0 | 2.5510 | 0.000292 | 0.030209 |
| core | inline | 1 | 1 | 0.7992 | 0.799166 | 0.799166 |
| block | hr | 6397 | 156 | 0.6462 | 0.000083 | 0.009208 |
| block | fence | 6397 | 0 | 0.5960 | 0.000083 | 0.036125 |
| block | blockquote | 6397 | 0 | 0.5831 | 0.000083 | 0.035208 |

### emphasis_flat

- Input chars: 40145
- markdown-it-ts: 3.9866ms
- markdown-it: 4.0796ms
- Ratio: 0.977

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 26.9895 | 26.989500 | 26.989500 |
| core | block | 1 | 1 | 3.6907 | 3.690667 | 3.690667 |
| inline | emphasis | 9324 | 9324 | 2.7410 | 0.000167 | 0.964125 |
| inline | text | 18129 | 8547 | 1.6731 | 0.000083 | 0.012917 |
| block | paragraph | 519 | 519 | 0.9561 | 0.002709 | 0.034375 |
| block | lheading | 519 | 0 | 0.8034 | 0.001875 | 0.019166 |
| inline | linkify | 9582 | 0 | 0.7149 | 0.000083 | 0.001709 |
| inline | newline | 9582 | 258 | 0.7090 | 0.000083 | 0.005791 |

### hr

- Input chars: 40044
- markdown-it-ts: 2.4347ms
- markdown-it: 2.4973ms
- Ratio: 0.975

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 7.7799 | 7.779916 | 7.779916 |
| core | inline | 1 | 1 | 3.8363 | 3.836250 | 3.836250 |
| block | lheading | 564 | 0 | 1.2264 | 0.001917 | 0.038709 |
| block | paragraph | 564 | 564 | 1.1788 | 0.001875 | 0.041792 |
| block | hr | 3382 | 2818 | 1.1609 | 0.000208 | 0.447583 |
| inline | emphasis | 564 | 564 | 0.5838 | 0.000833 | 0.055083 |
| block | table | 3382 | 0 | 0.2960 | 0.000083 | 0.005583 |
| block | blockquote | 3382 | 0 | 0.2889 | 0.000083 | 0.009209 |

### table

- Input chars: 40132
- markdown-it-ts: 2.6248ms
- markdown-it: 2.7188ms
- Ratio: 0.965

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 8.0167 | 8.016750 | 8.016750 |
| core | block | 1 | 1 | 4.9799 | 4.979875 | 4.979875 |
| block | table | 317 | 238 | 4.7256 | 0.011542 | 0.133167 |
| inline | emphasis | 1562 | 158 | 0.1387 | 0.000083 | 0.003166 |
| inline | escape | 1562 | 0 | 0.1324 | 0.000083 | 0.017500 |
| inline | text | 1641 | 79 | 0.1309 | 0.000083 | 0.001083 |
| inline | linkify | 1562 | 0 | 0.1179 | 0.000083 | 0.000750 |
| inline | backticks | 1562 | 0 | 0.1161 | 0.000083 | 0.001041 |

### reference_list

- Input chars: 40664
- markdown-it-ts: 2.4430ms
- markdown-it: 2.5324ms
- Ratio: 0.965

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 14.4012 | 14.401209 | 14.401209 |
| block | reference | 2600 | 2600 | 9.1172 | 0.003333 | 0.073500 |
| block | table | 5199 | 0 | 0.4647 | 0.000083 | 0.002958 |
| block | list | 5199 | 0 | 0.4631 | 0.000083 | 0.010750 |
| block | fence | 5199 | 0 | 0.4404 | 0.000083 | 0.002958 |
| block | blockquote | 5199 | 0 | 0.4384 | 0.000083 | 0.000958 |
| block | hr | 5199 | 0 | 0.4360 | 0.000083 | 0.000417 |
| block | heading | 2599 | 0 | 0.2613 | 0.000083 | 0.012375 |

### blockquote_nested

- Input chars: 40115
- markdown-it-ts: 1.3500ms
- markdown-it: 1.4095ms
- Ratio: 0.958

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | blockquote | 4188 | 1814 | 36.9725 | 0.000084 | 0.702875 |
| core | block | 1 | 1 | 9.4919 | 9.491917 | 9.491917 |
| block | paragraph | 679 | 679 | 1.5405 | 0.001333 | 0.598166 |
| core | inline | 1 | 1 | 1.5369 | 1.536875 | 1.536875 |
| block | lheading | 679 | 0 | 0.7753 | 0.001250 | 0.013291 |
| block | fence | 4188 | 0 | 0.3768 | 0.000083 | 0.006084 |
| block | table | 2493 | 0 | 0.2290 | 0.000083 | 0.012125 |
| block | hr | 2374 | 0 | 0.2286 | 0.000083 | 0.014833 |

### emphasis_worst

- Input chars: 40136
- markdown-it-ts: 2.6891ms
- markdown-it: 2.8265ms
- Ratio: 0.951

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 16.6720 | 16.672042 | 16.672042 |
| core | block | 1 | 1 | 3.1475 | 3.147541 | 3.147541 |
| inline | emphasis | 5568 | 5568 | 1.1514 | 0.000208 | 0.004750 |
| inline | text | 11367 | 5568 | 1.1165 | 0.000084 | 0.001542 |
| block | paragraph | 465 | 465 | 0.7475 | 0.002375 | 0.013375 |
| block | lheading | 465 | 0 | 0.7052 | 0.000292 | 0.033417 |
| inline2 | fragments_join | 465 | 465 | 0.6394 | 0.000583 | 0.392125 |
| inline | linkify | 5799 | 0 | 0.4496 | 0.000083 | 0.002250 |

### lheading

- Input chars: 40002
- markdown-it-ts: 2.6078ms
- markdown-it: 2.7687ms
- Ratio: 0.942

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 47.6579 | 47.657916 | 47.657916 |
| core | block | 1 | 1 | 2.6319 | 2.631875 | 2.631875 |
| inline | newline | 13097 | 707 | 1.0979 | 0.000083 | 0.008250 |
| inline | text | 14158 | 1061 | 1.0900 | 0.000083 | 0.001125 |
| inline | linkify | 13097 | 0 | 0.9856 | 0.000083 | 0.004833 |
| inline | html_inline | 12390 | 0 | 0.9528 | 0.000083 | 0.019791 |
| inline | emphasis | 12390 | 0 | 0.9421 | 0.000083 | 0.022292 |
| inline | link | 12390 | 0 | 0.9167 | 0.000083 | 0.030875 |

### escape

- Input chars: 40077
- markdown-it-ts: 2.9513ms
- markdown-it: 3.1328ms
- Ratio: 0.942

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 24.5091 | 24.509083 | 24.509083 |
| core | block | 1 | 1 | 3.7945 | 3.794541 | 3.794541 |
| inline | text | 20804 | 4380 | 1.6942 | 0.000083 | 0.015833 |
| inline | escape | 15768 | 15549 | 1.6493 | 0.000084 | 0.005292 |
| inline | linkify | 16424 | 0 | 1.2455 | 0.000083 | 0.001750 |
| inline | newline | 16424 | 656 | 1.2156 | 0.000083 | 0.000791 |
| block | paragraph | 877 | 877 | 0.4861 | 0.000458 | 0.028541 |
| core | text_join | 1 | 1 | 0.3590 | 0.359000 | 0.359000 |

### heading

- Input chars: 40098
- markdown-it-ts: 2.5629ms
- markdown-it: 2.7614ms
- Ratio: 0.928

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 27.2756 | 27.275625 | 27.275625 |
| core | block | 1 | 1 | 22.3926 | 22.392625 | 22.392625 |
| block | lheading | 326 | 0 | 2.3824 | 0.003042 | 1.108125 |
| block | paragraph | 326 | 326 | 1.2514 | 0.003167 | 0.025250 |
| block | reference | 2282 | 0 | 1.0954 | 0.000333 | 0.145666 |
| inline | text | 7824 | 652 | 0.7550 | 0.000083 | 0.009500 |
| inline | escape | 7172 | 1630 | 0.7013 | 0.000083 | 0.029750 |
| inline | linkify | 7172 | 0 | 0.6946 | 0.000083 | 0.069417 |

### backticks

- Input chars: 40000
- markdown-it-ts: 1.7691ms
- markdown-it: 1.9156ms
- Ratio: 0.924

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 10.2783 | 10.278250 | 10.278250 |
| core | block | 1 | 1 | 5.9420 | 5.941958 | 5.941958 |
| block | lheading | 626 | 0 | 1.8446 | 0.002708 | 0.026375 |
| block | paragraph | 626 | 626 | 1.8440 | 0.002875 | 0.020666 |
| inline | backticks | 3750 | 3750 | 1.1333 | 0.000166 | 0.549458 |
| inline | text | 6874 | 2500 | 0.6307 | 0.000083 | 0.012250 |
| inline | newline | 4374 | 624 | 0.3400 | 0.000083 | 0.008791 |
| inline | linkify | 4374 | 0 | 0.3343 | 0.000083 | 0.006667 |

### plain_text

- Input chars: 41679
- markdown-it-ts: 0.4777ms
- markdown-it: 0.5488ms
- Ratio: 0.870

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.4752 | 0.475209 | 0.475209 |
| core | inline | 1 | 1 | 0.4738 | 0.473833 | 0.473833 |
| inline | text | 143 | 99 | 0.1349 | 0.000167 | 0.004500 |
| block | reference | 77 | 11 | 0.0867 | 0.000208 | 0.018917 |
| inline | link | 22 | 22 | 0.0468 | 0.002125 | 0.005542 |
| block | paragraph | 66 | 66 | 0.0241 | 0.000292 | 0.002917 |
| block | lheading | 66 | 0 | 0.0145 | 0.000208 | 0.001417 |
| inline | emphasis | 44 | 22 | 0.0090 | 0.000166 | 0.001667 |

### links_flat

- Input chars: 40712
- markdown-it-ts: 2.1591ms
- markdown-it: 2.6115ms
- Ratio: 0.827

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.0298 | 9.029792 | 9.029792 |
| inline | link | 1120 | 280 | 2.2962 | 0.000125 | 0.038750 |
| core | block | 1 | 1 | 2.1067 | 2.106708 | 2.106708 |
| inline | text | 3359 | 952 | 0.4600 | 0.000125 | 0.003208 |
| inline | image | 840 | 168 | 0.4067 | 0.000084 | 0.005833 |
| inline | newline | 2407 | 391 | 0.2635 | 0.000084 | 0.009292 |
| inline | linkify | 2407 | 0 | 0.2355 | 0.000084 | 0.000667 |
| block | paragraph | 449 | 449 | 0.2338 | 0.000292 | 0.017750 |

### code_block

- Input chars: 40020
- markdown-it-ts: 0.4937ms
- markdown-it: 0.6002ms
- Ratio: 0.823

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.3699 | 0.369875 | 0.369875 |
| block | code | 1 | 1 | 0.1947 | 0.194667 | 0.194667 |
| core | normalize | 1 | 1 | 0.0033 | 0.003333 | 0.003333 |
| block | table | 1 | 0 | 0.0006 | 0.000583 | 0.000583 |
| core | smartquotes | 1 | 1 | 0.0005 | 0.000542 | 0.000542 |
| core | text_join | 1 | 1 | 0.0005 | 0.000541 | 0.000541 |
| core | inline | 1 | 1 | 0.0004 | 0.000417 | 0.000417 |
| core | linkify | 1 | 1 | 0.0004 | 0.000416 | 0.000416 |

### newline

- Input chars: 40068
- markdown-it-ts: 2.5253ms
- markdown-it: 3.3301ms
- Ratio: 0.758

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.6042 | 9.604209 | 9.604209 |
| core | block | 1 | 1 | 3.2486 | 3.248583 | 3.248583 |
| inline | text | 12083 | 6360 | 1.0977 | 0.000083 | 0.005791 |
| inline | newline | 5723 | 4133 | 0.6249 | 0.000084 | 0.010000 |
| inline | escape | 1590 | 1590 | 0.6212 | 0.000125 | 0.442125 |
| block | paragraph | 637 | 637 | 0.5922 | 0.000875 | 0.033583 |
| inline | linkify | 5723 | 0 | 0.4362 | 0.000083 | 0.005542 |
| block | lheading | 637 | 0 | 0.2843 | 0.000375 | 0.027708 |

### fence

- Input chars: 40020
- markdown-it-ts: 0.6509ms
- markdown-it: 0.8754ms
- Ratio: 0.744

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.9345 | 0.934500 | 0.934500 |
| block | fence | 580 | 580 | 0.2897 | 0.000500 | 0.003292 |
| block | table | 580 | 0 | 0.0456 | 0.000083 | 0.001209 |
| block | code | 580 | 0 | 0.0416 | 0.000083 | 0.000625 |
| core | normalize | 1 | 1 | 0.0043 | 0.004292 | 0.004292 |
| core | inline | 1 | 1 | 0.0026 | 0.002625 | 0.002625 |
| core | text_join | 1 | 1 | 0.0016 | 0.001583 | 0.001583 |
| core | smartquotes | 1 | 1 | 0.0008 | 0.000792 | 0.000792 |

### reference_nested

- Input chars: 40092
- markdown-it-ts: 5.6831ms
- markdown-it: 9.2461ms
- Ratio: 0.615

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 91.3978 | 91.397791 | 91.397791 |
| core | block | 1 | 1 | 2.5927 | 2.592667 | 2.592667 |
| inline | text | 29171 | 4056 | 2.5211 | 0.000083 | 0.003959 |
| inline | emphasis | 23400 | 4368 | 2.2577 | 0.000083 | 0.018167 |
| inline | link | 19032 | 0 | 2.0809 | 0.000084 | 0.036875 |
| inline | newline | 25115 | 1715 | 1.9630 | 0.000083 | 0.007750 |
| inline | linkify | 25115 | 0 | 1.9017 | 0.000083 | 0.021417 |
| inline | strikethrough | 23400 | 0 | 1.7185 | 0.000083 | 0.019500 |

### reference_flat

- Input chars: 40290
- markdown-it-ts: 2.9046ms
- markdown-it: 8.0482ms
- Ratio: 0.361

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 26.6157 | 26.615750 | 26.615750 |
| core | block | 1 | 1 | 5.3235 | 5.323458 | 5.323458 |
| block | reference | 596 | 340 | 2.7304 | 0.003229 | 0.137791 |
| inline | link | 5950 | 595 | 1.6738 | 0.000125 | 0.024667 |
| inline | text | 7479 | 1360 | 0.7730 | 0.000083 | 0.009667 |
| inline | newline | 6119 | 169 | 0.5820 | 0.000083 | 0.007084 |
| inline | linkify | 6119 | 0 | 0.5598 | 0.000083 | 0.010375 |
| inline | backticks | 5950 | 0 | 0.5121 | 0.000083 | 0.003459 |

### links_nested

- Input chars: 40064
- markdown-it-ts: 4.9736ms
- markdown-it: 24.2600ms
- Ratio: 0.205

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 91.9223 | 91.922333 | 91.922333 |
| core | block | 1 | 1 | 3.3900 | 3.390042 | 3.390042 |
| inline | text | 29439 | 6400 | 2.6022 | 0.000083 | 0.024000 |
| inline | link | 22912 | 256 | 2.3272 | 0.000083 | 0.031500 |
| inline | newline | 23039 | 127 | 1.8443 | 0.000083 | 0.021125 |
| inline | image | 22656 | 0 | 1.8264 | 0.000083 | 0.034250 |
| inline | linkify | 23039 | 0 | 1.7461 | 0.000083 | 0.002166 |
| inline | html_inline | 22656 | 0 | 1.7198 | 0.000083 | 0.010084 |


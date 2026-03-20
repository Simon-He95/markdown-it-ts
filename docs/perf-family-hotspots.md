# Parser Family Hotspots

Lower ratio is better. Hotspots come from internal parser rule profiling (`core/block/inline/inline2`).

| Fixture | TS ms | markdown-it ms | Ratio | Top hotspot |
|:--|---:|---:|---:|:--|
| reference_flat | 10.3074 | 7.9053 | 1.304 | inline.link (262.7845ms) |
| reference_nested | 11.5308 | 9.1175 | 1.265 | inline.link (176.341ms) |
| html_inline | 2.7714 | 2.6698 | 1.038 | core.inline (17.7487ms) |
| blockquote_flat | 1.3302 | 1.3088 | 1.016 | core.block (3.9127ms) |
| emphasis_nested | 3.4537 | 3.4260 | 1.008 | core.inline (18.5007ms) |
| entity | 1.6140 | 1.6156 | 0.999 | core.inline (11.7828ms) |
| autolink | 2.3518 | 2.3674 | 0.993 | core.inline (9.7043ms) |
| list_nested | 3.4023 | 3.4515 | 0.986 | block.list (55.8427ms) |
| emphasis_flat | 3.9393 | 4.0173 | 0.981 | core.inline (27.1326ms) |
| hr | 2.3208 | 2.3782 | 0.976 | core.block (6.9421ms) |
| reference_list | 2.4220 | 2.4815 | 0.976 | core.block (14.8698ms) |
| plain_text | 0.4904 | 0.5100 | 0.962 | core.block (0.4655ms) |
| escape | 2.9797 | 3.1112 | 0.958 | core.inline (24.4692ms) |
| lheading | 2.6553 | 2.7783 | 0.956 | core.inline (46.077ms) |
| blockquote_nested | 1.3276 | 1.3908 | 0.955 | block.blockquote (32.6984ms) |
| emphasis_worst | 2.6452 | 2.8408 | 0.931 | core.inline (16.2075ms) |
| heading | 2.5443 | 2.7969 | 0.910 | core.inline (26.9072ms) |
| backticks | 1.6831 | 1.8510 | 0.909 | core.inline (9.5464ms) |
| list_flat | 2.6572 | 2.9477 | 0.901 | core.block (17.6409ms) |
| table | 2.3691 | 2.7109 | 0.874 | core.inline (7.8366ms) |
| links_flat | 2.1440 | 2.5443 | 0.843 | core.inline (9.6983ms) |
| newline | 2.5124 | 3.3172 | 0.757 | core.inline (8.9923ms) |
| fence | 0.6295 | 0.8533 | 0.738 | core.block (0.9302ms) |
| code_block | 0.4492 | 0.6116 | 0.734 | core.block (0.3901ms) |
| links_nested | 7.8820 | 24.0872 | 0.327 | inline.link (112.8945ms) |

## Detail

### reference_flat

- Input chars: 40290
- markdown-it-ts: 10.3074ms
- markdown-it: 7.9053ms
- Ratio: 1.304

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| inline | link | 11049 | 679 | 262.7845 | 0.000917 | 0.903042 |
| core | inline | 1 | 1 | 53.3374 | 53.337375 | 53.337375 |
| core | block | 1 | 1 | 5.5100 | 5.509958 | 5.509958 |
| block | reference | 596 | 340 | 2.8115 | 0.003209 | 0.112000 |
| inline | text | 12832 | 1530 | 1.1917 | 0.000083 | 0.004417 |
| inline | newline | 11302 | 253 | 1.0270 | 0.000083 | 0.046083 |
| inline | linkify | 11302 | 0 | 0.8937 | 0.000083 | 0.004917 |
| inline | backticks | 11049 | 0 | 0.8694 | 0.000083 | 0.023792 |

### reference_nested

- Input chars: 40092
- markdown-it-ts: 11.5308ms
- markdown-it: 9.1175ms
- Ratio: 1.265

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| inline | link | 36192 | 0 | 176.3410 | 0.000084 | 0.694833 |
| core | inline | 1 | 1 | 157.7903 | 157.790333 | 157.790333 |
| inline | text | 48203 | 5928 | 4.0423 | 0.000083 | 0.014459 |
| inline | emphasis | 40560 | 4368 | 4.0099 | 0.000083 | 0.523459 |
| inline | newline | 42275 | 1715 | 3.2149 | 0.000083 | 0.058334 |
| inline | linkify | 42275 | 0 | 3.1106 | 0.000083 | 0.016041 |
| inline | strikethrough | 40560 | 0 | 2.8981 | 0.000083 | 0.016584 |
| inline | escape | 40560 | 0 | 2.8756 | 0.000083 | 0.036209 |

### html_inline

- Input chars: 40248
- markdown-it-ts: 2.7714ms
- markdown-it: 2.6698ms
- Ratio: 1.038

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 17.7487 | 17.748750 | 17.748750 |
| core | block | 1 | 1 | 6.3530 | 6.352958 | 6.352958 |
| block | paragraph | 1249 | 1249 | 0.6430 | 0.000292 | 0.006209 |
| inline | text | 5927 | 2106 | 0.6134 | 0.000084 | 0.004583 |
| inline | html_inline | 3432 | 1014 | 0.5544 | 0.000125 | 0.007125 |
| block | lheading | 1249 | 0 | 0.4848 | 0.000208 | 0.004500 |
| inline | autolink | 3432 | 0 | 0.4662 | 0.000125 | 0.005167 |
| block | html_block | 1639 | 234 | 0.3736 | 0.000250 | 0.003667 |

### blockquote_flat

- Input chars: 40016
- markdown-it-ts: 1.3302ms
- markdown-it: 1.3088ms
- Ratio: 1.016

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 3.9127 | 3.912708 | 3.912708 |
| block | blockquote | 1149 | 165 | 2.9939 | 0.000125 | 0.100333 |
| core | inline | 1 | 1 | 2.7898 | 2.789750 | 2.789750 |
| inline | text | 2788 | 1476 | 0.3417 | 0.000125 | 0.002083 |
| block | paragraph | 328 | 328 | 0.2404 | 0.000708 | 0.035167 |
| inline | newline | 1312 | 1148 | 0.1406 | 0.000084 | 0.001292 |
| block | html_block | 984 | 0 | 0.1186 | 0.000084 | 0.023833 |
| block | lheading | 328 | 0 | 0.1149 | 0.000416 | 0.002000 |

### emphasis_nested

- Input chars: 40145
- markdown-it-ts: 3.4537ms
- markdown-it: 3.4260ms
- Ratio: 1.008

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 18.5007 | 18.500708 | 18.500708 |
| core | block | 1 | 1 | 3.6038 | 3.603834 | 3.603834 |
| inline | emphasis | 6216 | 6216 | 1.3068 | 0.000208 | 0.005708 |
| inline | text | 11913 | 5439 | 1.1512 | 0.000084 | 0.000834 |
| block | paragraph | 519 | 519 | 0.8586 | 0.002417 | 0.010125 |
| block | lheading | 519 | 0 | 0.8089 | 0.000875 | 0.037084 |
| inline | newline | 6474 | 258 | 0.4880 | 0.000083 | 0.000833 |
| inline | linkify | 6474 | 0 | 0.4854 | 0.000083 | 0.001250 |

### entity

- Input chars: 40016
- markdown-it-ts: 1.6140ms
- markdown-it: 1.6156ms
- Ratio: 0.999

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 11.7828 | 11.782750 | 11.782750 |
| core | block | 1 | 1 | 2.5735 | 2.573542 | 2.573542 |
| inline | text | 5123 | 2440 | 0.6027 | 0.000084 | 0.002667 |
| inline | entity | 2562 | 610 | 0.5675 | 0.000208 | 0.007791 |
| inline | newline | 2683 | 121 | 0.2313 | 0.000083 | 0.014791 |
| block | paragraph | 611 | 611 | 0.2089 | 0.000292 | 0.012167 |
| inline | linkify | 2683 | 0 | 0.2002 | 0.000083 | 0.001000 |
| inline | autolink | 2562 | 0 | 0.1966 | 0.000083 | 0.006125 |

### autolink

- Input chars: 40104
- markdown-it-ts: 2.3518ms
- markdown-it: 2.3674ms
- Ratio: 0.993

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.7043 | 9.704291 | 9.704291 |
| core | block | 1 | 1 | 3.6393 | 3.639292 | 3.639292 |
| inline | autolink | 1872 | 288 | 1.4304 | 0.000084 | 0.032041 |
| block | paragraph | 217 | 217 | 1.4053 | 0.007708 | 0.028917 |
| block | lheading | 217 | 0 | 1.3405 | 0.007459 | 0.032167 |
| inline | text | 3959 | 1512 | 0.4556 | 0.000084 | 0.001584 |
| inline | newline | 2447 | 575 | 0.2402 | 0.000083 | 0.007083 |
| inline | linkify | 2447 | 0 | 0.1879 | 0.000083 | 0.004667 |

### list_nested

- Input chars: 40215
- markdown-it-ts: 3.4023ms
- markdown-it: 3.4515ms
- Ratio: 0.986

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | list | 8189 | 5459 | 55.8427 | 0.000125 | 0.635584 |
| core | block | 1 | 1 | 21.4369 | 21.436917 | 21.436917 |
| block | lheading | 2100 | 0 | 4.8609 | 0.001917 | 0.549167 |
| block | paragraph | 2100 | 2100 | 4.6796 | 0.002041 | 0.050709 |
| core | inline | 1 | 1 | 3.2996 | 3.299625 | 3.299625 |
| block | hr | 8504 | 0 | 0.8104 | 0.000083 | 0.019666 |
| block | table | 8294 | 0 | 0.7570 | 0.000083 | 0.003375 |
| block | blockquote | 8504 | 0 | 0.7425 | 0.000083 | 0.030667 |

### emphasis_flat

- Input chars: 40145
- markdown-it-ts: 3.9393ms
- markdown-it: 4.0173ms
- Ratio: 0.981

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 27.1326 | 27.132625 | 27.132625 |
| core | block | 1 | 1 | 3.6920 | 3.691958 | 3.691958 |
| inline | emphasis | 9324 | 9324 | 1.7565 | 0.000167 | 0.023625 |
| inline | text | 18129 | 8547 | 1.6692 | 0.000083 | 0.005833 |
| block | paragraph | 519 | 519 | 0.8936 | 0.002750 | 0.024167 |
| block | lheading | 519 | 0 | 0.8101 | 0.002583 | 0.021791 |
| inline | linkify | 9582 | 0 | 0.7316 | 0.000083 | 0.008459 |
| inline | newline | 9582 | 258 | 0.7054 | 0.000083 | 0.001625 |

### hr

- Input chars: 40044
- markdown-it-ts: 2.3208ms
- markdown-it: 2.3782ms
- Ratio: 0.976

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 6.9421 | 6.942125 | 6.942125 |
| core | inline | 1 | 1 | 3.6915 | 3.691459 | 3.691459 |
| block | lheading | 564 | 0 | 1.0945 | 0.001791 | 0.050334 |
| inline | emphasis | 564 | 564 | 1.0439 | 0.000833 | 0.508667 |
| block | paragraph | 564 | 564 | 1.0082 | 0.001708 | 0.026959 |
| block | hr | 3382 | 2818 | 0.6331 | 0.000208 | 0.002459 |
| block | table | 3382 | 0 | 0.2911 | 0.000083 | 0.001209 |
| block | fence | 3382 | 0 | 0.2840 | 0.000083 | 0.000666 |

### reference_list

- Input chars: 40664
- markdown-it-ts: 2.4220ms
- markdown-it: 2.4815ms
- Ratio: 0.976

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 14.8698 | 14.869792 | 14.869792 |
| block | reference | 2600 | 2600 | 9.1811 | 0.003375 | 0.086875 |
| block | blockquote | 5199 | 0 | 0.5197 | 0.000083 | 0.073250 |
| block | table | 5199 | 0 | 0.5135 | 0.000083 | 0.042417 |
| block | fence | 5199 | 0 | 0.4791 | 0.000083 | 0.016708 |
| block | hr | 5199 | 0 | 0.4776 | 0.000083 | 0.013500 |
| block | list | 5199 | 0 | 0.4683 | 0.000083 | 0.007708 |
| block | html_block | 2599 | 0 | 0.2511 | 0.000084 | 0.001250 |

### plain_text

- Input chars: 41679
- markdown-it-ts: 0.4904ms
- markdown-it: 0.5100ms
- Ratio: 0.962

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.4655 | 0.465458 | 0.465458 |
| core | inline | 1 | 1 | 0.4653 | 0.465334 | 0.465334 |
| inline | text | 143 | 99 | 0.1365 | 0.000167 | 0.004500 |
| block | reference | 77 | 11 | 0.0778 | 0.000208 | 0.010208 |
| inline | link | 22 | 22 | 0.0448 | 0.002042 | 0.003708 |
| block | paragraph | 66 | 66 | 0.0211 | 0.000292 | 0.001083 |
| block | lheading | 66 | 0 | 0.0142 | 0.000208 | 0.000667 |
| inline | emphasis | 44 | 22 | 0.0081 | 0.000146 | 0.000875 |

### escape

- Input chars: 40077
- markdown-it-ts: 2.9797ms
- markdown-it: 3.1112ms
- Ratio: 0.958

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 24.4692 | 24.469166 | 24.469166 |
| core | block | 1 | 1 | 3.8994 | 3.899375 | 3.899375 |
| inline | escape | 15768 | 15549 | 1.6420 | 0.000084 | 0.008875 |
| inline | text | 20804 | 4380 | 1.6411 | 0.000083 | 0.001000 |
| inline | linkify | 16424 | 0 | 1.2602 | 0.000083 | 0.034167 |
| inline | newline | 16424 | 656 | 1.2148 | 0.000083 | 0.009333 |
| block | paragraph | 877 | 877 | 0.4259 | 0.000458 | 0.004333 |
| core | text_join | 1 | 1 | 0.3454 | 0.345375 | 0.345375 |

### lheading

- Input chars: 40002
- markdown-it-ts: 2.6553ms
- markdown-it: 2.7783ms
- Ratio: 0.956

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 46.0770 | 46.077042 | 46.077042 |
| core | block | 1 | 1 | 4.3807 | 4.380667 | 4.380667 |
| inline | text | 14158 | 1061 | 1.0871 | 0.000083 | 0.006458 |
| inline | newline | 13097 | 707 | 1.0566 | 0.000083 | 0.013625 |
| inline | linkify | 13097 | 0 | 0.9599 | 0.000083 | 0.001167 |
| inline | html_inline | 12390 | 0 | 0.9255 | 0.000083 | 0.011458 |
| inline | image | 12390 | 0 | 0.9057 | 0.000083 | 0.020625 |
| inline | emphasis | 12390 | 0 | 0.8908 | 0.000083 | 0.006459 |

### blockquote_nested

- Input chars: 40115
- markdown-it-ts: 1.3276ms
- markdown-it: 1.3908ms
- Ratio: 0.955

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| block | blockquote | 4188 | 1814 | 32.6984 | 0.000083 | 0.563458 |
| core | block | 1 | 1 | 8.5220 | 8.522000 | 8.522000 |
| core | inline | 1 | 1 | 1.1581 | 1.158125 | 1.158125 |
| block | paragraph | 679 | 679 | 0.7715 | 0.001166 | 0.012417 |
| block | lheading | 679 | 0 | 0.6560 | 0.001083 | 0.003542 |
| block | fence | 4188 | 0 | 0.3262 | 0.000083 | 0.011250 |
| block | table | 2493 | 0 | 0.1960 | 0.000083 | 0.001125 |
| block | list | 2374 | 0 | 0.1918 | 0.000083 | 0.006542 |

### emphasis_worst

- Input chars: 40136
- markdown-it-ts: 2.6452ms
- markdown-it: 2.8408ms
- Ratio: 0.931

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 16.2075 | 16.207458 | 16.207458 |
| core | block | 1 | 1 | 3.5879 | 3.587917 | 3.587917 |
| block | paragraph | 465 | 465 | 1.1537 | 0.002333 | 0.380000 |
| inline | emphasis | 5568 | 5568 | 1.1288 | 0.000208 | 0.007958 |
| inline | text | 11367 | 5568 | 1.1252 | 0.000084 | 0.013500 |
| block | lheading | 465 | 0 | 0.7163 | 0.001250 | 0.027291 |
| inline | newline | 5799 | 231 | 0.4417 | 0.000083 | 0.000709 |
| inline | linkify | 5799 | 0 | 0.4392 | 0.000083 | 0.011792 |

### heading

- Input chars: 40098
- markdown-it-ts: 2.5443ms
- markdown-it: 2.7969ms
- Ratio: 0.910

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 26.9072 | 26.907166 | 26.907166 |
| core | block | 1 | 1 | 14.7206 | 14.720583 | 14.720583 |
| block | fence | 2932 | 0 | 1.4615 | 0.000084 | 1.156875 |
| block | lheading | 326 | 0 | 1.3818 | 0.003209 | 0.070375 |
| block | paragraph | 326 | 326 | 1.2711 | 0.003417 | 0.025875 |
| block | reference | 2282 | 0 | 1.0340 | 0.000333 | 0.067666 |
| inline | text | 7824 | 652 | 0.7460 | 0.000083 | 0.006584 |
| inline | escape | 7172 | 1630 | 0.6669 | 0.000083 | 0.002542 |

### backticks

- Input chars: 40000
- markdown-it-ts: 1.6831ms
- markdown-it: 1.8510ms
- Ratio: 0.909

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.5464 | 9.546375 | 9.546375 |
| core | block | 1 | 1 | 6.0937 | 6.093666 | 6.093666 |
| block | paragraph | 626 | 626 | 1.9053 | 0.002917 | 0.035958 |
| block | lheading | 626 | 0 | 1.8763 | 0.002791 | 0.028083 |
| inline | text | 6874 | 2500 | 0.6023 | 0.000083 | 0.000875 |
| inline | backticks | 3750 | 3750 | 0.5964 | 0.000166 | 0.020750 |
| inline | newline | 4374 | 624 | 0.3329 | 0.000083 | 0.000834 |
| inline | linkify | 4374 | 0 | 0.3224 | 0.000083 | 0.000958 |

### list_flat

- Input chars: 40248
- markdown-it-ts: 2.6572ms
- markdown-it: 2.9477ms
- Ratio: 0.901

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 17.6409 | 17.640875 | 17.640875 |
| block | list | 5227 | 2887 | 15.9613 | 0.000125 | 0.212916 |
| block | paragraph | 2340 | 2340 | 3.0338 | 0.000583 | 0.061542 |
| block | lheading | 2340 | 0 | 2.4908 | 0.000292 | 0.024167 |
| core | inline | 1 | 1 | 1.9033 | 1.903333 | 1.903333 |
| block | hr | 6397 | 156 | 0.6448 | 0.000083 | 0.005250 |
| block | fence | 6397 | 0 | 0.5635 | 0.000083 | 0.016834 |
| block | blockquote | 6397 | 0 | 0.5428 | 0.000083 | 0.000750 |

### table

- Input chars: 40132
- markdown-it-ts: 2.3691ms
- markdown-it: 2.7109ms
- Ratio: 0.874

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 7.8366 | 7.836584 | 7.836584 |
| core | block | 1 | 1 | 4.3559 | 4.355875 | 4.355875 |
| block | table | 317 | 238 | 4.1215 | 0.011041 | 0.071583 |
| inline | emphasis | 1562 | 158 | 0.1435 | 0.000083 | 0.005875 |
| inline | text | 1641 | 79 | 0.1264 | 0.000083 | 0.001042 |
| inline | linkify | 1562 | 0 | 0.1182 | 0.000083 | 0.000583 |
| inline | strikethrough | 1562 | 0 | 0.1122 | 0.000083 | 0.000500 |
| inline | newline | 1562 | 0 | 0.1119 | 0.000083 | 0.000375 |

### links_flat

- Input chars: 40712
- markdown-it-ts: 2.1440ms
- markdown-it: 2.5443ms
- Ratio: 0.843

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 9.6983 | 9.698250 | 9.698250 |
| inline | link | 1120 | 280 | 2.3874 | 0.000125 | 0.044209 |
| core | block | 1 | 1 | 2.1225 | 2.122500 | 2.122500 |
| inline | escape | 2016 | 896 | 0.6298 | 0.000084 | 0.413292 |
| inline | text | 3359 | 952 | 0.4820 | 0.000125 | 0.021833 |
| inline | image | 840 | 168 | 0.4337 | 0.000125 | 0.020833 |
| inline | newline | 2407 | 391 | 0.2809 | 0.000084 | 0.030250 |
| inline | linkify | 2407 | 0 | 0.2344 | 0.000084 | 0.000500 |

### newline

- Input chars: 40068
- markdown-it-ts: 2.5124ms
- markdown-it: 3.3172ms
- Ratio: 0.757

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | inline | 1 | 1 | 8.9923 | 8.992333 | 8.992333 |
| core | block | 1 | 1 | 3.3115 | 3.311458 | 3.311458 |
| inline | text | 12083 | 6360 | 1.0945 | 0.000083 | 0.003000 |
| inline | newline | 5723 | 4133 | 0.6042 | 0.000084 | 0.003125 |
| block | paragraph | 637 | 637 | 0.5478 | 0.000875 | 0.005667 |
| inline | linkify | 5723 | 0 | 0.4288 | 0.000083 | 0.004917 |
| block | lheading | 637 | 0 | 0.2933 | 0.000416 | 0.028125 |
| core | text_join | 1 | 1 | 0.2114 | 0.211416 | 0.211416 |

### fence

- Input chars: 40020
- markdown-it-ts: 0.6295ms
- markdown-it: 0.8533ms
- Ratio: 0.738

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.9302 | 0.930209 | 0.930209 |
| block | fence | 580 | 580 | 0.2783 | 0.000458 | 0.003584 |
| block | table | 580 | 0 | 0.0478 | 0.000083 | 0.000875 |
| block | code | 580 | 0 | 0.0434 | 0.000083 | 0.000375 |
| core | inline | 1 | 1 | 0.0048 | 0.004791 | 0.004791 |
| core | normalize | 1 | 1 | 0.0030 | 0.003000 | 0.003000 |
| core | text_join | 1 | 1 | 0.0015 | 0.001458 | 0.001458 |
| core | linkify | 1 | 1 | 0.0008 | 0.000750 | 0.000750 |

### code_block

- Input chars: 40020
- markdown-it-ts: 0.4492ms
- markdown-it: 0.6116ms
- Ratio: 0.734

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| core | block | 1 | 1 | 0.3901 | 0.390125 | 0.390125 |
| block | code | 1 | 1 | 0.1977 | 0.197666 | 0.197666 |
| core | normalize | 1 | 1 | 0.0045 | 0.004500 | 0.004500 |
| core | linkify | 1 | 1 | 0.0009 | 0.000916 | 0.000916 |
| core | replacements | 1 | 1 | 0.0008 | 0.000792 | 0.000792 |
| core | inline | 1 | 1 | 0.0007 | 0.000666 | 0.000666 |
| core | smartquotes | 1 | 1 | 0.0005 | 0.000542 | 0.000542 |
| core | text_join | 1 | 1 | 0.0005 | 0.000500 | 0.000500 |

### links_nested

- Input chars: 40064
- markdown-it-ts: 7.8820ms
- markdown-it: 24.0872ms
- Ratio: 0.327

| Chain | Rule | Calls | Hits | Inclusive ms | Median ms | Max ms |
|:--|:--|---:|---:|---:|---:|---:|
| inline | link | 26240 | 512 | 112.8945 | 0.000083 | 0.313417 |
| core | inline | 1 | 1 | 103.8817 | 103.881667 | 103.881667 |
| core | block | 1 | 1 | 3.3487 | 3.348667 | 3.348667 |
| inline | text | 33023 | 6656 | 2.7500 | 0.000083 | 0.002917 |
| inline | newline | 26367 | 127 | 2.0472 | 0.000083 | 0.010709 |
| inline | backticks | 26240 | 0 | 2.0127 | 0.000083 | 0.056208 |
| inline | html_inline | 25728 | 0 | 1.9754 | 0.000083 | 0.014916 |
| inline | linkify | 26367 | 0 | 1.9651 | 0.000083 | 0.002167 |


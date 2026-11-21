# csv-reader-speed

[![LIVE](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Unknown77777777777/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Unknown77777777777/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun)

A fast, dependency-free CSV reader for broken CSV files. `solve.js` exports
`run(input)`, which returns exactly what csv-reader 1.0.0 returns for
`{text, header}` — `{columns, rows, errors}` — including its broken-row
policy (stray CRs, unterminated quotes, quote junk, short/long rows).

It is fast because it scans instead of building strings character by
character: each field is located with one `charCodeAt` sweep and copied out
with a single `slice`. `main.ts` is the harness driver: it reads
`/input/cases.json`, answers every case with `run`, and writes
`/output/answers.json`.

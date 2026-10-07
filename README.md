# dsh-token-cat

Token usage and cost tracking for the DeepSeek Harness, with a cat that lives at
the bottom of the desktop.

## What it does

**Usage and cost.** The host half folds every `usage` record off the durable
session log — input, output, cache read, cache write and reasoning tokens, each
tagged with the provider and model that actually served the call. It seeds from
the sessions already live at startup, then follows the log. Cost is
cache-aware: cache reads and writes are carved out of the inclusive input count
and billed at their own rate instead of being double charged.

**The cat.** A behaviour state machine, not a loop. It picks random destinations
along the bottom edge, usually stops on arrival, turns to face the viewer with
tracking eyes and a blink, and works through grooming, sleeping with `z`s,
stretching and alert poses before moving on. While a model call is in flight it
sprints and biases toward stopping and staring.

Click the cat or the pill to open the breakdown: totals, a token-type grid, top
models and top sessions. The pill's dot pulses while the harness is working.

## Cost is an estimate

The harness exposes no pricing service, so cost is computed locally from the
`RATES` table at the top of `lib/index.js`. It ships with DeepSeek's published
list rates; **your model may fall through to the generic `deepseek` entry and
your real billing rate may differ.** The panel footer always states the rate in
use. Edit that table to correct it — the first matching key wins, so keep
specific models first and the empty-string entry last.

## Layout

| file | face | role |
| --- | --- | --- |
| `lib/index.js` | host | folds usage from the session log, serves `/dsh-token-cat/{snapshot,reset}` |
| `lib/client.js` | web | the cat and the HUD, registered in `shell.overlay` |
| `cordis.patch.yml` | — | inserts the plugin row into the web profile roster |

## Notes

Counters cover sessions observed while running, plus those live at startup. A
session from a previous process run is not backfilled.

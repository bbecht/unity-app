# Unity powerbuilding app

Personal, offline-first tracker for the Meadows/Tate Unity program on a repeating 13-week cycle.
No build step, no framework, no server dependency. Everything lives in the browser's localStorage.

## Run it

Serve the folder over HTTP (service workers need http or https, not file://):

```bash
python -m http.server 8787
```

Open http://localhost:8787 on the phone or desktop. After the first load it works fully offline and can be
installed to the home screen (Add to Home Screen / Install app).

Tests:

```bash
node --test test/engine.test.mjs
```

## On the phone

Hosted at https://bbecht.github.io/unity-app/ from the `main` branch of https://github.com/bbecht/unity-app.
Open that URL on the phone, add it to the home screen, open it once online, and it works offline after that.

To ship a change: bump `VERSION` in `sw.js`, commit, and push `main`. Pages rebuilds in about a minute.
The phone picks up the new files the next time the app is opened online.

## Starting point

A fresh install opens at cycle 1, week 7, day 2, because the athlete was already two thirds through the
program when the app was built. Accessory work in that first week shows UNANCHORED (there is no logged
prior week yet); enter the weights you have been using and the progression picks up from week 8.
Change position any time from More > Position and 1RMs.

## Layout

| File | What it does |
|---|---|
| `js/store.js` | localStorage persistence, export/import, migrations |
| `js/program.js` | exercise catalog, weeks 1 to 9, substitutions, RPE scale |
| `js/phases.js` | weeks 10 to 13 (deload, peak, test, transition) |
| `js/engine.js` | percentages, progression, 1RM estimate, cycle position, volume, bodyweight trend, nutrition |
| `js/actions.js` | state transitions: start, log, complete, skip, test rollover |
| `js/notion.js` | push-only sync queue and Notion payload mapping |
| `js/timer.js` | rest timer with beeps and vibration |
| `js/views/*` | Train, Check-in, Progress, More |
| `sw.js` | offline shell cache |
| `notion-proxy/worker.js` | Cloudflare Worker that forwards to the Notion API |

## Things to review before trusting the numbers

**1. The exercise lists for weeks 1 to 9 are a reconstruction.** The build spec gave the percentage schedule,
the split, the substitutions, and the common set/rep patterns. It did not include the book's exercise-by-exercise
tables, and the book was not available while building. `js/program.js` contains the best reconstruction of the
accessory work, set counts, and rep targets. Check it against the book and edit the data file directly. Each
line is a single builder call, for example `R('leg_press', 3, 10)` or `P('de_squat', 'squat', 55, 10, 2)`.

The items that came straight from the spec and should not need changes: every dynamic-effort percentage, the
speed-pull percentages and the two-wave layout in weeks 7 to 9, the max-effort variation per block and its top-set
percentages, the three substitutions, and the dumbbell work that stays as written.

**2. Weeks 10 to 13 are not from the program.** They follow the spec's deload and peak design:

- Week 10: week 1 shape, sets halved, percentage work at 50%, RPE cap 7, no drop sets, LISS only.
- Week 11: three sessions, competition lifts to a heavy double at 90%, two accessories capped at RPE 7, LISS on the other two days.
- Week 12: opener 3 x 2 at 70% on all three, test day A (squat then bench), test day B (deadlift).
- Week 13: week 1 shape at 90% of the new prescription, RPE cap 8, conditioning back.

Finishing test day B recalculates all three 1RMs from the best logged triple on each test day, using the lowest of
Brzycki, Epley, Lander and O'Conner, rounded down to 5 lb. The old numbers go to history with the delta.
The cycle counter increments after the last session of week 13.

## Progression rules as implemented

- Percentage work never looks at history. It reads the stored 1RM and rounds down to the barbell increment.
- Relative work reads the same exercise in the prior week of the cycle (week 1 reads week 13 of the prior cycle).
  Hit (every working set reached the prescribed reps) applies the program's progression. Miss holds weight and reps.
  No prior data shows an UNANCHORED flag with a hint from the last time the exercise was ever logged.
- Feeder sets are excluded from volume, progression, and hit/miss.
- Week 13 anchors relative work to the last logged instance at 90%.

## Notion

Browsers cannot call `api.notion.com` directly, so sync goes through the worker in `notion-proxy/`.
Deploy it, set `NOTION_TOKEN` and `APP_KEY` as secrets, then in the app under More > Notion sync enter the
worker URL as the endpoint, the `APP_KEY` as the token, and the three database IDs. Expected properties are
listed in that screen. Nothing is sent until an endpoint is set; the queue just accumulates.

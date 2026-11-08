# HoopMetrics — Advanced NBA Analytics

**Live site after GitHub Pages is enabled:** https://8bitgolfer.github.io/HoopMetrics/

A responsive, browser-only advanced analytics site for the **completed 2025–26 NBA regular season**.

## Features

- **Scoring:** PPG, TS%, TS+, rTS (percentage points), eFG%, eFG+, points above league-average scoring efficiency per game, estimated season true-shooting attempts, usage rate.
- **Playmaking:** AST%, AST/TO, TOV%, assists, usage rate, free-throw rate and three-point attempt rate. We do **not** claim to measure actual unassisted shot creation without tracking data.
- **Defense:** STL%, BLK%, defensive BPM, offensive/defensive/total rebound percentages, steals, blocks and defensive win shares.
- **Impact:** BPM, OBPM, DBPM, VORP, win shares, WS/48, PER.
- **Filters:** Team, position (PG/SG/SF/PF/C and groups), starter/bench status based on starts percentage, games, estimated shooting attempts, PPG, USG%. PPG and USG% support custom decimal thresholds and at-least / at-most / approximately.
- **Player profiles:** Detail drawer with category metric values and percentile bars.
- **Compare players:** Side-by-side comparison of metrics.
- **Stats assistant:** A conversational **browser-based statistical question parser** for defined leaderboard, percentile, position and player-comparison queries. Try: `Who is in the 90th percentile or higher in scoring efficiency?` or `Top 10 players in BPM`. This is **not** a general-purpose LLM; no API token or paid service is required.
- Search, multi-column sorting, and CSV export.

## Metric calculations

- League TS%: **58.1%** in 2025–26
- League eFG%: **54.6%** in 2025–26
- `TS+ = 100 × player TS% / league TS%`
- `rTS = 100 × (player TS − league TS)`, percentage points
- `eFG+ = 100 × player eFG% / league eFG%`
- `TSA/game = FGA/game + 0.44 × FTA/game`
- `PAA/game = PPG − 2 × TSA/game × league TS`
- `AST/TO = assists per game / turnovers per game`
- A qualified percentile pool uses **at least 41 games** and **at least 500 estimated shooting attempts**; it is not a position-relative percentile.
- Percentiles use midranks to account for ties. TOV% and TOV are reversed when displaying an oriented percentile.
- Only valid numeric metric values enter percentile calculations.

**Precision note:** TS% uses the published advanced season-level TS% value (rounded to 3 decimals) where available. PAA, TSA and AST/TO use rounded published per-game source data and are therefore approximate.

## Data sources

This is an **unofficial** third-party fan project.

- [2025–26 per-game player dataset](https://github.com/Baileyd18/NBA-Player-Impact-and-Value-Dashboard-2025-26/blob/main/Data/raw_per_game.csv)
- [2025–26 advanced player dataset](https://github.com/Baileyd18/NBA-Player-Impact-and-Value-Dashboard-2025-26/blob/main/Data/raw_advanced.csv)
- [Basketball Reference NBA league averages](https://www.basketball-reference.com/leagues/NBA_stats_per_game.html)
- [Basketball Reference metric glossary](https://www.basketball-reference.com/about/glossary.html)

The site fetches both CSV datasets from the original public GitHub project at runtime. Traded players are deduplicated using combined-season records where available. Data availability depends on that external source staying online.

Defensive on/off, play-by-play adjusted impact, rim deterrence, potential assists, shot difficulty, and AI-generated freeform explanations are **not** included because the necessary source data or secure AI backend has not been connected. Do not interpret a single box-score metric as definitive player value.

## Deploy

1. Go to GitHub **Settings → Pages**.
2. Set source to **Deploy from a branch**.
3. Choose **main** and **/ (root)**.
4. Save, then open https://8bitgolfer.github.io/HoopMetrics/

No build pipeline, server, or secret key is needed. Files: `index.html`, `styles.css`, `app.js`.

## Future optional LLM support

A genuine generative AI assistant should use a **server-side** endpoint that handles all API keys, rate limits, and data retrieval. Do not put API keys into GitHub Pages JavaScript.

## Simplified interface (November 2026)

- Horizontal navigation: **Players, Compare, Ask HoopMetrics, About stats**.
- A focused player leaderboard with four default category columns; **Customize columns** reveals all supported advanced metrics.
- Team, position, games and search remain visible; starter/bench, TSA, decimal PPG and USG filters are available via **Advanced filters**.
- Click the **ⓘ** icon in a metric header to read a plain-language explanation.
- Click a player to open a profile with four expandable groups: Scoring, Playmaking, Defense and Impact.
- Floating **Ask HoopMetrics** shortcut opens the browser-based stats assistant.
- Mobile-friendly layout; no permanent desktop sidebar.

The assistant is still a rules-based query engine using the season dataset, **not a generative AI model**.

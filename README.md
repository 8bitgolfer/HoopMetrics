# HoopMetrics — NBA Advanced Statistics

A static NBA analytics site built for GitHub Pages. Initial feature: **2025–26 True Shooting+ (TS+)** with search, sorting, filters, and CSV export.

## Metrics
- True Shooting Percentage: `PTS / [2 × (FGA + 0.44 × FTA)]`
- TS+: `100 × player TS% / league TS%`
- Reference league TS%: **58.1%** for 2025–26
- **100 = league average**, **110 = 10% above**, **90 = 10% below**

## Data
At runtime the webpage fetches the [2025–26 player per-game CSV](https://github.com/Baileyd18/NBA-Player-Impact-and-Value-Dashboard-2025-26/blob/main/Data/raw_per_game.csv). It covers all listed players, including small-sample players. Players traded mid-season use aggregate rows where available. Because the input uses rounded per-game numbers, TS% and TS+ may differ slightly from exact season-total computations.

League baseline source: [Basketball-Reference](https://www.basketball-reference.com/leagues/NBA_stats_per_game.html). This is an unofficial fan project.

## Publish
GitHub repository **Settings → Pages → Deploy from a branch → main / (root)**. The site will be available at `https://8bitgolfer.github.io/HoopMetrics/` once Pages successfully deploys.

No framework, build commands, or API key required.
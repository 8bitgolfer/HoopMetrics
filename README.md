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

## Real AI mode (requires deployment)

HoopMetrics now includes an **optional secure AI backend** in `backend/`, using the OpenAI Responses API and controlled tool calls over the 2025–26 player datasets. With this mode enabled, the assistant can interpret multi-condition questions, request additional data for an answer, compare players, and understand recent follow-up context. No model can guarantee an accurate answer to literally every question; unsupported data sources are explicitly identified.

**Current website default:** The existing browser-based stats-query parser continues to run until a secure AI backend is deployed and connected. The AI feature is **not active** just because the code exists in GitHub.

### Deploy the backend

1. In your Render dashboard, create a **Blueprint** from your `8bitgolfer/HoopMetrics` repository using the checked-in `render.yaml`. Alternatively, create a Node Web Service with root directory `backend`, build command `npm install`, start command `npm start`.
2. On Render, set the **secret environment variable** `OPENAI_API_KEY` to an API key created in your own OpenAI API account. **Never commit, paste, or send the key to the chatbot or a public repository.**
3. Keep `OPENAI_MODEL=gpt-5-mini` (or set it to a compatible Responses API model available in your account), and `ALLOWED_ORIGIN=https://8bitgolfer.github.io`.
4. After Render deployment succeeds, verify the endpoint `https://YOUR-RENDER-SERVICE.onrender.com/health` returns `{"ok":true,...,"aiConfigured":true}`.
5. Edit the public `ai-config.js` file to set `window.HOOPMETRICS_AI_API = "https://YOUR-RENDER-SERVICE.onrender.com";`. This is a public server address, **not** an API key.
6. Refresh the GitHub Pages site. The chatbot indicator should display **AI CONNECTED** instead of **STATS MODE**.

### Security and cost

- Responses API calls are **billed separately** from ChatGPT subscriptions; check your API account billing and usage.
- Never expose the API key to client-side JavaScript.
- CORS is restricted to the configured GitHub Pages origin.
- The backend currently applies basic in-memory per-IP (12 per 10 minutes) and global (300 per day) limits. For public production use, add durable rate limiting, login/bot protection, monitoring, and account-level spending limits. In-memory limits reset on restarts and do not protect against multiple instances.
- The dataset comes from a third-party public GitHub source and is cached for 24 hours. It contains 2025–26 regular-season data, not real-time 2026–27 stats.
- The browser sends recent chat messages to the configured server for conversational context; do not enter personal or private data.

### Basic tests

- Ask: "Which guards scored at least 20 PPG with TS+ above 110 and usage over 25%?"
- Follow with: "Of those, who had the lowest turnover percentage?"
- Ask: "Compare Nikola Jokic and Shai Gilgeous-Alexander in scoring efficiency, BPM and playmaking."
- Ask about unavailable 2026–27 data; the AI should disclose that the connected source covers 2025–26.

**The deployed AI server, API key and billing remain yours to configure.**

## Gemini free-tier configuration (November 2026)
The HoopMetrics backend is now configured for **Google Gemini 2.5 Flash**, through Google's OpenAI-compatible Chat Completions API, rather than the paid OpenAI API. Create a Gemini API key at https://aistudio.google.com/api-keys and store it **only** in the Render environment as `GEMINI_API_KEY`. The Render Blueprint also sets `GEMINI_MODEL=gemini-2.5-flash` and the frontend `ai-config.js` points to `https://hoopmetrics-ai.onrender.com`. Never paste a key into GitHub or into a public chat.

The Render Blueprint should sync the new environment variable names. After the sync, add the Gemini key in Render's Environment page and use **Save, rebuild and deploy** if prompted. The service's `/health` endpoint should report `aiConfigured: true`. On the page, the indicator reads **AI CONNECTED** when an API endpoint is configured; that alone is not proof the secret is valid, so test a statistical question after deployment.

Gemini has a **limited free tier**, subject to provider limits and eligibility; do not enable billing if you want to stay on the free tier. Free-tier input may be used by Google to improve products under its stated policies. A publicly accessible chatbot may exhaust free usage limits quickly. If the provider rate limit is exceeded, the backend will return an error; it will not silently switch to a paid model.

Older OpenAI-specific instructions earlier in this README are superseded by this Gemini configuration.

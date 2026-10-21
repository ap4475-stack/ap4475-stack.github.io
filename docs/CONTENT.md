# CONTENT (owned by @relevance)

Audience: recruiters and engineers at quant trading firms (SIG, Optiver, Jane Street, IMC, Akuna) and AI-engineering teams.
Rule: every claim on the page traces to a source below. If it is not here, it is not on the page.

## Bio

| Claim | Source |
|---|---|
| Aviv Pinto, Columbia University, BA Mathematics and Statistics | `~/work/quant-roles/profile.json` |
| Expected graduation May 2028; recruiting for Summer 2027 | `profile.json` |
| Tracks: quant trading, quant research, systematic strategy | `profile.json` |
| Languages: Python, Java, SQL. Tools: PyTorch, XGBoost, H2O, WRDS | `profile.json` |
| TypeScript (in Skills) | Nudge codebase, ~8.3k lines |
| lobkit 119 tests | `grep -c 'def test_'` on 2026-10-21 (STATUS.md's 118 is from its 2026-09-02 snapshot) |
| GitHub `ap4475-stack` (name "Aviv Pinto", 4 public repos) | `gh api users/ap4475-stack`, 2026-10-20 |
| Location | not on the page until Aviv confirms |

Contact details, résumé and other personal items stay out until Aviv approves them (tracked in `docs/PRIVATE.md`, gitignored).

## Projects (ranked)

### 1. lobkit: Kalshi order-book simulator
- One line: Rebuilds Kalshi limit-order books and predicts whether a resting order fills, with every number tagged OBSERVED, DERIVED, ESTIMATED or ASSUMED.
- Stack: Python.
- Metrics: 9,995 hypothetical orders over 209 markets. Brier 0.0502 vs 0.0539 base rate (skill +0.069). AUC 0.67 to 0.70 on a held-out half. Shuffled-label control drops skill to -0.122. 119 tests, about 14.3k lines.
- Honest limit: 44.6% of orders are ambiguous from L2 data alone.
- Source: `~/work/kalshibot/STATUS.md` (2026-09-02); LOC and test counts from relevance scan.
- Link: private.

### 2. CallIt: group prediction app (team)
- One line: A private group posts a call, everyone answers once, and the group sees who called it.
- Role: marketing manager, CallIt coin design, UI design. Team of five.
- Stack: Next.js, Supabase, Vite.
- Metrics: live at call-it.app and app.call-it.app (both 200 on 2026-10-20); 301 commits in the team repo, shown as 300+.
- Source: `CallIt-github/AGENTS.md`, `git log`.
- Links: https://call-it.app, https://app.call-it.app.

### 3. Nudge: AI receivables agent
- One line: Follows up on unpaid invoices over WhatsApp and Gmail; a Claude tool-use loop records promises to pay and disputes, with a human-takeover dashboard.
- Stack: Next.js 15, Supabase Postgres (RLS), Claude tool use, WhatsApp Cloud API, Gmail API.
- Metrics: about 8.3k lines TypeScript (all .ts/.tsx outside node_modules); 63 to 79 test cases depending on the count, shown as 60+.
- Source: relevance scan of `~/work/nudge-ar`.
- Link: private.

### 4. Research Agent: evidence-first research workspace
- One line: Local research workspace that stores evidence and uncertainty before it ranks anything; unknown is never scored as low.
- Stack: Python.
- Metrics: 485 `def test_` functions across 42 test files, about 16.4k lines in src.
- Source: relevance scan of `~/work/research_agent`.
- Link: private.

### 5. Orchestra: cost-aware multi-agent runner
- One line: A frontier model plans, cheap local or cloud models do the work, and a SQLite ledger records every call.
- Stack: Python, Ollama, SQLite.
- Metrics: about 1.4k lines.
- Source: relevance scan of `~/work/orchestra`.
- Link: private.

### 6. quant-roles: open-role tracker
- One line: Pulls open quant roles from public job-board APIs and checks every link.
- Stack: Python.
- Metrics: 144 roles across 26 firms in the Aug 28 README snapshot . Re-run `./run.sh` to refresh.
- Source: `~/work/quant-roles/QUANT-ROLES.md` (header and table); ATS list from `probe_firm.py`.
- Link: private.

---

# v3 sources: résumé (provided by Aviv, 2026-10-21)

Source file: `~/Documents/Aviv_Pinto_Resume_.pdf`, supplied by Aviv for the site. These are his own statements. Show them as he wrote them, and don't add deal names, tickers or client details beyond what the résumé says.

## Contact (approved by Aviv by supplying the résumé)
- Email aviv.pinto.lh@gmail.com · quant-universe.com · github.com/ap4475-stack · New York, NY

## Education
- Columbia University, B.A. Mathematics & Statistics, expected May 2028.
- Honors: Dean's List 2025; GS Israel Endowed Fund Scholarship 2025-26; Putnam Mathematical Competition 2025: Top 600.
- Coursework: Math of Finance, Algorithmic Trading, Applied Machine Learning, Elementary Stochastic Processes, Data Structures.

## Experience
- **Lionheart Capital**, Miami, FL. Quantitative Investment Analyst, Public Markets, SPACs & Energy. Jan 2026 to Aug 2026.
  - deSPAC valuation models across the full deal structure: trust value per share, redemption-rate scenarios, sponsor promote and founder-share dilution, warrant overhang, PIPE financing. Sensitivity tables on the value drivers; presented and defended recommendations to partners.
  - Sized public-equity allocations for a follow-on offering using probability-weighted bear/base/bull returns; triangulated EV/Sales against comparable M&A; pro-forma dilution, convertibles, venture debt and cash-runway constraints.
  - Reserves-based and DCF valuations for international upstream oil & gas deals across commodity-price scenarios (decline curves, capex timing, production ramp); pressure-tested third-party technical reports against independent estimates.
  - Built Python automation tools and internal databases consolidating technical, market and counterparty data for IC memos.
- **Israel Defense Forces, Unit 142**, Israel. Head of Training, 2020 to 2022.
  - Planned and led the unit's training and operational-readiness programs; twice awarded "Outstanding Soldier" (2020, 2021).
  - Post-service (2024): raised $250,000+ in equipment and aid for deployed units through U.S. donor networks.

## Projects (résumé)
- **ML Statistical Arbitrage: Reproduction & Stress Test** (2025). Python, PyTorch, XGBoost, H2O, WRDS. Reproduced Krauss, Do & Huck (2017) across 23 walk-forward periods, matching 90% of its reported pre-cost returns after fixing 15+ hidden library defaults. Ranking trades by model confidence lifted post-cost returns from 0.279% to 0.348%; skipping trades too small to cover costs raised returns from 0.224% to 0.243% while cutting turnover from 2.69 to 1.66.
- **Kalshi Trading Bot: Live Bitcoin Binary Markets** (2026). Python. Live-trades Kalshi 15-minute Bitcoin up/down contracts: expected value from realized BTC volatility and the distance of spot from 15-minute and 1-hour moving averages relative to contract price, validated on 3 months of backtest. Quarter-Kelly sizing under per-market exposure caps, routes against live books, monitoring dashboard; 470+ unit tests across 19 modules.
- **SPAC Warrant Pricer & Arbitrage Study** (2026). Python. Monte Carlo of the stock path and redemption rate jointly, pricing SPAC warrants as a distribution; calibrates volatility point-in-time; compares Black-Scholes, dilution-adjusted BS and the joint-redemption model across live SPACs. Back-tested a dollar-neutral cheap-warrant strategy with survivorship-bias handling; documents where it breaks (redemption and volatility dynamics, PIPE effects, thin liquidity).
- **Low-Latency Order Management Client** (2026). Python, Algorithmic Trading coursework. FSM-based order manager for a simulated exchange over TCP order entry and UDP L2 market data; reconstructs the full order book and pegs orders to the BBO with verified state consistency across 100 timed orders (code withheld per course policy).

## Skills (résumé)
- Languages & tools: Python, R, Java, SQL, Git, LaTeX.
- Quantitative: Monte Carlo pricing, Black-Scholes & Greeks, risk-neutral valuation, implied/realized vol, Markov & Poisson processes.
- ML & data: PyTorch, XGBoost, scikit-learn, pandas/NumPy, WRDS, walk-forward backtesting, transaction-cost modeling.

## quant-universe.com (fetched 2026-10-21)
- "Quant Universe: Interview Prep Terminal", a vanilla-JS single-page app on Vercel with Supabase auth.
- The landing page states 530 curated problems, 12 systems (topic roadmap), 10 firm OA simulations and 24 trading games. An older résumé says "530+ interview questions, 62 advanced quantitative problems, and interactive market-making games".
- Features: question bank, spaced repetition, progress tracking, market-making and trading games, and firm profiles.

## Public code (GitHub ap4475-stack, verified 2026-10-21)
- https://github.com/ap4475-stack/krauss-ml-statarb: the ML stat-arb pipeline reproducing Krauss et al. (2017).
- https://github.com/ap4475-stack/kraus_final_sub: the final submission, with a cost-aware no-trade band and walk-forward backtests on the S&P 500.

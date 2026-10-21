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

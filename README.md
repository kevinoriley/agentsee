# agentsee

Operator control plane for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) agents. Watch agents in real time, hold them mid-run, chat with them, and switch between autonomous and supervised modes.

Works standalone with any Claude Code project that uses subagents. Also the intended control plane for [red-run](https://github.com/blacklanternsecurity/red-run).

![agentsee dashboard](screenshot.jpeg)

## How it works

Claude Code writes agent transcripts as JSONL files. agentsee tails those files and streams parsed output to a web dashboard with operator controls attached.

**Hooks** enforce the control plane. A PreToolUse hook checks with the agentsee server before every tool call. If the agent is held or over its turn threshold, the hook denies the call and tells the agent to check in with the operator.

**MCP tools** close the loop. The agent calls `operator_checkpoint` (blocking — waits for the operator to respond) or `operator_notify` (fire-and-forget). The operator's response arrives as a natural tool result in the agent's context.

**Modes** are just a turn threshold:
- `null` = autonomous (run freely, operator can still hold at any time)
- `1` = supervised (check in after every tool call)
- `N` = supervised with a longer leash

Switching modes mid-run is just changing the number. No restart needed.

## Install

```bash
git clone https://github.com/kevinoriley/agentsee.git
cd agentsee
npm install && cd dashboard && npm install && cd ..
npm run build
```

The Python terminal dashboard (`bash dashboard.sh`) still works standalone with zero dependencies — no npm install needed.

## Quick start

```bash
npm start
# Open http://localhost:4900
```

Then add the hooks and MCP server to your Claude Code project — see the [docs](https://github.com/kevinoriley/agentsee/wiki) for configuration.

## License

GPL-3.0 — see [LICENSE](LICENSE)

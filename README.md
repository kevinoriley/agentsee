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

Requires Node.js 18+ and npm.

```bash
git clone https://github.com/kevinoriley/agentsee.git
cd agentsee
npm install && cd dashboard && npm install && cd ..
npm run build
```

The Python terminal dashboard (`bash dashboard.sh`) still works standalone with zero dependencies — no npm install needed.

## Usage

### Start the server

```bash
npm start
```

The server listens on port 4900 by default. Open `http://localhost:4900` for the web dashboard.

### Environment variables

```bash
# Change the port
AGENTSEE_PORT=5000 npm start

# Point at a specific project for agent discovery
AGENTSEE_PROJECT_DIR=/home/user/my-project npm start

# Both
AGENTSEE_PORT=5000 AGENTSEE_PROJECT_DIR=/home/user/my-project npm start
```

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTSEE_PORT` | `4900` | Server port (HTTP, WebSocket, and MCP all on this port) |
| `AGENTSEE_PROJECT_DIR` | current directory | Project directory for agent transcript discovery |
| `AGENTSEE_URL` | `http://localhost:4900` | URL the hook scripts use to reach the server |

### Stop the server

`Ctrl+C` in the terminal, or kill the process.

### Configure your Claude Code project

Three things to set up in your project:

**1. Hook scripts** — add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/agentsee/hooks/agentsee-pre.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/agentsee/hooks/agentsee-post.sh"
          }
        ]
      }
    ]
  }
}
```

**2. MCP server** — add to `.mcp.json`:

```json
{
  "mcpServers": {
    "agentsee": {
      "url": "http://localhost:4900/mcp"
    }
  }
}
```

**3. Agent prompt** — add to `CLAUDE.md` or your shared agent prompt:

```
If any tool call is rejected with an OPERATOR CHECKPOINT REQUIRED or OPERATOR INTERVENTION message, immediately call operator_checkpoint with a summary of your progress and intended next steps. Do not attempt other tools first.
```

### Operator controls

From the web dashboard you can:

- **Hold** an agent — it stops on its next tool call and waits for you
- **Release** a held agent — it resumes normal operation
- **Set turn threshold** — `1` = check in every tool, `5` = every 5 tools, `Auto` = autonomous
- **Respond to check-ins** — when an agent is checking in, a chat panel opens for your response

### Terminal dashboard

The read-only terminal dashboard works without the server:

```bash
# Auto-discover agents from current project
bash dashboard.sh

# Explicit paths
python3 tail-agent.py --dashboard label1:path1 label2:path2

# Purge all agent transcripts
bash dashboard.sh --purge
```

### API

All endpoints are on the same port as the dashboard.

```bash
# Hold an agent
curl -X POST http://localhost:4900/agent/AGENT_ID/hold

# Release
curl -X POST http://localhost:4900/agent/AGENT_ID/release

# Set supervised mode (check in every tool call)
curl -X POST http://localhost:4900/agent/AGENT_ID/threshold \
  -H "Content-Type: application/json" -d '{"threshold": 1}'

# Set autonomous mode
curl -X POST http://localhost:4900/agent/AGENT_ID/threshold \
  -H "Content-Type: application/json" -d '{"threshold": null}'

# View all agents
curl http://localhost:4900/agent/status

# Health check
curl http://localhost:4900/health
```

## License

GPL-3.0 — see [LICENSE](LICENSE)

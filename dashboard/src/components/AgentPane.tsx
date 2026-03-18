import { ModeBadge } from "./ModeBadge";
import { AgentStream } from "./AgentStream";
import type { AgentInfo, StreamEntry } from "../types";

interface Props {
  agent: AgentInfo;
  entries: StreamEntry[];
  focused: boolean;
  onFocus: () => void;
  onDismiss: () => void;
  onMaximize: () => void;
  onHold: () => void;
  onRelease: () => void;
  onSetThreshold: (t: number | null) => void;
  onScrollTop: () => void;
  hasCheckin: boolean;
  onOpenChat: () => void;
}

function idleColor(ms: number): string {
  if (ms >= 120000) return "#f85149"; // red
  if (ms >= 60000) return "#d29922"; // orange
  if (ms >= 30000) return "#c09553"; // gold
  return "#8b949e";
}

function formatIdle(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

export function AgentPane({
  agent,
  entries,
  focused,
  onFocus,
  onDismiss,
  onMaximize,
  onHold,
  onRelease,
  onSetThreshold,
  onScrollTop,
  hasCheckin,
  onOpenChat,
}: Props) {
  const idle = Date.now() - new Date(agent.last_activity).getTime();

  return (
    <div
      style={{
        ...s.pane,
        borderColor: focused
          ? "#58a6ff"
          : hasCheckin
            ? "#1f6feb"
            : "#30363d",
        ...(hasCheckin ? { animation: "pulseBorder 1.5s ease-in-out infinite" } : {}),
      }}
      onClick={onFocus}
    >
      {/* Header */}
      <div style={s.header} onDoubleClick={onMaximize}>
        <div style={s.headerLeft}>
          <span style={s.label}>
            {agent.task_description || agent.agent_type || agent.agent_id}
          </span>
          <ModeBadge mode={agent.mode} status={agent.status} />
          {agent.turn_threshold !== null && (
            <span style={s.turns}>
              {agent.turn_count}/{agent.turn_threshold}
            </span>
          )}
        </div>
        <div style={s.headerRight}>
          <span style={{ color: idleColor(idle), fontSize: 10 }}>
            {formatIdle(idle)}
          </span>
          {hasCheckin && (
            <button style={s.chatBtn} onClick={onOpenChat}>
              💬
            </button>
          )}
          {agent.status === "held" ? (
            <button style={s.ctrlBtn} onClick={onRelease}>
              Resume
            </button>
          ) : (
            <button style={s.ctrlBtn} onClick={onHold}>
              Hold
            </button>
          )}
          <select
            style={s.select}
            value={agent.turn_threshold ?? "auto"}
            onChange={(e) => {
              const v = e.target.value;
              onSetThreshold(v === "auto" ? null : parseInt(v, 10));
            }}
          >
            <option value="auto">Auto</option>
            <option value="1">Every 1</option>
            <option value="3">Every 3</option>
            <option value="5">Every 5</option>
            <option value="10">Every 10</option>
          </select>
          <button style={s.dismissBtn} onClick={onDismiss}>
            ×
          </button>
        </div>
      </div>

      {/* Stream */}
      <AgentStream entries={entries} onScrollTop={onScrollTop} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pane: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #30363d",
    borderRadius: 6,
    overflow: "hidden",
    background: "#0d1117",
    minHeight: 0,
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 8px",
    background: "#161b22",
    borderBottom: "1px solid #21262d",
    gap: 8,
    flexShrink: 0,
    cursor: "default",
    userSelect: "none",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    minWidth: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  label: {
    fontWeight: 600,
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  turns: {
    fontSize: 10,
    color: "#8b949e",
    fontFamily: "inherit",
  },
  ctrlBtn: {
    background: "#21262d",
    border: "1px solid #30363d",
    color: "#c9d1d9",
    fontSize: 10,
    padding: "2px 8px",
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  chatBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
    lineHeight: 1,
  },
  select: {
    background: "#21262d",
    border: "1px solid #30363d",
    color: "#c9d1d9",
    fontSize: 10,
    padding: "2px 4px",
    borderRadius: 3,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  dismissBtn: {
    background: "none",
    border: "none",
    color: "#484f58",
    fontSize: 16,
    cursor: "pointer",
    padding: "0 2px",
    lineHeight: 1,
  },
};

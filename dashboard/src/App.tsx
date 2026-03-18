import { useState, useCallback, useMemo } from "react";
import { useWorkspace } from "./store/workspace";
import { useWebSocket } from "./hooks/useWebSocket";
import { useKeyBindings } from "./hooks/useKeyBindings";
import { useChunkedHistory } from "./hooks/useChunkedHistory";
import { TabBar } from "./components/TabBar";
import { PaneGrid } from "./components/PaneGrid";
import { AgentBrowser } from "./components/AgentBrowser";
import { ChatPanel } from "./components/ChatPanel";
import type { AgentInfo } from "./types";

export function App() {
  const ws = useWorkspace();
  const [browserOpen, setBrowserOpen] = useState(false);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { loadMore } = useChunkedHistory(ws.prependStreamHistory);

  const { send } = useWebSocket({
    onInit: (agents) => {
      for (const agent of Object.values(agents)) {
        ws.registerAgent(agent);
      }
      // Subscribe to all known agents
      for (const id of Object.keys(agents)) {
        send({
          type: "agent:subscribe",
          agent_id: id,
          data: {},
        });
      }
    },
    onAgentRegistered: (data) => {
      const agent: AgentInfo = {
        agent_id: data.agent_id ?? (data as any).agent_id,
        session_id: (data as any).session_id ?? "",
        agent_type: (data as any).agent_type ?? "unknown",
        task_description: (data as any).task_description ?? (data as any).label ?? "",
        mode: (data as any).mode ?? "autonomous",
        status: "running",
        turn_count: 0,
        turn_threshold: (data as any).turn_threshold ?? null,
        transcript_path: (data as any).transcript_path ?? (data as any).filePath ?? null,
        has_pending_checkin: false,
        registered_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      };
      ws.registerAgent(agent);
      // Auto-subscribe to new agents
      send({ type: "agent:subscribe", agent_id: agent.agent_id, data: {} });
    },
    onAgentStatus: (agentId, data) => {
      ws.updateAgent(agentId, data as Partial<AgentInfo>);
      if (data.status !== "checking_in") {
        ws.setCheckin(agentId, null);
      }
    },
    onStream: (agentId, entry) => {
      ws.appendStream(agentId, entry);
      // Update last_activity
      ws.updateAgent(agentId, {
        last_activity: new Date().toISOString(),
      });
    },
    onHistory: (agentId, entries) => {
      ws.setStreamHistory(agentId, entries);
    },
    onCheckin: (agentId, data) => {
      ws.setCheckin(agentId, data);
      ws.updateAgent(agentId, { status: "checking_in", has_pending_checkin: true });
      // Auto-open chat if agent is in current tab
      if (ws.activeTab.agentIds.includes(agentId)) {
        setChatAgentId(agentId);
      }
    },
    onNotify: (_agentId, _message) => {
      // Could show a toast notification here
    },
  });

  const handleRespond = useCallback(
    (agentId: string, message: string) => {
      send({
        type: "agent:respond",
        agent_id: agentId,
        data: { message },
      });
      ws.setCheckin(agentId, null);
      setChatAgentId(null);
    },
    [send, ws]
  );

  const handleHold = useCallback(
    (agentId: string) => {
      send({ type: "agent:hold", agent_id: agentId, data: {} });
    },
    [send]
  );

  const handleRelease = useCallback(
    (agentId: string) => {
      send({ type: "agent:release", agent_id: agentId, data: {} });
    },
    [send]
  );

  const handleSetThreshold = useCallback(
    (agentId: string, threshold: number | null) => {
      send({
        type: "agent:set_threshold",
        agent_id: agentId,
        data: { threshold },
      });
    },
    [send]
  );

  const handleScrollTop = useCallback(
    (agentId: string) => {
      const entries = ws.streams[agentId];
      const earliest = entries?.[0]?.byte_offset ?? 0;
      if (earliest > 0) {
        loadMore(agentId, earliest);
      }
    },
    [ws.streams, loadMore]
  );

  const activeAgentIds = ws.activeTab.agentIds;

  const keyActions = useMemo(
    () => ({
      switchTab: (i: number) => {
        if (ws.tabs[i]) ws.setActiveTabId(ws.tabs[i].id);
      },
      createTab: () => ws.createTab(),
      focusNext: () =>
        setFocusedIndex((prev) => (prev + 1) % Math.max(1, activeAgentIds.length)),
      focusPrev: () =>
        setFocusedIndex(
          (prev) => (prev - 1 + Math.max(1, activeAgentIds.length)) % Math.max(1, activeAgentIds.length)
        ),
      maximize: () => {
        const id = activeAgentIds[focusedIndex];
        if (id) ws.setMaximizedAgent(ws.maximizedAgent ? null : id);
      },
      dismiss: () => {
        const id = activeAgentIds[focusedIndex];
        if (id) ws.removeAgentFromTab(ws.activeTab.id, id);
      },
      toggleBrowser: () => setBrowserOpen((v) => !v),
      holdFocused: () => {
        const id = activeAgentIds[focusedIndex];
        if (id) handleHold(id);
      },
      releaseFocused: () => {
        const id = activeAgentIds[focusedIndex];
        if (id) handleRelease(id);
      },
    }),
    [ws, activeAgentIds, focusedIndex, handleHold, handleRelease]
  );

  useKeyBindings(keyActions);

  const chatCheckin = chatAgentId ? ws.checkins[chatAgentId] : null;

  return (
    <div style={s.root}>
      <TabBar
        tabs={ws.tabs}
        activeTabId={ws.activeTabId}
        onSelect={ws.setActiveTabId}
        onCreate={() => ws.createTab()}
        onRename={ws.renameTab}
        onClose={ws.closeTab}
      />

      <PaneGrid
        agentIds={ws.activeTab.agentIds}
        agents={ws.agents}
        streams={ws.streams}
        checkins={ws.checkins}
        focusedIndex={focusedIndex}
        maximizedAgent={ws.maximizedAgent}
        onFocus={setFocusedIndex}
        onDismiss={(id) => ws.removeAgentFromTab(ws.activeTab.id, id)}
        onMaximize={ws.setMaximizedAgent}
        onHold={handleHold}
        onRelease={handleRelease}
        onSetThreshold={handleSetThreshold}
        onScrollTop={handleScrollTop}
        onOpenChat={setChatAgentId}
      />

      {browserOpen && (
        <AgentBrowser
          agents={ws.agents}
          currentTabAgents={ws.activeTab.agentIds}
          onToggle={(id) => {
            if (ws.activeTab.agentIds.includes(id)) {
              ws.removeAgentFromTab(ws.activeTab.id, id);
            } else {
              ws.addAgentToTab(ws.activeTab.id, id);
            }
          }}
          onClose={() => setBrowserOpen(false)}
        />
      )}

      {chatAgentId && chatCheckin && (
        <ChatPanel
          agentId={chatAgentId}
          checkin={chatCheckin}
          onRespond={handleRespond}
          onClose={() => setChatAgentId(null)}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
};

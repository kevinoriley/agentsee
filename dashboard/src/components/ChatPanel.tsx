import { useState } from "react";
import type { CheckinData } from "../types";

interface Props {
  agentId: string;
  checkin: CheckinData;
  onRespond: (agentId: string, message: string) => void;
  onClose: () => void;
}

export function ChatPanel({ agentId, checkin, onRespond, onClose }: Props) {
  const [input, setInput] = useState("");

  const send = () => {
    const msg = input.trim() || "Continue.";
    onRespond(agentId, msg);
    setInput("");
    onClose();
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontWeight: 600 }}>Operator Chat — {agentId}</span>
          <button style={s.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={s.body}>
          <div style={s.section}>
            <div style={s.sectionLabel}>Agent Summary</div>
            <div style={s.summaryText}>{checkin.summary}</div>
          </div>

          {checkin.question && (
            <div style={s.section}>
              <div style={s.sectionLabel}>Question</div>
              <div style={s.questionText}>{checkin.question}</div>
            </div>
          )}
        </div>

        <div style={s.inputArea}>
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type your response (Enter to send, Shift+Enter for newline)..."
            style={s.textarea}
          />
          <button style={s.sendBtn} onClick={send}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  panel: {
    width: 560,
    maxWidth: "90vw",
    maxHeight: "80vh",
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    borderBottom: "1px solid #21262d",
    fontSize: 13,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#8b949e",
    fontSize: 18,
    cursor: "pointer",
  },
  body: {
    flex: 1,
    overflow: "auto",
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#8b949e",
    letterSpacing: "0.5px",
    marginBottom: 6,
  },
  summaryText: {
    color: "#c9d1d9",
    fontSize: 13,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    background: "#0d1117",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #21262d",
  },
  questionText: {
    color: "#58a6ff",
    fontSize: 13,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    background: "#0d1117",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #1f6feb",
  },
  inputArea: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid #21262d",
    background: "#0d1117",
  },
  textarea: {
    flex: 1,
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#c9d1d9",
    fontSize: 13,
    padding: "8px 12px",
    fontFamily: "inherit",
    resize: "none",
    minHeight: 60,
    outline: "none",
  },
  sendBtn: {
    background: "#238636",
    border: "none",
    color: "#fff",
    fontSize: 13,
    padding: "8px 20px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "inherit",
    alignSelf: "flex-end",
  },
};

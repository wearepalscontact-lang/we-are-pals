"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

type Plan = "free" | "premium" | "super";
type GameMode = "chat" | "trivia" | "memory_game";

const COOLDOWN_MS = 3000;

const PERSONAS = [
  { key: "aussie", label: "Aussie mate vibe" },
  { key: "calm", label: "Calm listener" },
  { key: "coach", label: "Friendly coach" },
];

const THEMES: Record<string, { bg: string; card: string; border: string }> = {
  calm: { bg: "#fbf7f1", card: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.12)" },
  golden: { bg: "#22160c", card: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)" },
  night: { bg: "#0f141d", card: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)" },
};

export default function Page() {
  const [plan, setPlan] = useState<Plan>("free");
  const [persona, setPersona] = useState("aussie");
  const [theme, setTheme] = useState("calm");
  const [mode, setMode] = useState<GameMode>("chat");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey — I’m here. Want to chat, do friendly trivia, or try a memory game?" },
  ]);
  const [busy, setBusy] = useState(false);
  const lastSend = useRef(0);

  const themeObj = THEMES[theme];

  async function send() {
    if (!input.trim() || busy) return;
    if (Date.now() - lastSend.current < COOLDOWN_MS) return;

    lastSend.current = Date.now();
    setBusy(true);

    const userMsg: Msg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          plan,
          persona,
          theme,
          mode,
        }),
      });

      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: themeObj.bg,
        padding: 24,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            paddingBottom: 16,
            marginBottom: 16,
            borderBottom: `1px solid ${themeObj.border}`,
          }}
        >
          {/* BRAND BANNER (integrated mascot + logo) */}
          <img
            src="/wearepals-banner.png"
            alt="We are pals"
            style={{
              height: 120,          // ✅ fixed size
              maxWidth: "100%",
              width: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />

          {/* MODE BUTTONS */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setMode("chat")}>Chat</button>
            <button onClick={() => setMode("trivia")}>Trivia</button>
            <button onClick={() => setMode("memory_game")}>Memory Game</button>
          </div>
        </header>

        {/* SETTINGS */}
        <section
          style={{
            padding: 16,
            borderRadius: 12,
            border: `1px solid ${themeObj.border}`,
            background: themeObj.card,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label>
              Plan
              <select value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="super">Super Pal</option>
              </select>
            </label>

            <label>
              Persona
              <select value={persona} onChange={(e) => setPersona(e.target.value)}>
                {PERSONAS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Theme
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="calm">Calm Light</option>
                <option value="golden">Golden Hour</option>
                <option value="night">Night Mode</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
            Free is session-only (no memory) and shows non-intrusive ads.
          </div>
        </section>

        {/* AD SLOT */}
        <section
          style={{
            padding: 16,
            borderRadius: 12,
            border: `1px dashed ${themeObj.border}`,
            marginBottom: 16,
            background: themeObj.card,
          }}
        >
          <strong>Ad slot (placeholder)</strong>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Non-intrusive banner goes here (outside the chat flow).
          </div>
        </section>

        {/* CHAT */}
        <section
          style={{
            padding: 16,
            borderRadius: 12,
            border: `1px solid ${themeObj.border}`,
            background: themeObj.card,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            {messages.slice(-10).map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <strong>{m.role === "assistant" ? "Pal" : "You"}:</strong> {m.content}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              style={{ flex: 1, padding: 8 }}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button onClick={send} disabled={busy}>
              {busy ? "…" : "Send"}
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
            Session-only. Upgrade for memory.
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

type Plan = "free" | "premium" | "super";
type GameMode = "chat" | "trivia" | "memory_game";

const COOLDOWN_MS = 3000;

const PERSONAS: { key: string; label: string; prompt: string }[] = [
  {
    key: "aussie_mate",
    label: "Aussie mate vibe",
    prompt:
      "You are Pal: warm, friendly, casual Australian tone (not too heavy). Be encouraging, positive, and non-judgmental. Keep replies concise unless the user asks for detail.",
  },
  {
    key: "calm_listener",
    label: "Calm listener",
    prompt:
      "You are Pal: calm, grounding, supportive, and gentle. Keep replies short and steady. Ask simple follow-up questions to help the user feel heard.",
  },
  {
    key: "friendly_coach",
    label: "Friendly coach",
    prompt:
      "You are Pal: upbeat, practical, and encouraging. Offer simple steps and check-ins. Keep it light and motivating.",
  },
];

const THEMES: Record<
  string,
  {
    name: string;
    bg: string;
    card: string;
    card2: string;
    fg: string;
    subtle: string;
    border: string;
    accent: string; // warm yellow used for glow/badges
    pill: string;
  }
> = {
  calm_light: {
    name: "Calm Light",
    bg: "#fbf7f1",
    card: "rgba(0,0,0,0.04)",
    card2: "rgba(0,0,0,0.03)",
    fg: "#121212",
    subtle: "rgba(0,0,0,0.65)",
    border: "rgba(0,0,0,0.12)",
    accent: "rgba(255,200,80,0.85)",
    pill: "rgba(0,0,0,0.06)",
  },
  golden_hour: {
    name: "Golden Hour",
    bg: "#22160c",
    card: "rgba(255,255,255,0.06)",
    card2: "rgba(255,255,255,0.045)",
    fg: "#f6f1ea",
    subtle: "rgba(246,241,234,0.75)",
    border: "rgba(246,241,234,0.18)",
    accent: "rgba(255,200,80,0.9)",
    pill: "rgba(255,200,80,0.14)",
  },
  night_mode: {
    name: "Night Mode",
    bg: "#0f141d",
    card: "rgba(255,255,255,0.06)",
    card2: "rgba(255,255,255,0.045)",
    fg: "#eef2ff",
    subtle: "rgba(238,242,255,0.75)",
    border: "rgba(238,242,255,0.18)",
    accent: "rgba(255,200,80,0.85)",
    pill: "rgba(255,255,255,0.08)",
  },
  sparkly_super: {
    name: "Sparkly (Super)",
    bg: "#1b1230",
    card: "rgba(255,255,255,0.075)",
    card2: "rgba(255,255,255,0.055)",
    fg: "#f5f1ff",
    subtle: "rgba(245,241,255,0.78)",
    border: "rgba(245,241,255,0.18)",
    accent: "rgba(255,200,80,0.92)",
    pill: "rgba(255,200,80,0.18)",
  },
};

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export default function Page() {
  const [mode, setMode] = useState<GameMode>("chat");
  const [plan, setPlan] = useState<Plan>("free");
  const [personaKey, setPersonaKey] = useState(PERSONAS[0].key);
  const [themeKey, setThemeKey] = useState("calm_light");
  const [allowThemeSuggestions, setAllowThemeSuggestions] = useState(true);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hey — I’m here. Want to chat, do friendly trivia, or try a memory game?",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lastSendRef = useRef<number>(0);

  const persona = useMemo(
    () => PERSONAS.find((p) => p.key === personaKey) ?? PERSONAS[0],
    [personaKey]
  );

  const themeObj = useMemo(() => {
    // If user is super, allow the sparkly theme option to be used; otherwise keep other themes
    return THEMES[themeKey] ?? THEMES.calm_light;
  }, [themeKey]);

  // Memory behavior:
  // - Free: session-only (no localStorage persistence)
  // - Premium/Super: persist conversation in localStorage
  const memoryEnabled = plan !== "free";
  const storageKey = useMemo(
    () => `wearepals_memory_${plan}_${personaKey}_${themeKey}`,
    [plan, personaKey, themeKey]
  );

  useEffect(() => {
    if (!memoryEnabled) return;

    const saved = safeJsonParse<Msg[]>(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setMessages(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, memoryEnabled]);

  useEffect(() => {
    if (!memoryEnabled) return;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, memoryEnabled, storageKey]);

  function clearMemory() {
    setMessages([
      {
        role: "assistant",
        content:
          "Fresh start 🙂 Want to chat, do friendly trivia, or try a memory game?",
      },
    ]);
    setErr(null);
    setInput("");
    if (memoryEnabled) localStorage.removeItem(storageKey);
  }

  function canSendNow() {
    const now = Date.now();
    return now - lastSendRef.current >= COOLDOWN_MS;
  }

  async function send() {
    setErr(null);

    const trimmed = input.trim();
    if (!trimmed || busy) return;

    if (!canSendNow()) {
      setErr("Easy tiger 🙂 Give it 3 seconds between messages.");
      return;
    }

    lastSendRef.current = Date.now();
    setBusy(true);

    const userMsg: Msg = { role: "user", content: trimmed };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Build system prompt: persona + safety + mode
      const safety =
        "If the user asks for urgent help, self-harm, or immediate danger, encourage contacting Australian emergency services (000) or Lifeline 13 11 14, and suggest official supports. Do not provide medical or legal advice. Be supportive and practical.";

      const modePrompt =
        mode === "chat"
          ? "Mode: Chat. Be a friendly companion."
          : mode === "trivia"
          ? "Mode: Trivia. Ask one multiple-choice question at a time (4 options). Keep it achievable (70% Aussie, 30% world). After answering, explain briefly and ask the next question."
          : "Mode: Memory Game. Give a short memory challenge (not childish). Use difficulty that can be adjusted. Present as multiple-choice when possible. Provide feedback and gently increase challenge.";

      const themeSuggestion =
        allowThemeSuggestions && plan !== "free"
          ? "You may occasionally suggest a theme that matches the user's mood, but only if it feels natural and not salesy."
          : "Do not suggest themes.";

      const system: Msg = {
        role: "system",
        content: `${persona.prompt}\n\n${safety}\n\n${modePrompt}\n\n${themeSuggestion}`,
      };

      const payload = {
        messages: [system, ...messages, userMsg]
          // keep only last N for cost control
          .slice(-24)
          .map((m) => ({ role: m.role, content: m.content })),
        plan,
        persona: persona.key,
        theme: themeKey,
        mode,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `API error (${res.status})`);
      }

      const data = (await res.json()) as { reply?: string };
      const reply = data?.reply?.trim();

      if (!reply) throw new Error("Empty reply from server.");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setErr(
        "Something went wrong talking to Pal. If you’re on free hosting/billing limits, this can happen. Try again in a moment."
      );
    } finally {
      setBusy(false);
    }
  }

  const isSuper = plan === "super";
  const isPremium = plan === "premium";

  // Theme options: only show sparkly theme to super
  const themeOptions = useMemo(() => {
    const keys = Object.keys(THEMES);
    return keys.filter((k) => (k === "sparkly_super" ? isSuper : true));
  }, [isSuper]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: themeObj.bg,
        color: themeObj.fg,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        padding: 24,
      }}
    >
      <style>{`
        @keyframes palFloat { 0%{transform:translateY(0)} 50%{transform:translateY(-3px)} 100%{transform:translateY(0)} }
        button, select, input { font: inherit; }
        .wrap { max-width: 980px; margin: 0 auto; }
        .card { background: ${themeObj.card}; border: 1px solid ${themeObj.border}; border-radius: 14px; }
        .muted { color: ${themeObj.subtle}; }
        .btn { padding: 8px 12px; border-radius: 10px; border: 1px solid ${themeObj.border}; background: transparent; color: ${themeObj.fg}; cursor: pointer; }
        .btn:hover { filter: brightness(1.03); }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .seg { display:flex; gap:6px; padding:6px; border-radius:12px; border:1px solid ${themeObj.border}; background:${themeObj.card2}; }
        .seg button { border-radius: 10px; }
        .seg .active { background: ${themeObj.pill}; }
        .pill { display:inline-block; padding:6px 12px; border-radius:999px; border:1px solid ${themeObj.border}; background:${themeObj.pill}; font-weight:700; font-size:12px; }
      `}</style>

      <div className="wrap">
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
            paddingBottom: 16,
            marginBottom: 16,
            borderBottom: `1px solid ${themeObj.border}`,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Mascot */}
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 18,
                background: "white",
                padding: 6,
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                animation: isSuper ? "palFloat 6s ease-in-out infinite" : "none",
              }}
            >
              <img
                src="/pal-mascot.png"
                alt="Pal mascot"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 14,
                  display: "block",
                }}
              />
            </div>

            {/* Logo + tagline */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <img
                src="/wearepals-logo.png"
                alt="we are pals"
                style={{
                  height: 52,
                  width: "auto",
                  display: "block",
                }}
              />

              <div className="muted" style={{ marginTop: 6, fontSize: 15 }}>
                A good chat, anytime.
              </div>

              <div style={{ marginTop: 10 }}>
                {isSuper ? (
                  <span className="pill">
                    Super Pal ✨ <span style={{ opacity: 0.8 }}>top tier</span>
                  </span>
                ) : isPremium ? (
                  <span className="pill">Premium</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Mode switch */}
          <div className="seg" style={{ alignSelf: "flex-start" }}>
            <button
              className={`btn ${mode === "chat" ? "active" : ""}`}
              onClick={() => setMode("chat")}
            >
              Chat
            </button>
            <button
              className={`btn ${mode === "trivia" ? "active" : ""}`}
              onClick={() => setMode("trivia")}
            >
              Trivia
            </button>
            <button
              className={`btn ${mode === "memory_game" ? "active" : ""}`}
              onClick={() => setMode("memory_game")}
            >
              Memory Game
            </button>
          </div>
        </header>

        {/* SETTINGS */}
        <section className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Plan (testing)
              </span>
              <select
                value={plan}
                onChange={(e) => {
                  const v = e.target.value as Plan;
                  setPlan(v);
                  // If user drops from super and currently on sparkly theme, bump to calm
                  if (v !== "super" && themeKey === "sparkly_super") {
                    setThemeKey("calm_light");
                  }
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: `1px solid ${themeObj.border}`,
                  background: "transparent",
                  color: themeObj.fg,
                }}
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="super">Super Pal</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Persona
              </span>
              <select
                value={personaKey}
                onChange={(e) => setPersonaKey(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: `1px solid ${themeObj.border}`,
                  background: "transparent",
                  color: themeObj.fg,
                }}
              >
                {PERSONAS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Theme
              </span>
              <select
                value={themeKey}
                onChange={(e) => setThemeKey(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: `1px solid ${themeObj.border}`,
                  background: "transparent",
                  color: themeObj.fg,
                }}
              >
                {themeOptions.map((k) => (
                  <option key={k} value={k}>
                    {THEMES[k].name}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 18,
              }}
            >
              <input
                type="checkbox"
                checked={allowThemeSuggestions}
                onChange={(e) => setAllowThemeSuggestions(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Allow theme suggestions</span>
            </label>

            <button className="btn" onClick={clearMemory} style={{ marginTop: 14 }}>
              Clear memory
            </button>
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            {plan === "free"
              ? "Free is session-only (no memory) and shows non-intrusive ads."
              : plan === "premium"
              ? "Premium saves your chat memory and removes most limits."
              : "Super Pal unlocks sparkly themes, deeper personalisation, and premium games."}
          </div>
        </section>

        {/* AD SLOT */}
        <section
          className="card"
          style={{
            padding: 14,
            marginBottom: 12,
            borderStyle: "dashed",
            opacity: plan === "free" ? 1 : 0.65,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Ad slot (placeholder)</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Non-intrusive banner goes here (outside the chat flow).
          </div>
        </section>

        {/* CHAT CARD */}
        <section className="card" style={{ padding: 14 }}>
          {err && (
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: `1px solid ${themeObj.border}`,
                background: themeObj.card2,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Heads up</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {err}
              </div>
            </div>
          )}

          <div
            style={{
              padding: 12,
              borderRadius: 14,
              background: themeObj.card2,
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {mode === "chat"
                ? "Pal"
                : mode === "trivia"
                ? "Trivia with Pal"
                : "Memory Game with Pal"}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.slice(-12).map((m, idx) => (
                <div key={idx} style={{ lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 800 }}>
                    {m.role === "assistant" ? "Pal" : m.role === "user" ? "You" : "System"}:
                  </span>{" "}
                  <span style={{ opacity: m.role === "assistant" ? 0.92 : 1 }}>
                    {m.content}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${themeObj.border}`,
                background: "transparent",
                color: themeObj.fg,
                outline: "none",
              }}
            />
            <button className="btn" onClick={send} disabled={busy}>
              {busy ? "..." : "Send"}
            </button>
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            {plan === "free"
              ? "Session-only. Upgrade for memory."
              : "Memory is on. Clear memory anytime."}
          </div>
        </section>
      </div>
    </main>
  );
}

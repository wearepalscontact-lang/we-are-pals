"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type Plan = "free" | "premium" | "super";
type Mode = "chat" | "trivia" | "memory_game";

type Msg = { role: Role; content: string };

const PERSONAS = [
  "Gentle & friendly",
  "Aussie mate vibe",
  "Playful & chatty",
  "Quiet listener",
  "Gentle encourager",
] as const;

type ThemeId =
  | "calm_light"
  | "evening_calm"
  | "nature_soft"
  | "warm_home"
  | "high_contrast"
  | "starlight_calm"
  | "golden_hour";

const THEMES: Record<ThemeId, { name: string; bg: string; fg: string; bubbleA: string; bubbleU: string }> = {
  calm_light: { name: "Calm Light", bg: "#f6f3ee", fg: "#111111", bubbleA: "#ffffff", bubbleU: "#e9e3db" },
  evening_calm: { name: "Evening Calm 🌙", bg: "#0d1320", fg: "#f4f6ff", bubbleA: "#1b263a", bubbleU: "#2a3a55" },
  nature_soft: { name: "Nature Soft 🌿", bg: "#0f1f17", fg: "#f2fff7", bubbleA: "#173325", bubbleU: "#244a36" },
  warm_home: { name: "Warm Home ☕", bg: "#1b1410", fg: "#fff6ee", bubbleA: "#2b1f18", bubbleU: "#3a2a20" },
  high_contrast: { name: "High Contrast ♿", bg: "#000000", fg: "#ffffff", bubbleA: "#121212", bubbleU: "#2a2a2a" },
  starlight_calm: { name: "Starlight Calm ✨", bg: "#0b0b19", fg: "#f6f3ff", bubbleA: "#151533", bubbleU: "#24245a" },
  golden_hour: { name: "Golden Hour ✨", bg: "#1b1208", fg: "#fff3de", bubbleA: "#2a1a0d", bubbleU: "#3c270f" },
};

function themesForPlan(plan: Plan): ThemeId[] {
  if (plan === "super") return ["calm_light", "evening_calm", "nature_soft", "warm_home", "high_contrast", "starlight_calm", "golden_hour"];
  if (plan === "premium") return ["calm_light", "evening_calm", "nature_soft"];
  return ["calm_light"];
}

function shouldSuggestTheme(plan: Plan, allow: boolean, last: number) {
  if (plan === "free") return false;
  if (!allow) return false;
  const now = Date.now();
  const days = (now - last) / (1000 * 60 * 60 * 24);
  return days >= 7; // suggest at most weekly
}

export default function Home() {
  // Plan is a TESTING toggle for now (until Stripe + accounts).
  const [plan, setPlan] = useState<Plan>("free");
  const [persona, setPersona] = useState<(typeof PERSONAS)[number]>("Gentle & friendly");
  const [theme, setTheme] = useState<ThemeId>("calm_light");
  const [allowThemeSuggestions, setAllowThemeSuggestions] = useState(true);
  const [lastThemeSuggestionAt, setLastThemeSuggestionAt] = useState(0);

  const [mode, setMode] = useState<Mode>("chat");
  const [gameState, setGameState] = useState<any>(null);

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey — I’m here. Want to chat, play a quick game, or do some friendly trivia?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Memory summary only used for Premium/Super
  const [summary, setSummary] = useState("");

  // Cooldown
  const lastSendRef = useRef<number>(0);

  // Load saved settings (localStorage)
  useEffect(() => {
    const savedPlan = (localStorage.getItem("wap_plan") as Plan) || "free";
    const savedPersona = localStorage.getItem("wap_persona") || "Gentle & friendly";
    const savedTheme = (localStorage.getItem("wap_theme") as ThemeId) || "calm_light";
    const savedAllow = localStorage.getItem("wap_allowThemeSuggestions");
    const savedLastSuggest = Number(localStorage.getItem("wap_lastThemeSuggestionAt") || "0");
    const savedSummary = localStorage.getItem("wap_summary") || "";

    setPlan(savedPlan);
    setPersona(savedPersona as any);
    setTheme(savedTheme);
    setAllowThemeSuggestions(savedAllow ? savedAllow === "true" : true);
    setLastThemeSuggestionAt(savedLastSuggest);
    setSummary(savedSummary);
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("wap_plan", plan);
    localStorage.setItem("wap_persona", persona);
    localStorage.setItem("wap_theme", theme);
    localStorage.setItem("wap_allowThemeSuggestions", String(allowThemeSuggestions));
    localStorage.setItem("wap_lastThemeSuggestionAt", String(lastThemeSuggestionAt));
  }, [plan, persona, theme, allowThemeSuggestions, lastThemeSuggestionAt]);

  // Persist summary (only keep if plan allows)
  useEffect(() => {
    if (plan === "free") {
      localStorage.removeItem("wap_summary");
      setSummary("");
      return;
    }
    localStorage.setItem("wap_summary", summary);
  }, [plan, summary]);

  const themeObj = THEMES[theme];
  const availableThemes = useMemo(() => themesForPlan(plan), [plan]);

  // Gentle theme suggestion (time-based)
  useEffect(() => {
    if (!shouldSuggestTheme(plan, allowThemeSuggestions, lastThemeSuggestionAt)) return;

    const hour = new Date().getHours();
    let suggested: ThemeId | null = null;

    if (plan === "super" && hour >= 19) suggested = "starlight_calm";
    else if (hour >= 19) suggested = "evening_calm";
    else if (hour >= 6 && hour <= 11) suggested = "calm_light";
    else if (plan !== "free") suggested = "nature_soft";

    if (suggested && suggested !== theme && availableThemes.includes(suggested)) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Want to switch to **${THEMES[suggested].name}** for a calmer look? (You can always change it back in Settings.)`,
        },
      ]);
      setLastThemeSuggestionAt(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, allowThemeSuggestions, availableThemes]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    // Cooldown: 1 message every 3 seconds
    const now = Date.now();
    if (now - lastSendRef.current < 3000) {
      setMessages((m) => [...m, { role: "assistant", content: "Let’s go a tiny bit slower 😊 (Try again in a couple seconds.)" }]);
      return;
    }
    lastSendRef.current = now;

    const userMessage = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          plan,
          persona,
          theme,
          mode,
          gameState,
          summary: plan === "free" ? "" : summary,
          history: messages.slice(-12),
        }),
      });

      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "Try again?" }]);

      if (plan !== "free" && typeof data.summary === "string") {
        setSummary(data.summary);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I had a connection hiccup — want to try again?" }]);
    } finally {
      setLoading(false);
    }
  }

  function setGame(newMode: Mode) {
    setMode(newMode);
    setGameState(null);
    const intro =
      newMode === "chat"
        ? "Alright — normal chat it is 😊"
        : newMode === "trivia"
        ? "Okay! Friendly trivia time. Say “start” when you’re ready."
        : "Okay! Memory game time. Say “start” when you’re ready.";
    setMessages((m) => [...m, { role: "assistant", content: intro }]);
  }

  // Ads placeholder: replace later with AdSense component
  const showAds = plan === "free";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: themeObj.bg,
        color: themeObj.fg,
        fontFamily: "system-ui",
        padding: 18,
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>we are pals</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              {plan === "super" ? "You’re chatting as a Super Pal ✨" : plan === "premium" ? "Premium Pal" : "Free"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => setGame("chat")}>Chat</button>
            <button onClick={() => setGame("trivia")}>Trivia</button>
            <button onClick={() => setGame("memory_game")}>Memory Game</button>
          </div>
        </header>

        {/* Settings (simple inline panel for now) */}
        <section
          style={{
            border: `1px solid ${themeObj.fg}22`,
            borderRadius: 14,
            padding: 12,
            marginBottom: 12,
            background: `${themeObj.bubbleA}10`,
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Plan (testing)</div>
              <select value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="super">Super Pal</option>
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Persona</div>
              <select value={persona} onChange={(e) => setPersona(e.target.value as any)}>
                {PERSONAS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Theme</div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeId)}
              >
                {availableThemes.map((t) => (
                  <option key={t} value={t}>
                    {THEMES[t].name}
                  </option>
                ))}
              </select>
            </label>

            {plan !== "free" && (
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={allowThemeSuggestions} onChange={(e) => setAllowThemeSuggestions(e.target.checked)} />
                <span style={{ fontSize: 13, opacity: 0.9 }}>Allow theme suggestions</span>
              </label>
            )}

            {plan !== "free" && (
              <button
                onClick={() => {
                  setSummary("");
                  localStorage.removeItem("wap_summary");
                  setMessages((m) => [...m, { role: "assistant", content: "Done — I’ve cleared what I remember." }]);
                }}
              >
                Clear memory
              </button>
            )}
          </div>

          {plan === "free" ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              Free is session-only (no memory). Upgrade later to unlock memory, more themes, and no ads.
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              Memory is on (summary-based). It stays gentle and short.
            </div>
          )}
        </section>

        {/* Ads (safe placement, never inside chat bubbles) */}
        {showAds && (
          <section
            style={{
              border: `1px solid ${themeObj.fg}22`,
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
              background: `${themeObj.bubbleU}10`,
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            <strong>Ad slot (placeholder)</strong>
            <div style={{ marginTop: 6, opacity: 0.75 }}>
              This is where we’ll place a non-intrusive banner later (outside the chat flow).
            </div>
          </section>
        )}

        {/* Chat */}
        <section
          style={{
            border: `1px solid ${themeObj.fg}22`,
            borderRadius: 14,
            padding: 12,
            background: `${themeObj.bubbleA}12`,
          }}
        >
          <div style={{ maxHeight: 520, overflowY: "auto", paddingRight: 4 }}>
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              const bubbleBg = isUser ? themeObj.bubbleU : themeObj.bubbleA;
              return (
                <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", margin: "10px 0" }}>
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 12px",
                      borderRadius: 14,
                      background: bubbleBg,
                      color: themeObj.fg,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.35,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={mode === "chat" ? "Type a message…" : mode === "trivia" ? "Type your answer (A/B/C) or “start”…" : "Type “start” or your answer…"}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 12,
                border: "1px solid #00000022",
                outline: "none",
              }}
            />
            <button onClick={sendMessage} disabled={loading}>
              {loading ? "Thinking…" : "Send"}
            </button>
          </div>
        </section>

        <footer style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
          {plan === "super" && "Super Pal includes exclusive themes ✨ and deeper personalisation."}
        </footer>
      </div>
    </main>
  );
}


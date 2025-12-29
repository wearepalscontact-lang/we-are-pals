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
  | "high_contrast"
  | "warm_home"
  | "starlight_calm"
  | "golden_hour";

const THEMES: Record<
  ThemeId,
  { name: string; bg: string; fg: string; bubbleA: string; bubbleU: string; sparkle?: boolean }
> = {
  calm_light: { name: "Calm Light", bg: "#f6f3ee", fg: "#111111", bubbleA: "#ffffff", bubbleU: "#e9e3db" },
  evening_calm: { name: "Evening Calm 🌙", bg: "#0d1320", fg: "#f4f6ff", bubbleA: "#1b263a", bubbleU: "#2a3a55" },
  nature_soft: { name: "Nature Soft 🌿", bg: "#0f1f17", fg: "#f2fff7", bubbleA: "#173325", bubbleU: "#244a36" },
  high_contrast: { name: "High Contrast ♿", bg: "#000000", fg: "#ffffff", bubbleA: "#121212", bubbleU: "#2a2a2a" },

  warm_home: { name: "Warm Home ☕", bg: "#1b1410", fg: "#fff6ee", bubbleA: "#2b1f18", bubbleU: "#3a2a20" },

  // Super Pal exclusives (sparkly vibe)
  starlight_calm: { name: "Starlight Calm ✨", bg: "#0b0b19", fg: "#f6f3ff", bubbleA: "#151533", bubbleU: "#24245a", sparkle: true },
  golden_hour: { name: "Golden Hour ✨", bg: "#1b1208", fg: "#fff3de", bubbleA: "#2a1a0d", bubbleU: "#3c270f", sparkle: true },
};

function themesForPlan(plan: Plan): ThemeId[] {
  // Your chosen policy:
  // - Premium also gets themes (incl. accessibility)
  // - Super gets all + exclusives
  if (plan === "super") return ["calm_light", "evening_calm", "nature_soft", "high_contrast", "warm_home", "starlight_calm", "golden_hour"];
  if (plan === "premium") return ["calm_light", "evening_calm", "nature_soft", "high_contrast"];
  return ["calm_light"];
}

function shouldSuggestTheme(plan: Plan, allow: boolean, last: number) {
  if (plan === "free") return false;
  if (!allow) return false;
  const now = Date.now();
  const days = (now - last) / (1000 * 60 * 60 * 24);
  return days >= 7; // at most weekly
}

function sparkleBackground(baseBg: string) {
  // Lightweight "sparkle" effect with gradients (no images).
  // Safe for web and will be easy to emulate on mobile later.
  return `
    radial-gradient(800px 300px at 20% 10%, rgba(255,255,255,0.08), transparent 60%),
    radial-gradient(700px 260px at 80% 20%, rgba(255,230,180,0.06), transparent 60%),
    radial-gradient(900px 340px at 40% 90%, rgba(180,180,255,0.05), transparent 60%),
    ${baseBg}
  `;
}

export default function Home() {
  // NOTE: Plan is still a TESTING toggle until Stripe/auth is added.
  const [plan, setPlan] = useState<Plan>("free");
  const [persona, setPersona] = useState<(typeof PERSONAS)[number]>("Gentle & friendly");
  const [theme, setTheme] = useState<ThemeId>("calm_light");

  const [allowThemeSuggestions, setAllowThemeSuggestions] = useState(true);
  const [lastThemeSuggestionAt, setLastThemeSuggestionAt] = useState(0);
  const [suggestedTheme, setSuggestedTheme] = useState<ThemeId | null>(null);

  const [mode, setMode] = useState<Mode>("chat");
  const [gameState, setGameState] = useState<any>(null);

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey — I’m here. Want to chat, do friendly trivia, or try a memory game?" },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Memory summary only for Premium/Super
  const [summary, setSummary] = useState("");

  // Memory game flash panel (so answers aren't visible in chat)
  const [flashItems, setFlashItems] = useState<string[] | null>(null);
  const flashTimer = useRef<number | null>(null);

  // Cooldown: 1 message per 3 seconds
  const lastSendRef = useRef<number>(0);

  // Load saved settings
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

  // Persist summary only when plan allows
  useEffect(() => {
    if (plan === "free") {
      localStorage.removeItem("wap_summary");
      setSummary("");
      return;
    }
    localStorage.setItem("wap_summary", summary);
  }, [plan, summary]);

  const availableThemes = useMemo(() => themesForPlan(plan), [plan]);
  const themeObj = THEMES[theme];

  // If user downgrades, ensure theme is allowed
  useEffect(() => {
    if (!availableThemes.includes(theme)) {
      setTheme(availableThemes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // Theme suggestion logic (banner)
  useEffect(() => {
    if (!shouldSuggestTheme(plan, allowThemeSuggestions, lastThemeSuggestionAt)) return;
    if (suggestedTheme) return; // don't stack

    const hour = new Date().getHours();
    let suggested: ThemeId | null = null;

    if (hour >= 19) {
      suggested = plan === "super" ? "starlight_calm" : "evening_calm";
    } else if (hour >= 6 && hour <= 11) {
      suggested = "calm_light";
    } else {
      suggested = "nature_soft";
    }

    if (suggested && suggested !== theme && availableThemes.includes(suggested)) {
      setSuggestedTheme(suggested);
      setLastThemeSuggestionAt(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, allowThemeSuggestions, availableThemes]);

  function setGame(newMode: Mode) {
    setMode(newMode);
    setGameState(null);
    setFlashItems(null);

    const intro =
      newMode === "chat"
        ? "Alright — normal chat it is 😊"
        : newMode === "trivia"
        ? "Okay! Friendly trivia time. Type “start” to begin."
        : "Okay! Memory game time. Type “start” to begin (and tell me easy/medium/hard if you want).";

    setMessages((m) => [...m, { role: "assistant", content: intro }]);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    // Cooldown
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

      // Memory game "flash" round support
      if (mode === "memory_game" && data?.game?.phase === "show" && Array.isArray(data.game.items)) {
        // Store expected in state (so the model can adapt next message)
        setGameState({ ...data.game });

        // Show flash items briefly OUTSIDE chat
        setFlashItems(data.game.items);

        const difficulty = String(data.game.difficulty || "easy");
        const seconds = difficulty === "hard" ? 6 : difficulty === "medium" ? 8 : 10;

        // Short friendly line (optional)
        if (data.reply) setMessages((m) => [...m, { role: "assistant", content: data.reply }]);

        if (flashTimer.current) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => {
          setFlashItems(null);
          if (data.game.question) {
            setMessages((m) => [...m, { role: "assistant", content: String(data.game.question) }]);
          } else {
            setMessages((m) => [...m, { role: "assistant", content: "Okay — what do you remember?" }]);
          }
        }, seconds * 1000);

        // Summary updates (premium+)
        if (plan !== "free" && typeof data.summary === "string") setSummary(data.summary);

        setLoading(false);
        return;
      }

      // Normal flow
      setMessages((m) => [...m, { role: "assistant", content: data?.reply || "Try again?" }]);

      // Update summary (premium+)
      if (plan !== "free" && typeof data.summary === "string") {
        setSummary(data.summary);
      }

      // Update gameState for memory game (to help difficulty adapt)
      if (mode === "memory_game") {
        setGameState((prev: any) => ({ ...(prev || {}), lastUser: userMessage }));
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I had a connection hiccup — want to try again?" }]);
    } finally {
      setLoading(false);
    }
  }

  // Ads placeholder (safe placement, not inside chat)
  const showAds = plan === "free";

  const mainBackground = useMemo(() => {
    if (themeObj.sparkle) {
      // Use gradients + base colour
      return sparkleBackground(themeObj.bg);
    }
    return themeObj.bg;
  }, [themeObj]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: mainBackground,
        color: themeObj.fg,
        fontFamily: "system-ui",
        padding: 18,
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
 <header
  style={{
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  }}
>
  <div>
    <div
      style={{
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -0.6,
        lineHeight: 1.1,
      }}
    >
      we are pals
    </div>

    <div
      style={{
        marginTop: 4,
        fontSize: 14,
        fontWeight: 500,
        opacity: 0.8,
      }}
    >
      A good chat, anytime.
    </div>

    {(plan === "premium" || plan === "super") && (
      <div style={{ marginTop: 6 }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${themeObj.fg}22`,
            background: `${themeObj.bubbleA}22`,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {plan === "super" ? "Super Pal ✨" : "Premium"}
        </span>
      </div>
    )}
  </div>

  <div
    style={{
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    }}
  >
    <button onClick={() => setGame("chat")}>Chat</button>
    <button onClick={() => setGame("trivia")}>Trivia</button>
    <button onClick={() => setGame("memory_game")}>Memory Game</button>
  </div>
</header>


        {/* Settings panel (simple for now; later becomes proper Settings screen) */}
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
              <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
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

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.82 }}>
            {plan === "free"
              ? "Free is session-only (no memory) and shows non-intrusive ads."
              : plan === "premium"
              ? "Premium keeps a short memory summary, removes ads, and unlocks more themes."
              : "Super Pal unlocks sparkly exclusive themes ✨ and deeper personalisation."}
          </div>
        </section>

        {/* Ads (placeholder) */}
        {showAds && (
          <section
            style={{
              border: `1px solid ${themeObj.fg}22`,
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
              background: `${themeObj.bubbleU}10`,
              fontSize: 13,
              opacity: 0.95,
            }}
          >
            <strong>Ad slot (placeholder)</strong>
            <div style={{ marginTop: 6, opacity: 0.75 }}>
              Non-intrusive banner goes here (outside the chat flow).
            </div>
          </section>
        )}

        {/* Chat container */}
        <section
          style={{
            border: `1px solid ${themeObj.fg}22`,
            borderRadius: 14,
            padding: 12,
            background: `${themeObj.bubbleA}12`,
          }}
        >
          {/* Memory flash panel */}
          {flashItems && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                marginBottom: 10,
                border: `1px solid ${themeObj.fg}22`,
                background: `${themeObj.bubbleU}18`,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Quick look — remember these:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {flashItems.map((it, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: themeObj.bubbleA,
                      color: themeObj.fg,
                    }}
                  >
                    {it}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>(This will disappear in a few seconds.)</div>
            </div>
          )}

          {/* Messages */}
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

          {/* Theme suggestion banner (placed just above input, as requested) */}
          {suggestedTheme && (
            <div
              style={{
                marginTop: 10,
                marginBottom: 8,
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${themeObj.fg}22`,
                background: `${themeObj.bubbleA}18`,
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                fontSize: 13,
              }}
            >
              <div>
                Want to switch to <strong>{THEMES[suggestedTheme].name}</strong>?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setTheme(suggestedTheme);
                    setSuggestedTheme(null);
                  }}
                >
                  Try it
                </button>
                <button onClick={() => setSuggestedTheme(null)}>Not now</button>
                <button
                  onClick={() => {
                    setAllowThemeSuggestions(false);
                    setSuggestedTheme(null);
                  }}
                >
                  Don’t suggest
                </button>
              </div>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={
                mode === "chat"
                  ? "Type a message…"
                  : mode === "trivia"
                  ? "Type “start” or answer A/B/C…"
                  : "Type “start” (or easy/medium/hard) or your answer…"
              }
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
          {plan === "super" ? "Super Pal ✨ — sparkly themes and deeper personalisation." : ""}
        </footer>
      </div>
    </main>
  );
}

    


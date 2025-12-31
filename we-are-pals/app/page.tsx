"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function Page() {
  const [plan, setPlan] = useState("free");
  const [persona, setPersona] = useState("Aussie mate vibe");
  const [theme, setTheme] = useState("Calm Light");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hey — I’m here. Want to chat, do friendly trivia, or try a memory game?",
    },
  ]);

  function sendMessage() {
    if (!input.trim()) return;

    setMessages((m) => [...m, { role: "user", content: input }]);
    setInput("");

    // placeholder assistant response
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Got it 🙂 (AI response placeholder)",
        },
      ]);
    }, 600);
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
        background: "#faf7f2",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              margin: 0,
              fontWeight: 700,
            }}
          >
            we are pals
          </h1>
          <div style={{ opacity: 0.7 }}>A good chat, anytime.</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button>Chat</button>
          <button>Trivia</button>
          <button>Memory Game</button>
        </div>
      </header>

      {/* SETTINGS */}
      <section
        style={{
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.1)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label>
            Plan:
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="super">Super Pal</option>
            </select>
          </label>

          <label>
            Persona:
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
            >
              <option>Aussie mate vibe</option>
              <option>Calm listener</option>
              <option>Friendly coach</option>
            </select>
          </label>

          <label>
            Theme:
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option>Calm Light</option>
              <option>Golden Hour</option>
              <option>Night Mode</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>
          Free is session-only (no memory) and shows non-intrusive ads.
        </div>
      </section>

      {/* AD PLACEHOLDER */}
      <section
        style={{
          padding: 16,
          borderRadius: 12,
          border: "1px dashed rgba(0,0,0,0.15)",
          marginBottom: 16,
          opacity: 0.6,
        }}
      >
        Ad slot (placeholder)
      </section>

      {/* CHAT */}
      <section
        style={{
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ marginBottom: 12 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 8,
                opacity: m.role === "assistant" ? 0.85 : 1,
              }}
            >
              <strong>{m.role === "assistant" ? "Pal" : "You"}:</strong>{" "}
              {m.content}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </section>
    </main>
  );
}

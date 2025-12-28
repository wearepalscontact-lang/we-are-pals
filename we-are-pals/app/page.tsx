"use client";

import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey. Want to chat, or do something light for a minute?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;
    const userMessage = input;
    setInput("");
    setMessages([...messages, { role: "user", content: userMessage }]);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage })
    });

    const data = await res.json();
    setMessages(m => [...m, { role: "assistant", content: data.reply }]);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1>we are pals</h1>

      <div style={{ marginBottom: 20 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === "user" ? "right" : "left", margin: "10px 0" }}>
            <span style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 14,
              background: m.role === "user" ? "#e5e5e5" : "#333",
              color: m.role === "user" ? "#000" : "#fff"
            }}>
              {m.content}
            </span>
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && sendMessage()}
        placeholder="Type a message…"
        style={{ width: "100%", padding: 10, borderRadius: 10 }}
      />
      <button onClick={sendMessage} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "Thinking…" : "Send"}
      </button>
    </main>
  );
}

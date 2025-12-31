"use client";

import { useState } from "react";
import Image from "next/image";

export default function Page() {
  const [plan, setPlan] = useState<"free" | "premium" | "super">("free");

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      {/* Mascot animation */}
      <style>{`
        @keyframes palFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          paddingBottom: 16,
          marginBottom: 24,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {/* Left: mascot + logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Image
            src="/pal-mascot.png"
            alt="Pal mascot"
            width={72}
            height={72}
            priority
            style={{
              borderRadius: 18,
              background: "white",
              padding: 6,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              animation: "palFloat 7s ease-in-out infinite",
            }}
          />

          <div>
            <Image
              src="/wearepals-logo.png"
              alt="we are pals logo"
              width={220}
              height={80}
              priority
            />

            <div
              style={{
                marginTop: 4,
                fontSize: 15,
                opacity: 0.75,
              }}
            >
              A good chat, anytime.
            </div>

            {(plan === "premium" || plan === "super") && (
              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background:
                      plan === "super"
                        ? "rgba(255,200,80,0.2)"
                        : "rgba(0,0,0,0.06)",
                  }}
                >
                  {plan === "super" ? "Super Pal ✨" : "Premium"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: mode buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button>Chat</button>
          <button>Trivia</button>
          <button>Memory</button>
        </div>
      </header>

      {/* TEMP CONTENT (your chat UI continues below) */}
      <section
        style={{
          padding: 24,
          borderRadius: 16,
          background: "rgba(0,0,0,0.04)",
        }}
      >
        <p style={{ opacity: 0.7 }}>
          (Your existing chat UI continues here — unchanged)
        </p>

        {/* TEMP plan switch for testing */}
        <div style={{ marginTop: 16 }}>
          <label>
            Plan (testing):{" "}
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as any)}
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="super">Super Pal</option>
            </select>
          </label>
        </div>
      </section>
    </main>
  );
}

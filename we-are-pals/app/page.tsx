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
        background: "#faf7f2",
      }}
    >
      {/* Mascot animation */}
      <style>{`
        @keyframes palFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0px); }
        // Respect reduced motion
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>

      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          paddingBottom: 20,
          marginBottom: 28,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {/* Left: mascot + logo lockup */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* Mascot */}
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

          {/* Logo + tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {/* LOGO — natural aspect ratio, NOT squished */}
            <Image
              src="/wearepals-logo.png"
              alt="we are pals logo"
              priority
              style={{
                height: 48,
                width: "auto",
                display: "block",
              }}
            />

            <div
              style={{
                marginTop: 6,
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
                        ? "rgba(255,200,80,0.25)"
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
          <button>Memory Game</button>
        </div>
      </header>

      {/* SETTINGS / CONTENT AREA (placeholder for your existing UI) */}
      <section
        style={{
          padding: 24,
          borderRadius: 16,
          background: "rgba(0,0,0,0.04)",
        }}
      >
        <p style={{ opacity: 0.7 }}>
          (Your existing chat, persona, theme, ads, and input UI continues here —
          unchanged.)
        </p>

        {/* TEMP plan switch (remove later) */}
        <div style={{ marginTop: 16 }}>
          <


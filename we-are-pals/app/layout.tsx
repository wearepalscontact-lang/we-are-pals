export const metadata = {
  title: "we are pals",
  description: "A calm, friendly companion to chat with and play light games."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#0a0a0a", color: "#ffffff", fontFamily: "system-ui" }}>
        {children}
      </body>
    </html>
  );
}

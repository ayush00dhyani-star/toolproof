import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Toolproof — trust infrastructure for the agent economy";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0c0e",
          padding: 80,
          color: "#e8e6df",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 10,
            color: "#9ba0a6",
          }}
        >
          THE SAFETY CHECK FOR AI TOOLS
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              border: "5px dashed #ffb224",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 66,
                height: 66,
                borderRadius: 33,
                border: "4px solid #ffb224",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24">
                <path
                  d="M8.7 12.3 11 14.6 15.4 9.8"
                  stroke="#ffb224"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 118,
              fontWeight: 650,
              letterSpacing: -4,
            }}
          >
            Toolproof
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", height: 14, width: "100%", background: "repeating-linear-gradient(-45deg, #ffb224 0 18px, #0b0c0e 18px 36px)" }} />
          <div style={{ display: "flex", fontSize: 30, color: "#9ba0a6" }}>
            Is this AI tool safe? Paste a link. Know in seconds.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

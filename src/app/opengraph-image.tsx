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
          TRUST INFRASTRUCTURE FOR THE AGENT ECONOMY
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              border: "10px solid #ffb224",
              display: "flex",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 130,
              fontWeight: 700,
              letterSpacing: -4,
            }}
          >
            TOOLPROOF
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", height: 14, width: "100%", background: "repeating-linear-gradient(-45deg, #ffb224 0 18px, #0b0c0e 18px 36px)" }} />
          <div style={{ display: "flex", fontSize: 30, color: "#9ba0a6" }}>
            Machines call machines now. Somebody has to check IDs.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

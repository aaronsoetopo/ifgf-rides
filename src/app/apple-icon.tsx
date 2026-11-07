import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home Screen icon on iPhone (needed there for notifications to work). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "white",
          fontSize: 54,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        IFGF
        <div style={{ fontSize: 30, fontWeight: 400, color: "#fb923c", marginTop: -4 }}>rides</div>
      </div>
    ),
    size,
  );
}

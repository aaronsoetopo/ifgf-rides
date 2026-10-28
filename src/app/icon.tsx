import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 150,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        IFGF
        <div style={{ fontSize: 80, fontWeight: 400, color: "#fb923c", marginTop: -10 }}>rides</div>
      </div>
    ),
    size,
  );
}

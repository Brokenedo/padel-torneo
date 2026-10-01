import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon generata dinamicamente: pallina/racchetta da padel su sfondo teal (colore primario dell'app).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#115e59",
          borderRadius: 7,
          fontSize: 22,
        }}
      >
        🎾
      </div>
    ),
    { ...size }
  );
}

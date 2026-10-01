import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon: stessa identita' visiva dell'icona standard, in formato piu' grande.
export default function AppleIcon() {
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
          fontSize: 120,
        }}
      >
        🎾
      </div>
    ),
    { ...size }
  );
}

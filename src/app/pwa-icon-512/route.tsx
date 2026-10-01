import { ImageResponse } from "next/og";

export const contentType = "image/png";

// Icona 512x512 per il manifest PWA (installabilita' su Android/desktop).
export async function GET() {
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
          fontSize: 340,
        }}
      >
        🎾
      </div>
    ),
    { width: 512, height: 512 }
  );
}

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/* Même dessin que app/icon.svg, sans coins arrondis : iOS applique son propre masque. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="180" height="180">
  <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#1a3485"/><stop offset="1" stop-color="#006ad8"/>
  </linearGradient></defs>
  <rect width="32" height="32" fill="url(#g)"/>
  <g transform="translate(16 16) scale(0.78) translate(-16 -16)">
    <path d="M9.5 22 16 9.5 22.5 22M9.5 22h13" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" opacity="0.55"/>
    <circle cx="16" cy="9.5" r="3.2" fill="#fff"/>
    <circle cx="9.5" cy="22" r="3.2" fill="#8354de" stroke="#fff" stroke-width="1.2"/>
    <circle cx="22.5" cy="22" r="3.2" fill="#00c8d8" stroke="#fff" stroke-width="1.2"/>
  </g>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={180} height={180} alt="" />,
    size,
  );
}

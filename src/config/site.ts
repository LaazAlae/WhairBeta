/**
 * Site-wide configuration for the Whair platform.
 */
export const siteConfig = {
  name: "Whair",
  description: "Digital likeness protection platform",
  longDescription:
    "Protect your digital likeness. Detect, verify, enforce, and monetize your identity.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og-image.png",
  creator: "Whair Inc.",
  keywords: [
    "digital likeness",
    "face protection",
    "deepfake detection",
    "content provenance",
    "C2PA",
    "takedown",
    "licensing",
    "creator tools",
  ],
} as const;

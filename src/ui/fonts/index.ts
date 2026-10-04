import localFont from "next/font/local";

// Tech §3.3: Vazirmatn is self-hosted; no external font request. Only the weights in use
// ship (400 body, 500 medium, 700 bold). Licence: SIL OFL 1.1 (see OFL.txt).
export const vazirmatn = localFont({
  src: [
    { path: "./vazirmatn/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "./vazirmatn/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "./vazirmatn/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: true,
});

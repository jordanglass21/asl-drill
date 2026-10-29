export const SITE_NAME = "ASL Drill";
export const SITE_URL = "https://asldrill.jordanglass.dev";
export const SITE_DESCRIPTION =
  "Fingerspelling practice with your webcam. It all runs in your browser, so your video stays on your device.";

/** Builds a page title like "Practice · ASL Drill", or just the site name. */
export function pageTitle(page?: string): string {
  const trimmed = page?.trim();
  return trimmed ? `${trimmed} · ${SITE_NAME}` : SITE_NAME;
}

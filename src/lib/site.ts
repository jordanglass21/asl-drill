export const SITE_NAME = "ASL Drill";

/** Builds a page title like "Practice · ASL Drill", or just the site name. */
export function pageTitle(page?: string): string {
  const trimmed = page?.trim();
  return trimmed ? `${trimmed} · ${SITE_NAME}` : SITE_NAME;
}

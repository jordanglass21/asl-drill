import { pageTitle, SITE_NAME } from "@/lib/site";

describe("pageTitle", () => {
  it("returns the site name when no page is given", () => {
    expect(pageTitle()).toBe(SITE_NAME);
  });

  it("returns the site name for a blank page name", () => {
    expect(pageTitle("   ")).toBe(SITE_NAME);
  });

  it("prefixes the page name", () => {
    expect(pageTitle("Practice")).toBe("Practice · ASL Drill");
  });
});

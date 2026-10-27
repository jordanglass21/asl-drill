import { existsSync } from "node:fs";
import { join } from "node:path";
import { ALPHABET_REFERENCE } from "./alphabet";

describe("ALPHABET_REFERENCE", () => {
  it("lists every letter once, in order", () => {
    expect(ALPHABET_REFERENCE.map((entry) => entry.letter).join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it.each(ALPHABET_REFERENCE.map((entry) => [entry.letter, entry.src]))("ships an image for %s", (_, src) => {
    expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
  });

  it("describes the traced movement for J and Z only", () => {
    const traced = ALPHABET_REFERENCE.filter((entry) => entry.alt.includes("movement")).map((entry) => entry.letter);
    expect(traced).toEqual(["J", "Z"]);
  });
});

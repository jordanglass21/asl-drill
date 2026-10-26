# Design references

Approved in M4. The app's tokens and flap styles live in `src/app/globals.css`;
these static mockups are the reference for screens not built yet.

- `practice.html`: the practice screen (M5). Buttons at the bottom replay the
  confirm flip and preview a missed letter.
- `results.html`: the session results screen (M5).

Open either file directly in a browser. The mockups load fonts from Google
Fonts for convenience; the app self-hosts them through `next/font`.

Direction: a split-flap departures board. Near-black board, charcoal flaps
with a visible split, warm cream text, one amber accent for confirmed letters
and highlights. Brick red (`--miss`) is used only for missed letters and is
provisional. Letters in Big Shoulders (800), stats in IBM Plex Mono. Out of
scope: sound effects, mascots, cards, arcade elements.

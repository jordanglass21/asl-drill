// The practice word list: common English words, 3–7 letters. Words with J or
// Z need motion and words with double letters need the double-letter
// detector; both arrive in M6, so they're filtered out until then.

const WORD_LIST = `
able about above actor adult after again agent agree ahead alarm album alert alive allow alone along alter angel anger
angle angry ankle apart apple apron arena argue arise armor arrow aside atlas audio avoid awake award aware
bacon badge baker basic basin beach beard beast begin being below bench berry birth black blade blame blank blast
blend blind block blond blood bloom board boast bonus book boost booth bored brain brand brave bread break brick
bride brief bring broad broth brown brush buddy build bunch burst buyer cabin cable camel canal candy carbon cargo
carry catch cause chain chair chalk charm chart chase cheap check cheek chest chief child chili civic claim class
clean clear clerk click cliff climb clock close cloth cloud coach coast cocoa color comet coral couch count court
cover crack craft crane crash crawl cream crisp crowd crown crumb crust curve cycle daily dairy dance delta depth
diary dinner donut doubt dough draft drain drama dream dress drift drink drive eager eagle early earth easel eight
elbow empty enjoy enter equal error event exact extra fable faint faith false fancy feast fence fever field fifth
final flame flash fleet float flock floor flour fluid focus force forty found frame fresh front frost fruit funny
ghost giant given glass globe glory glove grain grand grant grape graph grasp grind group guard guess guest guide
habit happy harsh haste heart heavy hello hinge hobby honey horse hotel house human humor hurry image index input
jacket jazz jelly jewel join joke judge juice jump kayak knife knock label lever lance large laser later laugh layer
learn lemon level light limit linen lobby local logic lotus loyal lucky lunar lunch magic major maple march match
mayor medal metal meter midst might minor model money month moral motor mount mouse mouth movie music naive nerve
never night noble noise north novel nurse ocean offer often olive onion opera orbit order organ other outer owner
paint panel paper party pasta patch pause peace peach pearl pedal penny piano piece pilot pinch pizza place plain
plane plant plate point polar porch pound power press price pride prime print prize proof proud pupil puzzle quart
queen quest quick quiet quilt quite quote radar radio raise ranch range rapid razor reach ready realm relax reply
rider ridge rhyme right rival river roast robin robot rough round route royal ruler rural salad sauce scale scarf
scene scout screw sense seven shade shake shape share shark sharp shelf shell shift shine shirt shock shore short
shout sight silver since skate skill skirt slate sleep slice slide slope smart smile smoke snack snake solar solid
sound south space spare spark speak spend spice spine spoke spoon sport stack staff stage stain stair stamp stand
start state steam steel stick stone storm story stove straw strip study style sugar suite sunny super swamp sweat
table taste teach tempo thank theme thick thing think third thumb tiger toast token tooth topic torch total touch
tower trace track trade trail train trait treat trend trial tribe trick truck trust truth tulip twist uncle under
union unity upper urban usage usual valid value vapor video vigor visit vital vivid vocal voice wagon waste watch
water whale wheat wheel while white whole world worth wrist write yacht yearn yield young youth zebra zero
`;

export const WORDS: readonly string[] = [...new Set(WORD_LIST.trim().split(/\s+/).map((w) => w.toUpperCase()))];

export const needsMotion = (word: string) => /[JZ]/.test(word);
export const hasDoubleLetter = (word: string) => /(.)\1/.test(word);

/** Words the current recognizer can play: static letters, no doubles (until M6). */
export function playableWords(words: readonly string[] = WORDS): string[] {
  return words.filter((word) => !needsMotion(word) && !hasDoubleLetter(word));
}

/** Small seeded PRNG (mulberry32) so word picks are reproducible in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks `count` distinct words (fewer if the pool is smaller), avoiding `exclude`. */
export function pickWords(
  pool: readonly string[],
  count: number,
  random: () => number = Math.random,
  exclude: readonly string[] = [],
): string[] {
  const candidates = pool.filter((word) => !exclude.includes(word));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j] as string, candidates[i] as string];
  }
  return candidates.slice(0, count);
}

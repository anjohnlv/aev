const MAX_CHARS_PER_SLIDE = 140;
const HARD_CHUNK = 80;

/** Split expanded script into slide strings: paragraphs, then long blocks by punctuation or length. */
export function splitIntoSlides(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [' '];
  }

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const raw = paragraphs.length > 0 ? paragraphs : [trimmed];
  const slides: string[] = [];

  for (const p of raw) {
    if (p.length <= MAX_CHARS_PER_SLIDE) {
      slides.push(p);
      continue;
    }
    let rest = p;
    while (rest.length > 0) {
      if (rest.length <= MAX_CHARS_PER_SLIDE) {
        slides.push(rest);
        break;
      }
      const head = rest.slice(0, MAX_CHARS_PER_SLIDE);
      const punct = Math.max(
        head.lastIndexOf('。'),
        head.lastIndexOf('！'),
        head.lastIndexOf('？'),
        head.lastIndexOf('.'),
        head.lastIndexOf('!'),
        head.lastIndexOf('?')
      );
      const cut =
        punct > HARD_CHUNK ? punct + 1 : MAX_CHARS_PER_SLIDE;
      const piece = rest.slice(0, cut).trim();
      if (piece) slides.push(piece);
      rest = rest.slice(cut).trim();
    }
  }

  return slides.length > 0 ? slides : [trimmed.slice(0, MAX_CHARS_PER_SLIDE)];
}

const PREFIX = 'slideshow:';

export function parseVideoTaskId(raw: string): { mode: 'slideshow'; id: string } | { mode: 'dashscope'; id: string } {
  if (raw.startsWith(PREFIX)) {
    return { mode: 'slideshow', id: raw.slice(PREFIX.length) };
  }
  return { mode: 'dashscope', id: raw };
}

export function formatSlideshowTaskId(uuid: string): string {
  return `${PREFIX}${uuid}`;
}

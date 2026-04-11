import sharp from 'sharp';

const W = 1280;
const H = 768;
const LINE_CHARS = 22;
const MAX_LINES = 14;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(text: string): string[] {
  const lines: string[] = [];
  const blocks = text.split(/\n/).map((b) => b.trim()).filter(Boolean);
  const parts = blocks.length > 0 ? blocks : [text.trim() || ' '];

  for (const para of parts) {
    let i = 0;
    while (i < para.length && lines.length < MAX_LINES) {
      lines.push(para.slice(i, i + LINE_CHARS));
      i += LINE_CHARS;
    }
  }
  if (lines.length === 0) return [' '];
  return lines.slice(0, MAX_LINES);
}

async function buildPngBuffer(
  body: string,
  bgBuffer: Buffer | null
): Promise<Buffer> {
  const lines = wrapLines(body);
  const TEXT_AREA_HEIGHT = lines.length * 44;
  const BOTTOM_MARGIN = 60;
  const startY = H - BOTTOM_MARGIN - TEXT_AREA_HEIGHT;
  const tspans = lines
    .map((line, idx) => {
      const y = startY + idx * 44;
      return `<tspan x="640" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  // 无图片时的渐变背景 SVG
  const bgSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a5f"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text text-anchor="middle" font-size="32" fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif">
    ${tspans}
  </text>
</svg>`);

  if (bgBuffer) {
    // 有图片时：保留原图 + 底部渐变遮罩 + 文字
    const bottomY = H - 300;
    const overlaySvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#000000;stop-opacity:0"/>
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.7"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${bottomY}" width="${W}" height="${H - bottomY}" fill="url(#fade)"/>
  <text text-anchor="middle" font-size="32" fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif">
    ${tspans}
  </text>
</svg>`);

    const resized = await sharp(bgBuffer)
      .resize(W, H, { fit: 'cover', position: 'center' })
      .withMetadata({ density: 72 })  // 强制设置 DPI
      .png({ compressionLevel: 9 })
      .toBuffer();

    return sharp(resized)
      .composite([{ input: overlaySvg, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  return sharp(bgSvg).png().toBuffer();
}

export async function renderSlidePng(
  outPath: string,
  body: string,
  bgBuffer: Buffer | null = null
): Promise<void> {
  console.log('[render] bgBuffer:', bgBuffer ? `${bgBuffer.length} bytes, magic: ${bgBuffer.slice(0, 4).toString('hex')}` : 'null');
  const buf = await buildPngBuffer(body, bgBuffer);
  console.log('[render] Output buffer:', buf.length, 'bytes, magic:', buf.slice(0, 8).toString('hex'));
  await sharp(buf).toFile(outPath);
}

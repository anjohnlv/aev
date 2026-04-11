import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { renderSlidePng } from './render-slide';
import { splitIntoSlides } from './split-script';
import { generateImageBuffer } from './ai-horde';
import {
  setSlideshowJobDone,
  setSlideshowJobFailed,
  updateSlideshowJobProgress,
} from './jobs';

function secPerSlide(): number {
  const raw = process.env.SLIDESHOW_SEC_PER_SLIDE;
  const n = raw ? Number.parseFloat(raw) : 4;
  return Number.isFinite(n) && n > 0.5 && n < 60 ? n : 4;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[ffmpeg] cwd:', process.cwd());
    console.log('[ffmpeg] cmd:', 'ffmpeg', args.join(' '));
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr?.on('data', (d: Buffer) => {
      err += d.toString();
    });
    p.on('error', (e) => reject(e));
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-1000)}`));
    });
  });
}

/** Build filter_complex concat for N image inputs, each shown for `sec` seconds. */
function buildConcatArgs(
  slidePaths: string[],
  outFile: string,
  sec: number
): string[] {
  const args: string[] = ['-y'];
  for (const sp of slidePaths) {
    args.push('-loop', '1', '-t', String(sec), '-i', sp);
  }
  const n = slidePaths.length;
  
  // 先标准化每张图片的 SAR 为 1:1
  let filter = '';
  for (let i = 0; i < n; i++) {
    filter += `[${i}:v]scale=1280:768:flags=lanczos,setsar=1[v${i}];`;
  }
  
  // 然后拼接
  const vin = Array.from({length: n}, (_, i) => `[v${i}]`).join('');
  filter += `${vin}concat=n=${n}:v=1:a=0[outv]`;
  
  args.push(
    '-filter_complex',
    filter,
    '-map',
    '[outv]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    outFile
  );
  return args;
}

interface Shot {
  scene: string;
  text: string;
}

interface Storyboard {
  summary?: string;
  shots: Shot[];
}

export async function runSlideshowGeneration(
  jobId: string,
  script: string,
  storyboard?: Storyboard
): Promise<void> {
  const root = process.cwd();
  const dir = path.join(root, 'public', 'generated-video', jobId);
  const outRel = `/generated-video/${jobId}/out.mp4`;
  const outFile = path.join(dir, 'out.mp4');

  try {
    await mkdir(dir, { recursive: true });

    const slideData = storyboard?.shots
      ? storyboard.shots.map((shot) => ({
          imagePrompt: shot.scene,
          text: shot.text,
        }))
      : splitIntoSlides(script).map((text) => ({
          imagePrompt: text,
          text,
        }));

    const total = slideData.length;
    const sec = secPerSlide();

    updateSlideshowJobProgress(jobId, {
      phase: 'slides',
      label: `📝 准备渲染 ${total} 个分镜头...`,
      percent: 5,
      currentSlide: 0,
      totalSlides: total,
    });

    for (let i = 0; i < slideData.length; i++) {
      const name = `slide-${String(i).padStart(3, '0')}.png`;
      const { imagePrompt, text } = slideData[i];
      updateSlideshowJobProgress(jobId, {
        phase: 'slides',
        label: `🎨 正在渲染第 ${i + 1}/${total} 个分镜头...`,
        percent: Math.round((i / total) * 70),
        currentSlide: i + 1,
        totalSlides: total,
      });
      const bgBuffer = await generateImageBuffer(imagePrompt);
      await renderSlidePng(path.join(dir, name), text, bgBuffer);
      const done = i + 1;
      const pct = Math.round((done / total) * 70);
      updateSlideshowJobProgress(jobId, {
        phase: 'slides',
        label: `✨ 第 ${done}/${total} 个分镜头渲染完成`,
        percent: pct,
        currentSlide: done,
        totalSlides: total,
      });
    }

    const slidePaths = slideData.map((_, i) =>
      path.join(dir, `slide-${String(i).padStart(3, '0')}.png`)
    );

    updateSlideshowJobProgress(jobId, {
      phase: 'ffmpeg',
      label: '🎬 正在合成视频...',
      percent: 85,
      totalSlides: total,
    });

    await runFfmpeg(buildConcatArgs(slidePaths, outFile, sec));

    for (let i = 0; i < slideData.length; i++) {
      try {
        await rm(path.join(dir, `slide-${String(i).padStart(3, '0')}.png`));
      } catch {
        /* ignore */
      }
    }

    setSlideshowJobDone(jobId, outRel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setSlideshowJobFailed(jobId, msg);
  }
}

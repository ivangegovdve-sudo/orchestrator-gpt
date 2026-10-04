const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function ffmpeg(args, maxBuffer = 16 * 1024 * 1024) {
  const result = spawnSync('ffmpeg', ['-v', 'error', ...args], { maxBuffer });
  if (result.status !== 0) throw new Error(String(result.stderr || result.error));
  return result.stdout;
}

// Compress the moving samples, then append one lossless RGB keyframe. Keeping
// both streams VP9 Profile 1 / gbrp permits a direct concat without re-encoding
// the locked final page or changing codec/chroma geometry at the boundary.
function encodeFrames({ dir, target, reference, width, height, fps, frames }) {
  const encodedDir = path.join(dir, 'encoded');
  fs.mkdirSync(encodedDir, { recursive: true });
  const body = path.join(encodedDir, 'growth.mp4');
  const tail = path.join(encodedDir, 'final.mp4');
  const combined = path.join(encodedDir, 'hybrid.mp4');
  const codec = ['-an', '-c:v', 'libvpx-vp9', '-profile:v', '1', '-pix_fmt', 'gbrp',
    '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-threads', '8'];
  console.log(`${path.basename(dir)}: compressing ${frames - 1} growth samples`);
  ffmpeg(['-y', '-framerate', String(fps), '-i', path.join(dir, '%04d.png'),
    '-frames:v', String(frames - 1), ...codec, '-crf', '24', '-g', '48', '-movflags', '+faststart', body]);
  console.log(`${path.basename(dir)}: encoding the locked final RGB keyframe`);
  ffmpeg(['-y', '-framerate', String(fps), '-i', path.join(dir, `${String(frames - 1).padStart(4, '0')}.png`),
    '-frames:v', '1', ...codec, '-lossless', '1', '-crf', '0', '-g', '1', '-movflags', '+faststart', tail]);
  const list = path.join(encodedDir, 'concat.txt');
  fs.writeFileSync(list, "file 'growth.mp4'\nfile 'final.mp4'\n");
  ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', combined]);
  const maxBuffer = width * height * 4;
  const expected = ffmpeg(['-i', reference, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], maxBuffer);
  const actual = ffmpeg(['-i', combined, '-vf', `select=eq(n\\,${frames - 1})`,
    '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], maxBuffer);
  if (!actual.equals(expected)) throw new Error(`${path.basename(target)} encoded final frame differs from the locked RGB page`);
  const bytes = fs.statSync(combined).size;
  if (bytes >= 100000000) throw new Error(`${path.basename(target)} exceeds the 100 MB GitHub blob limit: ${bytes} bytes`);
  fs.copyFileSync(combined, target);
  console.log(`${path.basename(target)}: ${bytes} bytes; final decoded RGB equals reference`);
  return { bytes, codec: 'VP9 RGB Profile 1: CRF 24 growth; lossless final frame',
    compression: { profile: 1, pixelFormat: 'gbrp', growthFrames: frames - 1, growthCrf: 24, growthGop: 48,
      growthLossless: false, finalFrame: frames - 1, finalLossless: true } };
}
module.exports = { encodeFrames };

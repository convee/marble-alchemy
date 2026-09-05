/** Produces verified review/share derivatives while keeping the raw recording unchanged. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';

const RELEASE_NAME = 'codex-gameplay-v1.0.0.mp4';
const take = process.env.TAKE;
if (!take) throw new Error('Set TAKE to an existing artifacts/recordings/<take> directory.');
if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(take)) {
  throw new Error('TAKE must contain only letters, digits, dots, underscores, and hyphens.');
}

const folder = `artifacts/recordings/${take}`;
const raw = `${folder}/codex-raw.webm`;
const manifestPath = `${folder}/manifest.json`;
const releaseMp4 = `artifacts/release/${RELEASE_NAME}`;
const gif = 'docs/media/demo.gif';
const social = 'docs/media/social-preview.jpg';
const packagerPath = 'scripts/package-recording.mjs';
const teaserPath = 'scripts/teaser.filter';
const font = [
  process.env.RECORD_FONT,
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
].find((candidate) => candidate && existsSync(candidate));
if (!font) throw new Error('Set RECORD_FONT to a local bold TrueType font file.');
const filterFont = font.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'");
const hashFile = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
const run = (...args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const toolVersion = (tool) => execFileSync(tool, ['-version'], { encoding: 'utf8' }).split('\n')[0];
const probe = (path, recordedPath = path) => {
  const media = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }),
  );
  if (media.format) media.format.filename = recordedPath;
  return media;
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const durationOf = (media) => Number(media.format?.duration);
const videoStream = (media) => media.streams?.find((stream) => stream.codec_type === 'video');
const eventByAction = (events, action) => events.find((event) => event.action === action);
const lastEventByAction = (events, action) =>
  [...events].reverse().find((event) => event.action === action);

// Validate every input before ffmpeg or any destination write is allowed.
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert(manifest.schemaVersion === 2, 'Recording manifest schemaVersion must be 2. Re-record it.');
assert(
  manifest.take === take,
  `Manifest take ${manifest.take} does not match requested take ${take}.`,
);
assert(manifest.outcome === 'won', `Refusing to package outcome ${manifest.outcome}.`);
assert(manifest.validation?.passed === true, 'Refusing to package a failed recording validation.');
assert(
  manifest.source?.unchanged === true,
  'Refusing to package a recording whose source changed.',
);
assert(
  JSON.stringify(manifest.source?.before) === JSON.stringify(manifest.source?.after),
  'Recording source snapshots do not match.',
);
assert(Array.isArray(manifest.events), 'Manifest events must be an array.');
assert(Array.isArray(manifest.responses), 'Manifest responses must be an array.');
assert(
  manifest.validation.errors?.length === 0 &&
    manifest.validation.externalRequests?.length === 0 &&
    manifest.validation.httpErrors?.length === 0 &&
    manifest.validation.responseMismatches?.length === 0 &&
    manifest.validation.unservedRequiredDistPaths?.length === 0,
  'Recording validation details contain a fatal error.',
);
const requiredDistPaths = manifest.source?.before?.dist?.requiredPaths;
const distFiles = manifest.source?.before?.dist?.files;
assert(Array.isArray(requiredDistPaths) && requiredDistPaths.length > 0, 'Missing dist entries.');
assert(distFiles && typeof distFiles === 'object', 'Missing dist file hashes.');
for (const path of requiredDistPaths) {
  const expectedSha256 = distFiles[path]?.sha256;
  const matchingResponse = manifest.responses.find(
    (response) =>
      response.distPath === path &&
      response.expectedSha256 === expectedSha256 &&
      response.sha256 === expectedSha256 &&
      response.matchesDist === true,
  );
  assert(matchingResponse, `Required dist entry ${path} has no matching same-origin response.`);
}
assert(manifest.rawVideo?.path === 'codex-raw.webm', 'Unexpected rawVideo path in manifest.');
assert(typeof manifest.rawVideo.sha256 === 'string', 'Manifest is missing rawVideo.sha256.');
const rawSha256 = await hashFile(raw);
assert(
  rawSha256 === manifest.rawVideo.sha256,
  `Raw video SHA-256 mismatch: manifest=${manifest.rawVideo.sha256}, actual=${rawSha256}.`,
);

const rawMedia = probe(raw);
const rawDuration = durationOf(rawMedia);
const rawVideoStream = videoStream(rawMedia);
assert(Number.isFinite(rawDuration) && rawDuration > 0, 'Raw recording has no valid duration.');
assert(rawVideoStream, 'Raw recording has no video stream.');
const helpClose = eventByAction(manifest.events, 'help-close');
const firstUpgrade = eventByAction(manifest.events, 'upgrade-picked');
const finalShoot = lastEventByAction(manifest.events, 'shoot');
const runFinished = eventByAction(manifest.events, 'run-finished');
for (const [name, event] of [
  ['help-close', helpClose],
  ['first upgrade-picked', firstUpgrade],
  ['final shoot', finalShoot],
  ['run-finished', runFinished],
]) {
  assert(Number.isFinite(event?.seconds), `Manifest is missing a valid ${name} event.`);
}
assert(runFinished.seconds < rawDuration, 'run-finished occurs outside the raw video duration.');

const openingStart = Math.max(0, helpClose.seconds - 0.05);
const provisionalFinaleStart = Math.max(finalShoot.seconds - 0.1, runFinished.seconds - 10);
const finaleStart = Math.max(openingStart + 1, provisionalFinaleStart);
const openingEnd = Math.min(firstUpgrade.seconds + 0.4, finaleStart - 0.25);
const finaleEnd = Math.min(rawDuration, runFinished.seconds + 1.35);
const socialFrameSecond = Math.min(rawDuration - 0.1, runFinished.seconds + 0.5);
assert(openingEnd - openingStart >= 1, 'Opening excerpt is too short after dynamic selection.');
assert(finaleEnd - finaleStart >= 1, 'Final excerpt is too short after dynamic selection.');
assert(
  finaleStart <= runFinished.seconds && finaleEnd > runFinished.seconds,
  'Final excerpt does not contain run-finished.',
);
assert(
  socialFrameSecond > runFinished.seconds && socialFrameSecond < rawDuration,
  'Social frame does not show the post-victory state.',
);

const teaserTemplate = await readFile(teaserPath, 'utf8');
const teaserFilter = teaserTemplate
  .replaceAll('{{FONT}}', filterFont)
  .replaceAll('{{OPENING_START}}', openingStart.toFixed(3))
  .replaceAll('{{OPENING_END}}', openingEnd.toFixed(3))
  .replaceAll('{{FINALE_START}}', finaleStart.toFixed(3))
  .replaceAll('{{FINALE_END}}', finaleEnd.toFixed(3));
assert(!teaserFilter.includes('{{'), 'Unresolved placeholder in teaser.filter.');
const tools = { ffmpeg: toolVersion('ffmpeg'), ffprobe: toolVersion('ffprobe') };
const teaserTemplateSha256 = await hashFile(teaserPath);
const resolvedTeaserFilterSha256 = createHash('sha256').update(teaserFilter).digest('hex');
const packagingInputs = {
  packagerSha256: await hashFile(packagerPath),
  teaserFilter: {
    fileName: basename(teaserPath),
    sha256: teaserTemplateSha256,
    resolvedSha256: resolvedTeaserFilterSha256,
  },
  font: { fileName: basename(font), sha256: await hashFile(font) },
};

await mkdir('docs/media', { recursive: true });
await mkdir('evaluation/current', { recursive: true });
await mkdir('artifacts/release', { recursive: true });
const tempDir = await mkdtemp(`${folder}/.package-`);
const stagedMp4 = join(tempDir, RELEASE_NAME);
const stagedGif = join(tempDir, 'demo.gif');
const stagedSocial = join(tempDir, 'social-preview.jpg');
const stagedManifest = join(tempDir, 'manifest.json');

const installAtomically = async (entries, verify) => {
  const backups = [];
  const installed = [];
  try {
    for (const [index, entry] of entries.entries()) {
      const backup = join(tempDir, `.backup-${index}`);
      if (existsSync(entry.destination)) {
        await rename(entry.destination, backup);
        backups.push({ backup, destination: entry.destination });
      }
      await rename(entry.staged, entry.destination);
      installed.push(entry.destination);
    }
    await verify();
  } catch (error) {
    for (const destination of installed.reverse()) await rm(destination, { force: true });
    for (const entry of backups.reverse()) await rename(entry.backup, entry.destination);
    throw error;
  }
};

try {
  run(
    '-i',
    raw,
    '-vf',
    `drawtext=fontfile='${filterFont}':text='CODEX BUILD  |  FULL PLAYTHROUGH':fontcolor=white:fontsize=28:x=32:y=30:box=1:boxcolor=0x100f19AA:boxborderw=12`,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '21',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    stagedMp4,
  );
  run('-i', raw, '-filter_complex', teaserFilter, '-map', '[out]', '-loop', '0', stagedGif);
  run(
    '-ss',
    socialFrameSecond.toFixed(3),
    '-i',
    raw,
    '-frames:v',
    '1',
    '-vf',
    `scale=1280:800:flags=lanczos,crop=1280:640:0:80,drawtext=fontfile='${filterFont}':text='MARBLE ALCHEMY WORKSHOP':fontcolor=white:fontsize=42:x=42:y=42:box=1:boxcolor=0x100f19BB:boxborderw=16`,
    '-q:v',
    '3',
    stagedSocial,
  );

  const fullMp4Media = probe(stagedMp4, releaseMp4);
  const readmeGifMedia = probe(stagedGif, gif);
  const socialPreviewMedia = probe(stagedSocial, social);
  const fullMp4Stream = videoStream(fullMp4Media);
  const readmeGifStream = videoStream(readmeGifMedia);
  const socialPreviewStream = videoStream(socialPreviewMedia);
  assert(fullMp4Media.format?.format_name.includes('mp4'), 'Full video is not an MP4 container.');
  assert(fullMp4Stream?.codec_name === 'h264', 'Full video is not H.264.');
  assert(fullMp4Stream?.pix_fmt === 'yuv420p', 'Full video pixel format is not yuv420p.');
  assert(Math.abs(durationOf(fullMp4Media) - rawDuration) <= 0.25, 'Full MP4 duration changed.');
  const mp4Bytes = await readFile(stagedMp4);
  const moovOffset = mp4Bytes.indexOf(Buffer.from('moov'));
  const mdatOffset = mp4Bytes.indexOf(Buffer.from('mdat'));
  assert(moovOffset >= 0 && mdatOffset >= 0 && moovOffset < mdatOffset, 'MP4 is not fast-started.');
  assert(readmeGifMedia.format?.format_name === 'gif', 'README derivative is not GIF.');
  assert(
    readmeGifStream?.codec_name === 'gif' &&
      readmeGifStream.width === 720 &&
      readmeGifStream.height === 450,
    'README GIF codec or dimensions are invalid.',
  );
  assert(
    socialPreviewStream?.codec_name === 'mjpeg' &&
      socialPreviewStream.width === 1280 &&
      socialPreviewStream.height === 640,
    'Social preview codec or dimensions are invalid.',
  );
  assert(
    (await stat(stagedSocial)).size < 1024 * 1024,
    'Social preview must be smaller than 1 MiB.',
  );

  manifest.rawVideo.media = rawMedia;
  manifest.packaging = {
    completedAt: new Date().toISOString(),
    inputs: packagingInputs,
    clips: {
      opening: [openingStart, openingEnd],
      finale: [finaleStart, finaleEnd],
      socialFrameSecond,
    },
  };
  manifest.derivatives = {
    fullMp4: {
      path: releaseMp4,
      relativeTo: 'repository-root',
      sha256: await hashFile(stagedMp4),
      processing: 'Complete H.264 transcode with label overlay; no cuts or speed changes',
      temporalEditing: 'none',
      fastStart: true,
      media: fullMp4Media,
    },
    readmeGif: {
      path: gif,
      relativeTo: 'repository-root',
      sha256: await hashFile(stagedGif),
      processing: 'Two disclosed excerpts, 1.67x speed, 12fps, 720x450, label overlay',
      excerptsSeconds: [
        [openingStart, openingEnd],
        [finaleStart, finaleEnd],
      ],
      speed: 1 / 0.6,
      media: readmeGifMedia,
    },
    socialPreview: {
      path: social,
      relativeTo: 'repository-root',
      sha256: await hashFile(stagedSocial),
      processing: `Static gameplay frame at ${socialFrameSecond.toFixed(3)}s, cropped to 1280x640 with title overlay`,
      media: socialPreviewMedia,
    },
  };
  manifest.tools = tools;
  await writeFile(stagedManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  const installEntries = [
    { staged: stagedMp4, destination: releaseMp4, sha256: manifest.derivatives.fullMp4.sha256 },
    { staged: stagedGif, destination: gif, sha256: manifest.derivatives.readmeGif.sha256 },
    {
      staged: stagedSocial,
      destination: social,
      sha256: manifest.derivatives.socialPreview.sha256,
    },
    { staged: stagedManifest, destination: manifestPath, sha256: await hashFile(stagedManifest) },
  ];
  await installAtomically(installEntries, async () => {
    for (const entry of installEntries) {
      assert(
        (await hashFile(entry.destination)) === entry.sha256,
        `Installed file hash mismatch: ${entry.destination}`,
      );
    }
  });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log(
  JSON.stringify(
    {
      release: releaseMp4,
      manifest: manifestPath,
      derivatives: manifest.derivatives,
    },
    null,
    2,
  ),
);

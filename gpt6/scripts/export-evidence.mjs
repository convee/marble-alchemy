/** Exports a sanitized, checksummed evidence bundle for evaluation and release. */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const VERSION = 'v1.0.0';
const RELEASE_MP4_NAME = `codex-gameplay-${VERSION}.mp4`;
const RELEASE_RAW_NAME = `codex-gameplay-${VERSION}-raw.webm`;
const RELEASE_MANIFEST_NAME = `recording-manifest-${VERSION}.json`;
const CHECKSUMS_NAME = 'SHA256SUMS';
const take = process.env.TAKE;
if (!take) throw new Error('Set TAKE to the packaged recording to export.');
if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(take)) {
  throw new Error('TAKE must contain only letters, digits, dots, underscores, and hyphens.');
}

const folder = `artifacts/recordings/${take}`;
const recordingManifestPath = `${folder}/manifest.json`;
const rawSourcePath = `${folder}/codex-raw.webm`;
const e2eSourcePath = 'artifacts/e2e-results.json';
const evidenceDir = 'evaluation/current';
const releaseDir = 'artifacts/release';
const manifestDestination = `${evidenceDir}/recording-manifest.json`;
const e2eDestination = `${evidenceDir}/e2e-results.json`;
const releaseMp4 = `${releaseDir}/${RELEASE_MP4_NAME}`;
const releaseRaw = `${releaseDir}/${RELEASE_RAW_NAME}`;
const releaseManifest = `${releaseDir}/${RELEASE_MANIFEST_NAME}`;
const checksumsDestination = `${releaseDir}/${CHECKSUMS_NAME}`;
const hashFile = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await mkdir(evidenceDir, { recursive: true });
await mkdir(releaseDir, { recursive: true });

// Validate the complete source bundle before staging any publishable file.
const manifest = JSON.parse(await readFile(recordingManifestPath, 'utf8'));
assert(manifest.schemaVersion === 2, 'Only recording manifest schemaVersion 2 can be exported.');
assert(manifest.take === take, 'Manifest take does not match TAKE.');
assert(manifest.outcome === 'won', 'Only a winning recording can be exported.');
assert(manifest.validation?.passed === true, 'Recording validation did not pass.');
assert(manifest.source?.unchanged === true, 'Recording source changed during capture.');
assert(
  JSON.stringify(manifest.source?.before) === JSON.stringify(manifest.source?.after),
  'Recording source snapshots do not match.',
);
assert(existsSync(rawSourcePath), `Missing raw recording: ${rawSourcePath}`);
assert(
  (await hashFile(rawSourcePath)) === manifest.rawVideo?.sha256,
  'Raw recording SHA-256 does not match manifest.',
);
assert(manifest.rawVideo?.media?.streams?.length > 0, 'Raw recording media probe is missing.');
assert(manifest.packaging?.inputs?.packagerSha256, 'Packager hash is missing.');
assert(manifest.packaging?.inputs?.teaserFilter?.sha256, 'Filter hash is missing.');
assert(manifest.packaging?.inputs?.font?.sha256, 'Font hash is missing.');

const publishedDerivatives = [
  ['fullMp4', releaseMp4],
  ['readmeGif', 'docs/media/demo.gif'],
  ['socialPreview', 'docs/media/social-preview.jpg'],
];
for (const [name, expectedPath] of publishedDerivatives) {
  const derivative = manifest.derivatives?.[name];
  assert(derivative?.path === expectedPath, `${name} path is invalid.`);
  assert(existsSync(expectedPath), `Missing ${name}: ${expectedPath}`);
  assert((await hashFile(expectedPath)) === derivative.sha256, `${name} SHA-256 mismatch.`);
  assert(derivative.media?.streams?.length > 0, `${name} media probe is missing.`);
}
assert(RELEASE_MP4_NAME === 'codex-gameplay-v1.0.0.mp4', 'Release MP4 filename must remain exact.');

const e2eResults = JSON.parse(await readFile(e2eSourcePath, 'utf8'));
assert(e2eResults.stats?.expected > 0, 'E2E report contains no expected tests.');
assert(e2eResults.stats?.unexpected === 0, 'E2E report contains unexpected failures.');

const repositoryRoot = resolve(process.cwd());
const userHome = resolve(homedir());
const replacements = [
  [`file://${repositoryRoot}`, '<repo>'],
  [repositoryRoot, '<repo>'],
  [`file://${userHome}`, '<home>'],
  [userHome, '<home>'],
].sort((left, right) => right[0].length - left[0].length);
const localPathPattern = () =>
  /(^|[\s("'=])(?:(?:file:\/\/)?\/(?:Users|home|private|tmp|var\/folders|Applications|Library|opt|usr\/local)\/|(?:file:\/\/\/)?[A-Za-z]:[\\/])[^\s"')\]]*/gm;
const sanitizeString = (value) => {
  const knownPathsRemoved = replacements.reduce(
    (sanitized, [machinePath, replacement]) => sanitized.replaceAll(machinePath, replacement),
    value,
  );
  return knownPathsRemoved.replace(
    localPathPattern(),
    (match, prefix) => `${prefix}<absolute-path>`,
  );
};
const sanitize = (value) => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [sanitizeString(key), sanitize(entry)]),
    );
  }
  return typeof value === 'string' ? sanitizeString(value) : value;
};
const assertPortable = (serialized, name) => {
  for (const machinePath of [repositoryRoot, userHome]) {
    assert(!serialized.includes(machinePath), `${name} still contains ${machinePath}.`);
  }
  assert(!localPathPattern().test(serialized), `${name} still contains a machine absolute path.`);
};

const sanitizedManifest = sanitize(manifest);
sanitizedManifest.releaseBundle = {
  version: VERSION,
  files: {
    fullMp4: { path: RELEASE_MP4_NAME, sha256: manifest.derivatives.fullMp4.sha256 },
    rawWebm: { path: RELEASE_RAW_NAME, sha256: manifest.rawVideo.sha256 },
    manifest: { path: RELEASE_MANIFEST_NAME },
    checksums: { path: CHECKSUMS_NAME },
  },
};
const sanitizedE2eResults = sanitize(e2eResults);
const serializedManifest = `${JSON.stringify(sanitizedManifest, null, 2)}\n`;
const serializedE2eResults = `${JSON.stringify(sanitizedE2eResults, null, 2)}\n`;
assertPortable(serializedManifest, 'Manifest');
assertPortable(serializedE2eResults, 'E2E report');

const tempDir = await mkdtemp(join(releaseDir, '.export-'));
const stagedRaw = join(tempDir, RELEASE_RAW_NAME);
const stagedReleaseManifest = join(tempDir, RELEASE_MANIFEST_NAME);
const stagedChecksums = join(tempDir, CHECKSUMS_NAME);
const stagedCurrentManifest = join(tempDir, 'recording-manifest.json');
const stagedE2e = join(tempDir, 'e2e-results.json');

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
  await copyFile(rawSourcePath, stagedRaw);
  await writeFile(stagedReleaseManifest, serializedManifest);
  await writeFile(stagedCurrentManifest, serializedManifest);
  await writeFile(stagedE2e, serializedE2eResults);

  const stagedHashes = {
    mp4: await hashFile(releaseMp4),
    raw: await hashFile(stagedRaw),
    manifest: await hashFile(stagedReleaseManifest),
    currentManifest: await hashFile(stagedCurrentManifest),
    e2e: await hashFile(stagedE2e),
  };
  assert(stagedHashes.mp4 === manifest.derivatives.fullMp4.sha256, 'Release MP4 changed.');
  assert(stagedHashes.raw === manifest.rawVideo.sha256, 'Staged raw recording changed.');
  assert(
    stagedHashes.manifest === stagedHashes.currentManifest,
    'Release and current manifests differ.',
  );
  const checksumLines = [
    [RELEASE_MP4_NAME, stagedHashes.mp4],
    [RELEASE_RAW_NAME, stagedHashes.raw],
    [RELEASE_MANIFEST_NAME, stagedHashes.manifest],
  ]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, sha256]) => `${sha256}  ${name}`)
    .join('\n');
  const serializedChecksums = `${checksumLines}\n`;
  await writeFile(stagedChecksums, serializedChecksums);
  const stagedChecksumsSha256 = await hashFile(stagedChecksums);

  const installEntries = [
    { staged: stagedRaw, destination: releaseRaw, sha256: stagedHashes.raw },
    {
      staged: stagedReleaseManifest,
      destination: releaseManifest,
      sha256: stagedHashes.manifest,
    },
    { staged: stagedChecksums, destination: checksumsDestination, sha256: stagedChecksumsSha256 },
    {
      staged: stagedCurrentManifest,
      destination: manifestDestination,
      sha256: stagedHashes.currentManifest,
    },
    { staged: stagedE2e, destination: e2eDestination, sha256: stagedHashes.e2e },
  ];
  await installAtomically(installEntries, async () => {
    assert((await hashFile(releaseMp4)) === stagedHashes.mp4, 'Installed MP4 hash mismatch.');
    for (const entry of installEntries) {
      assert(
        (await hashFile(entry.destination)) === entry.sha256,
        `Installed file hash mismatch: ${entry.destination}`,
      );
    }
    assert(
      (await readFile(checksumsDestination, 'utf8')) === serializedChecksums,
      'Installed SHA256SUMS content mismatch.',
    );
    assertPortable(await readFile(releaseManifest, 'utf8'), 'Installed release manifest');
    assertPortable(await readFile(e2eDestination, 'utf8'), 'Installed E2E report');
  });

  console.log(
    JSON.stringify(
      {
        evaluation: {
          manifest: { path: manifestDestination, sha256: stagedHashes.currentManifest },
          e2e: { path: e2eDestination, sha256: stagedHashes.e2e },
        },
        release: {
          mp4: { path: releaseMp4, sha256: stagedHashes.mp4 },
          raw: { path: releaseRaw, sha256: stagedHashes.raw },
          manifest: { path: releaseManifest, sha256: stagedHashes.manifest },
          checksums: { path: checksumsDestination, sha256: stagedChecksumsSha256 },
        },
      },
      null,
      2,
    ),
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

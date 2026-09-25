import { cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const assets = [
  ['src/db/schema.sql', 'dist/db/schema.sql'],
  ['src/data/seed-parts.json', 'dist/data/seed-parts.json']
];

await Promise.all(
  assets.map(([from, to]) =>
    cp(path.join(serverRoot, from), path.join(serverRoot, to), { recursive: true })
  )
);

console.log(`Copied ${assets.length} runtime assets into dist/`);

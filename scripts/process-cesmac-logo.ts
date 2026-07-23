import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const assetsDir = join(process.cwd(), 'assets', 'reports');
const sourcePath = join(assetsDir, 'cesmac-logo.jpeg');
const outputPath = join(assetsDir, 'cesmac-logo.png');

async function processWithFfmpeg(): Promise<void> {
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      sourcePath,
      '-vf',
      'colorkey=0x000000:0.12:0.08,format=rgba',
      outputPath,
    ],
    { stdio: 'pipe' },
  );
}

async function main() {
  if (!existsSync(sourcePath)) {
    throw new Error(`Arquivo fonte não encontrado: ${sourcePath}`);
  }

  await processWithFfmpeg();
  console.log(`Logo com fundo transparente salvo em ${outputPath}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface CompressionResult {
  compressedBuffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressAudio(audioBuffer: Buffer, originalName: string): Promise<CompressionResult> {
  const tempId = randomUUID();
  const inputPath = join(tmpdir(), `input-${tempId}`);
  const outputPath = join(tmpdir(), `output-${tempId}.mp3`);

  try {
    await fs.writeFile(inputPath, audioBuffer);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-vn',
        '-ar', '16000',
        '-ac', '1',
        '-b:a', '64k',
        '-f', 'mp3',
        '-y',
        outputPath
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      });
    });

    const compressedBuffer = await fs.readFile(outputPath);
    const originalSize = audioBuffer.length;
    const compressedSize = compressedBuffer.length;

    return {
      compressedBuffer,
      originalSize,
      compressedSize,
      compressionRatio: Math.round((1 - compressedSize / originalSize) * 100)
    };
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}

import fs from 'node:fs/promises';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

export async function loadModel(filename) {
  const bytes = await fs.readFile(
    new URL('../assets/' + filename, import.meta.url),
  );
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  return (await new GLTFLoader().parseAsync(data, '')).scene;
}

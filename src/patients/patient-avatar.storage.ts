import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { AvatarImageInput } from './schemas/patient.schemas';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'patients');

export async function savePatientAvatar(
  patientId: string,
  image: AvatarImageInput,
): Promise<string> {
  const extension = image.mimeType === 'image/png' ? 'png' : 'jpg';
  const fileName = `${patientId}.${extension}`;
  const absolutePath = join(UPLOADS_DIR, fileName);

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(absolutePath, Buffer.from(image.base64, 'base64'));

  return `/uploads/patients/${fileName}`;
}

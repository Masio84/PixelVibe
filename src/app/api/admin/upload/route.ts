import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const assetKey: string | null = data.get('assetKey') as string;

    if (!file || !assetKey) {
      return NextResponse.json({ error: 'Faltan datos (file o assetKey)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/assets/sprites/
    const filename = `${assetKey}.png`;
    const path = join(process.cwd(), 'public/assets/sprites', filename);
    
    await writeFile(path, buffer);
    
    console.log(`[Admin] Asset subido a: ${path}`);

    return NextResponse.json({ success: true, path: `/assets/sprites/${filename}` });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Error al procesar el archivo' }, { status: 500 });
  }
}

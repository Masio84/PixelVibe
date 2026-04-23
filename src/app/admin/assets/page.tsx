'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AssetCatalogEntry, AvatarPieceCategory, AvatarGender } from '@/lib/types';

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<AssetCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Form states
  const [file, setFile] = useState<File | null>(null);
  const [assetKey, setAssetKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<AvatarPieceCategory>('hair');
  const [gender, setGender] = useState<AvatarGender | 'unisex'>('unisex');
  const [uploading, setUploading] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    const { data } = await supabase.from('asset_catalog').select('*').order('category').order('sort_order');
    if (data) setAssets(data as AssetCatalogEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !assetKey || !displayName) return alert('Completa todos los campos');

    // 1. Validate image dimensions (192x128)
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    if (img.width !== 192 || img.height !== 128) {
      alert(`Error: La imagen debe ser de 192x128 píxeles. (Actual: ${img.width}x${img.height})`);
      return;
    }

    setUploading(true);

    try {
      // 2. Upload via API Route to public/assets/sprites/
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assetKey', assetKey);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      // 3. Save to Supabase Catalog
      const { error } = await supabase.from('asset_catalog').upsert({
        asset_key: assetKey,
        category,
        gender,
        display_name: displayName,
        sprite_url: data.path, // e.g. /assets/sprites/hair_m_1.png
        is_active: true,
      }, { onConflict: 'asset_key' });

      if (error) throw error;

      alert('Asset subido correctamente!');
      setFile(null);
      setAssetKey('');
      setDisplayName('');
      fetchAssets();

    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('asset_catalog').update({ is_active: !current }).eq('id', id);
    fetchAssets();
  };

  const deleteAsset = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar este asset del catálogo?')) return;
    await supabase.from('asset_catalog').delete().eq('id', id);
    fetchAssets();
  };

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      {/* Upload Form */}
      <div style={{ flex: '0 0 320px', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px' }}>
        <h3>Subir Nuevo Asset</h3>
        <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '1rem' }}>Sube el spritesheet de 192x128px (6x4 frames).</p>
        
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Archivo PNG</label>
            <input type="file" accept="image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} required style={{ width: '100%', fontSize: '0.8rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Asset Key (Único)</label>
            <input placeholder="ej: hair_m_6" value={assetKey} onChange={(e) => setAssetKey(e.target.value.toLowerCase())} required style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Nombre a mostrar</label>
            <input placeholder="ej: Cabello Puntiagudo" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={inputStyle}>
              <option value="body">Cuerpo base</option>
              <option value="hair">Cabello</option>
              <option value="top">Ropa Superior</option>
              <option value="bottom">Ropa Inferior</option>
              <option value="shoes">Zapatos</option>
              <option value="accessory">Accesorio</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Género / Tipo</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as any)} style={inputStyle}>
              <option value="unisex">Unisex</option>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </div>

          <button disabled={uploading} style={{ padding: '0.75rem', background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {uploading ? 'Subiendo...' : 'Publicar Asset'}
          </button>
        </form>
      </div>

      {/* Asset Table */}
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px' }}>
        <h3>Catálogo de Assets</h3>
        
        {loading ? <p>Cargando catálogo...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
                <th style={{ padding: '8px' }}>Preview</th>
                <th style={{ padding: '8px' }}>Asset Key</th>
                <th style={{ padding: '8px' }}>Nombre</th>
                <th style={{ padding: '8px' }}>Categoría</th>
                <th style={{ padding: '8px' }}>Activo</th>
                <th style={{ padding: '8px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px' }}>
                    <div style={{ width: '32px', height: '32px', overflow: 'hidden', imageRendering: 'pixelated' }}>
                      <img src={asset.sprite_url} alt={asset.asset_key} style={{ width: '192px', height: '128px', objectFit: 'none', objectPosition: '0 0' }} />
                    </div>
                  </td>
                  <td style={{ padding: '8px', color: '#6c63ff' }}>{asset.asset_key}</td>
                  <td style={{ padding: '8px' }}>{asset.display_name}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ padding: '2px 6px', background: '#333', borderRadius: '4px', fontSize: '0.75rem' }}>{asset.category}</span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => toggleActive(asset.id, asset.is_active)} style={{ background: asset.is_active ? '#2ecc71' : '#e74c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                      {asset.is_active ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => deleteAsset(asset.id)} style={{ background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Borrar</button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No hay assets en la base de datos.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px',
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  borderRadius: '4px',
  outline: 'none',
};

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ALL_TEMPLATES } from '@/lib/mapTemplates';
import type { MapData } from '@/game/map';
import type { Workspace } from '@/lib/types';
import MapEditor from '@/components/MapEditor';

export default function ArchitectPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'templates' | 'editor'>('templates');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [editorData, setEditorData] = useState<MapData | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load admin's workspaces on mount
  useEffect(() => {
    const loadAdminWorkspaces = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .eq('admin_id', session.user.id);
      
      if (ws && ws.length > 0) {
        setWorkspaces(ws);
        setSelectedWorkspaceId(ws[0].id);
      } else {
        // Superadmins might want to see all workspaces
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.role === 'superadmin') {
          const { data: allWs } = await supabase.from('workspaces').select('*');
          if (allWs && allWs.length > 0) {
            setWorkspaces(allWs);
            setSelectedWorkspaceId(allWs[0].id);
          }
        }
      }
    };
    loadAdminWorkspaces();
  }, [supabase]);

  // Load active layout for selected workspace
  useEffect(() => {
    if (!selectedWorkspaceId) {
      setIsLoading(false);
      return;
    }

    async function loadActiveLayout() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('building_layouts')
          .select('*')
          .eq('workspace_id', selectedWorkspaceId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (data) {
          setEditorData({
            id: data.id,
            name: data.name,
            width: data.width,
            height: data.height,
            grid: data.grid,
            zones: data.zones ?? [],
            furniture: data.furniture ?? []
          });
        } else {
          setEditorData(ALL_TEMPLATES[0]); // fallback to first template
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadActiveLayout();
  }, [supabase, selectedWorkspaceId]);
  
  // Handlers
  const applyTemplate = async (template: MapData) => {
    setIsApplying(true);
    try {
      // Deactivate all others for this workspace
      await supabase
        .from('building_layouts')
        .update({ is_active: false })
        .eq('workspace_id', selectedWorkspaceId);
      
      const newLayoutId = `layout_${selectedWorkspaceId}_${Date.now()}`;

      // Upsert the template
      const { error } = await supabase.from('building_layouts').upsert({
        id: newLayoutId,
        workspace_id: selectedWorkspaceId,
        name: template.name,
        width: template.width,
        height: template.height,
        grid: template.grid,
        zones: template.zones,
        furniture: template.furniture,
        is_template: false, // It's a copy now
        is_active: true,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      
      setEditorData(template);
      alert(`¡Plantilla '${template.name}' aplicada con éxito! Todos los usuarios conectados verán el cambio inmediatamente.`);
    } catch (err: any) {
      console.error(err);
      alert('Error al aplicar plantilla: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveEditor = async (data: MapData) => {
    setIsApplying(true);
    try {
      // Deactivate current active for this workspace
      await supabase
        .from('building_layouts')
        .update({ is_active: false })
        .eq('workspace_id', selectedWorkspaceId);

      const customId = data.id.includes(selectedWorkspaceId) ? data.id : `custom_${selectedWorkspaceId}_${Date.now()}`;

      const { error } = await supabase.from('building_layouts').upsert({
        id: customId,
        workspace_id: selectedWorkspaceId,
        name: data.name.includes('Custom') ? data.name : `Custom: ${data.name}`,
        width: data.width,
        height: data.height,
        grid: data.grid,
        zones: data.zones,
        furniture: data.furniture,
        is_template: false,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (error) throw error;
      
      setEditorData({ ...data, id: customId, name: data.name.includes('Custom') ? data.name : `Custom: ${data.name}` });
      alert('Diseño guardado y aplicado correctamente.');
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="architect-page">
      <header className="arch-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Arquitecto de Edificio 🏗️</h2>
          
          <div className="workspace-selector">
            <label>Editando grupo:</label>
            <select 
              value={selectedWorkspaceId} 
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
              {workspaces.length === 0 && <option>Sin grupos disponibles</option>}
            </select>
          </div>
        </div>

        <div className="arch-tabs">
          <button 
            className={`arch-tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            📋 Plantillas
          </button>
          <button 
            className={`arch-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            🖱️ Editor Visual
          </button>
        </div>
      </header>

      <div className="arch-content">
        {activeTab === 'templates' && (
          <div className="templates-view">
            <p className="arch-desc">Selecciona una plantilla prediseñada para aplicarla instantáneamente a la oficina.</p>
            <div className="templates-grid">
              {ALL_TEMPLATES.map(tpl => (
                <div key={tpl.id} className="template-card">
                  <div className="tpl-preview">
                    <div className="tpl-icon">{tpl.name.includes('Garden') ? '🌿' : tpl.name.includes('Corporate') ? '🏢' : '🎨'}</div>
                    <div className="tpl-dims">{tpl.width} x {tpl.height}</div>
                  </div>
                  <div className="tpl-info">
                    <h3>{tpl.name}</h3>
                    <p>{tpl.zones.length} Zonas definidas</p>
                    <button 
                      className="btn-apply"
                      disabled={isApplying}
                      onClick={() => applyTemplate(tpl)}
                    >
                      {isApplying ? 'Aplicando...' : 'Aplicar a la Oficina'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="editor-view" style={{ flex: 1, height: '600px' }}>
            {isLoading ? (
              <p>Cargando editor...</p>
            ) : editorData ? (
              <MapEditor initialData={editorData} onSave={handleSaveEditor} />
            ) : (
              <p>Error cargando datos del editor.</p>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .architect-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          height: 100%;
        }
        .arch-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .arch-header h2 {
          margin: 0;
          font-family: var(--font-pixel);
          font-size: 1.2rem;
          background: linear-gradient(135deg, #6c63ff, #ff6584);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .arch-tabs {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 0.5rem;
        }
        .arch-tab {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1rem;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 8px;
        }
        .arch-tab:hover {
          background: rgba(255,255,255,0.05);
          color: #fff;
        }
        .arch-tab.active {
          background: rgba(108, 99, 255, 0.2);
          color: #fff;
          border: 1px solid rgba(108, 99, 255, 0.4);
        }
        .workspace-selector {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          background: rgba(255,255,255,0.05);
          padding: 0.5rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .workspace-selector label {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .workspace-selector select {
          background: transparent;
          color: white;
          border: none;
          outline: none;
          font-weight: 600;
          cursor: pointer;
        }
        .arch-desc {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }
        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .template-card {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.2s;
        }
        .template-card:hover {
          transform: translateY(-4px);
        }
        .tpl-preview {
          height: 140px;
          background: rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tpl-icon {
          font-size: 3rem;
        }
        .tpl-dims {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          background: rgba(0,0,0,0.5);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .tpl-info {
          padding: 1.5rem;
        }
        .tpl-info h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
        }
        .tpl-info p {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0 0 1.5rem 0;
        }
        .btn-apply {
          width: 100%;
          background: var(--accent);
          color: white;
          border: none;
          padding: 0.8rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-apply:hover:not(:disabled) {
          background: #7c74ff;
        }
        .btn-apply:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .editor-placeholder {
          background: rgba(255,255,255,0.05);
          border: 1px dashed rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 4rem 2rem;
          text-align: center;
        }
        .editor-placeholder h3 {
          margin: 0 0 1rem 0;
        }
        .editor-placeholder p {
          color: var(--text-muted);
          margin: 0;
        }
      `}</style>
    </div>
  );
}

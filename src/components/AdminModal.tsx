'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, Workspace } from '@/lib/types';
import type { MapData } from '@/game/map';
import { ALL_TEMPLATES } from '@/lib/mapTemplates';
import { isTileWalkable } from '@/game/map';
import MapEditor from './MapEditor';

interface AdminModalProps {
  profile: UserProfile;
  currentWorkspaceId: string;
  onClose: () => void;
}

export default function AdminModal({ profile, currentWorkspaceId, onClose }: AdminModalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'workspaces' | 'architect'>('users');
  const supabase = createClient();

  // Shared state
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string>('');
  const [mapEditorData, setMapEditorData] = useState<MapData | null>(null);
  const [originalMapData, setOriginalMapData] = useState<MapData | null>(null);

  useEffect(() => {
    console.log('AdminModal cargado con perfil:', profile);
  }, [profile]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  }, [supabase]);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
    if (data) setWorkspaces(data);
    setLoading(false);
  }, [supabase]);

  const fetchWorkspaceLayout = useCallback(async () => {
    setLoading(true);
    
    // Fetch name
    const { data: wsData } = await supabase.from('workspaces').select('name').eq('id', currentWorkspaceId).maybeSingle();
    if (wsData) setCurrentWorkspaceName(wsData.name);

    const { data } = await supabase
      .from('building_layouts')
      .select('*')
      .eq('workspace_id', currentWorkspaceId)
      .eq('is_active', true)
      .maybeSingle();
    
    let finalData: MapData;
    if (data) {
      finalData = {
        id: data.id,
        name: data.name,
        width: data.width,
        height: data.height,
        grid: data.grid,
        zones: data.zones ?? [],
        furniture: data.furniture ?? [],
        spawn_x: data.spawn_x,
        spawn_y: data.spawn_y
      };
    } else {
      finalData = JSON.parse(JSON.stringify(ALL_TEMPLATES[0]));
    }
    setMapEditorData(finalData);
    setOriginalMapData(JSON.parse(JSON.stringify(finalData)));
    setLoading(false);
  }, [supabase, currentWorkspaceId]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'workspaces') fetchWorkspaces();
    if (activeTab === 'architect') fetchWorkspaceLayout();
  }, [activeTab, fetchUsers, fetchWorkspaces, fetchWorkspaceLayout]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(true);
    console.log('Intentando cambiar rol:', { userId, newRole });
    
    const { data, error, status } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error de Supabase:', error);
      alert(`Error crítico (${status}): ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('Cambio exitoso:', data[0]);
      setUsers(users.map(u => u.id === userId ? { ...u, role: data[0].role as any } : u));
      alert(`¡Éxito! El usuario ${data[0].name} ahora es ${data[0].role}.`);
    } else {
      console.warn('Ninguna fila actualizada. Status:', status);
      alert('Error 403: No tienes permisos para modificar este usuario. Tu cuenta no tiene el rango de Superadmin en la base de datos.');
    }
    setLoading(false);
  };

  const handleWorkspaceAdminChange = async (workspaceId: string, newAdminId: string) => {
    const { error } = await supabase.from('workspaces').update({ admin_id: newAdminId }).eq('id', workspaceId);
    if (!error) {
      setWorkspaces(workspaces.map(w => w.id === workspaceId ? { ...w, admin_id: newAdminId } : w));
      alert('Líder del grupo actualizado');
    } else {
      alert('Error al actualizar líder: ' + error.message);
    }
  };

  const handleSaveMap = async (data: MapData, shouldClose: boolean = false) => {
    // Validar que el punto de reaparicion sea en suelo caminable
    const spawnTile = data.grid[data.spawn_y ?? 8]?.[data.spawn_x ?? 8];
    if (!isTileWalkable(spawnTile)) {
      alert('Error: El punto de reaparicion esta sobre un muro o mueble. Muevelo a un area despejada.');
      return;
    }

    setLoading(true);
    try {
      // Deactivate current
      await supabase.from('building_layouts').update({ is_active: false }).eq('workspace_id', currentWorkspaceId);
      
      const customId = data.id.includes(currentWorkspaceId) ? data.id : `custom_${currentWorkspaceId}_${Date.now()}`;
      const { error } = await supabase.from('building_layouts').upsert({
        id: customId,
        workspace_id: currentWorkspaceId,
        name: data.name.includes('Custom') ? data.name : `Custom: ${data.name}`,
        width: data.width,
        height: data.height,
        grid: data.grid,
        zones: data.zones,
        furniture: data.furniture,
        spawn_x: data.spawn_x ?? 8,
        spawn_y: data.spawn_y ?? 8,
        is_template: false,
        is_active: true,
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      alert('Mapa actualizado correctamente');
      setOriginalMapData(JSON.parse(JSON.stringify(data)));
      if (shouldClose) onClose();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetMap = () => {
    if (confirm('¿Estás seguro de que quieres restablecer el mapa a la plantilla original? Se perderán todos los cambios no guardados.')) {
      setMapEditorData(JSON.parse(JSON.stringify(ALL_TEMPLATES[0])));
    }
  };

  const handleCancelChanges = () => {
    if (originalMapData) {
      setMapEditorData(JSON.parse(JSON.stringify(originalMapData)));
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal-content">
        <header className="modal-header">
          <div className="modal-title">
            <span>👑 Panel de Control</span>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <small className="ws-name-tag">{currentWorkspaceName || 'Cargando grupo...'}</small>
              <span className="role-badge">{profile.role?.toUpperCase()}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <nav className="modal-tabs">
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>Usuarios</button>
          <button className={activeTab === 'workspaces' ? 'active' : ''} onClick={() => setActiveTab('workspaces')}>Grupos</button>
          <button className={activeTab === 'architect' ? 'active' : ''} onClick={() => setActiveTab('architect')}>Diseño</button>
        </nav>

        <main className="modal-body">
          {loading && <div className="loading-spinner">Cargando...</div>}
          
          {activeTab === 'users' && (
            <div className="tab-pane">
              <table className="admin-table">
                <thead>
                  <tr><th>Usuario</th><th>Email</th><th>Rol</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                          <select 
                            value={u.role || 'user'} 
                            onChange={(e) => {
                              const newUsers = users.map(user => user.id === u.id ? {...user, role: e.target.value as any} : user);
                              setUsers(newUsers);
                            }}
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                          <button 
                            className="btn-action save" 
                            style={{padding: '2px 8px', fontSize: '0.7rem'}}
                            onClick={() => handleRoleChange(u.id, u.role || 'user')}
                          >
                            Guardar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <div className="tab-pane">
               <table className="admin-table">
                <thead>
                  <tr><th>Nombre</th><th>NIP</th><th>Líder del Grupo (Admin)</th></tr>
                </thead>
                <tbody>
                  {workspaces.map(w => (
                    <tr key={w.id}>
                      <td>{w.name}</td>
                      <td>{w.pin_code || 'Libre'}</td>
                      <td>
                        <select 
                          value={w.admin_id} 
                          onChange={(e) => handleWorkspaceAdminChange(w.id, e.target.value)}
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{marginTop: '1rem', fontSize: '0.8rem', color: '#888'}}>
                El Líder del Grupo tiene permisos para editar el mapa de ese espacio específico.
              </p>
            </div>
          )}

          {activeTab === 'architect' && mapEditorData && (
            <div className="tab-pane editor-pane">
              <div className="editor-toolbar">
                <div className="toolbar-group">
                  <button className="btn-action apply" onClick={() => handleSaveMap(mapEditorData, false)}>✓ Aplicar</button>
                  <button className="btn-action save" onClick={() => handleSaveMap(mapEditorData, true)}>💾 Guardar y Salir</button>
                </div>
                <div className="toolbar-group">
                  <button className="btn-action cancel" onClick={handleCancelChanges}>↩ Cancelar</button>
                  <button className="btn-action reset" onClick={handleResetMap}>🗑️ Restablecer</button>
                </div>
              </div>
              <MapEditor 
                initialData={mapEditorData} 
                onSave={(data) => setMapEditorData(data)} 
              />
            </div>
          )}
        </main>

        <footer className="modal-footer">
          <button className="btn-footer-close" onClick={onClose}>Cerrar Panel</button>
        </footer>
      </div>

      <style jsx>{`
        .admin-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1rem;
        }
        .admin-modal-content {
          background: #1a1a2e;
          width: 95%;
          max-width: 900px;
          height: 85vh;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-header {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .modal-title { display: flex; flex-direction: column; }
        .modal-title span { font-weight: bold; font-size: 1.2rem; color: #fff; }
        .ws-name-tag { font-size: 0.8rem; color: var(--accent2); font-weight: 600; }
        .role-badge { 
          font-size: 0.6rem; 
          background: #6c63ff; 
          padding: 2px 6px; 
          border-radius: 4px; 
          color: #fff;
          font-weight: bold;
          letter-spacing: 1px;
        }
        .close-btn { background: none; border: none; color: #fff; font-size: 2rem; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; }
        .close-btn:hover { opacity: 1; }
        
        .modal-tabs {
          display: flex;
          background: rgba(0,0,0,0.2);
          padding: 0.5rem;
          gap: 0.5rem;
        }
        .modal-tabs button {
          flex: 1;
          background: none; border: none; color: #888;
          padding: 0.8rem; border-radius: 12px;
          cursor: pointer; transition: all 0.2s;
        }
        .modal-tabs button.active {
          background: #6c63ff; color: #fff;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }
        .admin-table {
          width: 100%; border-collapse: collapse; color: #fff;
        }
        .admin-table th { text-align: left; color: #666; font-size: 0.8rem; padding-bottom: 1rem; }
        .admin-table td { padding: 0.8rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .admin-table select { background: #000; color: #fff; border: 1px solid #333; padding: 0.3rem; border-radius: 4px; }
        
        .editor-pane { 
          height: 100%; 
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .editor-toolbar {
          display: flex;
          justify-content: space-between;
          padding: 1rem;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          flex-wrap: wrap;
          gap: 1rem;
        }
        .toolbar-group { display: flex; gap: 0.5rem; }
        .btn-action {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-action.apply { background: #43b97f; color: white; }
        .btn-action.save { background: #6c63ff; color: white; }
        .btn-action.cancel { background: rgba(255,255,255,0.1); color: #fff; }
        .btn-action.reset { background: #e74c3c; color: white; }
        
        .btn-action:hover { filter: brightness(1.2); transform: translateY(-1px); }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: flex-end;
          background: rgba(0,0,0,0.1);
        }
        .btn-footer-close {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          padding: 0.6rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-footer-close:hover { background: rgba(255,255,255,0.1); }

        @media (max-width: 768px) {
          .admin-modal-content { height: 95vh; width: 100%; }
          .modal-tabs button { padding: 0.5rem; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  );
}

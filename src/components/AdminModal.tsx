'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, Workspace } from '@/lib/types';
import type { MapData } from '@/game/map';
import { ALL_TEMPLATES } from '@/lib/mapTemplates';
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
  const [mapEditorData, setMapEditorData] = useState<MapData | null>(null);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'workspaces') fetchWorkspaces();
    if (activeTab === 'architect') fetchWorkspaceLayout();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const fetchWorkspaces = async () => {
    setLoading(true);
    const { data } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
    if (data) setWorkspaces(data);
    setLoading(false);
  };

  const fetchWorkspaceLayout = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('building_layouts')
      .select('*')
      .eq('workspace_id', currentWorkspaceId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (data) {
      setMapEditorData({
        id: data.id,
        name: data.name,
        width: data.width,
        height: data.height,
        grid: data.grid,
        zones: data.zones ?? [],
        furniture: data.furniture ?? []
      });
    } else {
      setMapEditorData(ALL_TEMPLATES[0]);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (!error) setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
  };

  const handleSaveMap = async (data: MapData) => {
    setLoading(true);
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
    
    if (!error) alert('Mapa actualizado correctamente');
    setLoading(false);
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal-content">
        <header className="modal-header">
          <div className="modal-title">
            <span>👑 Panel de Control</span>
            <small>Workspace: {currentWorkspaceId}</small>
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
                        <select value={u.role || 'user'} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                          <option value="user">Usuario</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Superadmin</option>
                        </select>
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
                  <tr><th>Nombre</th><th>NIP</th></tr>
                </thead>
                <tbody>
                  {workspaces.map(w => (
                    <tr key={w.id}>
                      <td>{w.name}</td>
                      <td>{w.pin_code || 'Libre'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{marginTop: '1rem', fontSize: '0.8rem', color: '#888'}}>Usa el panel de gestión para crear grupos nuevos.</p>
            </div>
          )}

          {activeTab === 'architect' && mapEditorData && (
            <div className="tab-pane editor-pane">
              <MapEditor initialData={mapEditorData} onSave={handleSaveMap} />
            </div>
          )}
        </main>
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
        .modal-title small { font-size: 0.7rem; color: #666; }
        .close-btn { background: none; border: none; color: #fff; font-size: 2rem; cursor: pointer; }
        
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
        
        .editor-pane { height: 100%; }

        @media (max-width: 768px) {
          .admin-modal-content { height: 95vh; width: 100%; }
          .modal-tabs button { padding: 0.5rem; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  );
}

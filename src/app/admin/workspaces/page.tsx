'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Workspace } from '@/lib/types';

export default function WorkspacesAdminPage() {
  const supabase = createClient();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const pinToSave = newPin.trim() === '' ? null : newPin.trim();

      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name: newName,
          pin_code: pinToSave,
          admin_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setWorkspaces([data, ...workspaces]);
      setNewName('');
      setNewPin('');
      alert('Grupo de trabajo creado exitosamente. Ahora puedes seleccionarlo en el Arquitecto.');
    } catch (err: any) {
      alert('Error al crear: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Cargando grupos...</div>;

  return (
    <div className="workspaces-admin">
      <header>
        <h2>Gestión de Grupos (Workspaces) 🏢</h2>
        <p className="text-muted">Crea grupos independientes. Cada grupo tendrá su propio mapa.</p>
      </header>

      <div className="creation-panel">
        <h3>Crear Nuevo Grupo</h3>
        <form onSubmit={handleCreateWorkspace} className="create-form">
          <div className="form-group">
            <label>Nombre del Grupo</label>
            <input 
              type="text" 
              required 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Equipo Marketing"
            />
          </div>
          <div className="form-group">
            <label>NIP de Acceso (Opcional)</label>
            <input 
              type="text" 
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="4 dígitos, ej: 1234"
            />
            <small>Si lo dejas en blanco, cualquier usuario registrado podrá entrar.</small>
          </div>
          <button type="submit" disabled={isCreating} className="btn-submit">
            {isCreating ? 'Creando...' : 'Crear Grupo'}
          </button>
        </form>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NIP</th>
              <th>ID (Link)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map(ws => (
              <tr key={ws.id}>
                <td><strong>{ws.name}</strong></td>
                <td>{ws.pin_code ? '🔒 ' + ws.pin_code : '🔓 Público'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{ws.id}</td>
                <td>
                  <a href={`/office/${ws.id}`} target="_blank" className="btn-action">
                    Entrar al mapa
                  </a>
                </td>
              </tr>
            ))}
            {workspaces.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No hay grupos creados aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .workspaces-admin {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          height: 100%;
        }
        header h2 {
          margin: 0;
          font-family: var(--font-pixel);
          font-size: 1.2rem;
          background: linear-gradient(135deg, #43b97f, #00b4d8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .text-muted {
          color: var(--text-muted);
          margin-top: 0.5rem;
        }
        
        .creation-panel {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 1.5rem;
          border-radius: 12px;
        }
        .creation-panel h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }
        .create-form {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .form-group label {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .form-group input {
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 0.8rem;
          border-radius: 8px;
          color: white;
          outline: none;
        }
        .form-group input:focus {
          border-color: #00b4d8;
        }
        .form-group small {
          color: #888;
          font-size: 0.75rem;
        }
        .btn-submit {
          background: #43b97f;
          color: white;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          align-self: center;
          margin-top: 1rem;
        }
        .btn-submit:hover:not(:disabled) {
          background: #369c69;
        }
        .btn-submit:disabled {
          opacity: 0.5;
        }

        .table-container {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th, td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        th {
          background: rgba(0,0,0,0.3);
          color: var(--text-muted);
          font-weight: normal;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 1px;
        }
        .btn-action {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
          text-decoration: none;
          display: inline-block;
        }
        .btn-action:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}

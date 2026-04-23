'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';

export default function UsersAdminPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      alert('Rol actualizado exitosamente');
    } catch (err: any) {
      alert('Error al actualizar rol: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Cargando usuarios...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div className="users-admin">
      <header>
        <h2>Gestión de Usuarios 👥</h2>
        <p className="text-muted">Asigna el rol de Admin a los líderes de equipo.</p>
      </header>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Color</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <div className="color-indicator" style={{ backgroundColor: user.avatar_color }} />
                </td>
                <td>
                  <select 
                    value={user.role || 'user'} 
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="role-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </td>
                <td>
                  <button className="btn-action" onClick={() => alert(`ID: ${user.id}`)}>
                    Ver Info
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .users-admin {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          height: 100%;
        }
        header h2 {
          margin: 0;
          font-family: var(--font-pixel);
          font-size: 1.2rem;
          background: linear-gradient(135deg, #6c63ff, #ff6584);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .text-muted {
          color: var(--text-muted);
          margin-top: 0.5rem;
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
        .color-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.2);
        }
        .role-select {
          background: rgba(0,0,0,0.5);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 0.4rem;
          border-radius: 6px;
          outline: none;
        }
        .role-select:focus {
          border-color: var(--accent);
        }
        .btn-action {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-action:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}

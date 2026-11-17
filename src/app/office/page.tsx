'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Workspace, UserProfile } from '@/lib/types';
import PinModal from '@/components/PinModal';

type AccessFilter = 'all' | 'free' | 'nip';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  superadmin: 'Superadministrador',
};

/** Cubo isométrico de PixelVibe (logotipo de la marca). */
function CubeLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M12 2.8 21 7.6v8.8l-9 4.8-9-4.8V7.6l9-4.8Z" fill="rgba(255,255,255,.14)" />
      <path d="M12 2.8v9M3 7.6l9 4.2 9-4.2M12 11.8v9.4" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14" />
      <path d="M15 9h3a2 2 0 0 1 2 2v10" />
      <path d="M9 9h2M9 13h2M9 17h2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/**
 * Lupa del buscador (Fase 4): ANTES el <svg> no tenía width/height y
 * dependía solo de la regla `.search svg` del <style jsx>. Causa raíz
 * verificada en el bundle compilado: styled-jsx convierte esa regla en
 * `.search.jsx-XXX svg.jsx-XXX` (exige la clase en el propio svg), pero
 * el plugin solo añade la clase al JSX del componente dueño del
 * <style>; SearchIcon es una función aparte y su svg nunca la recibe,
 * así que la regla jamás coincidía y el svg caía a su tamaño por
 * defecto (~300 px), blanco y tapando el buscador. Ahora lleva 18×18
 * explícitos —el mismo patrón que CubeLogo— y la regla CSS queda como
 * refuerzo, no como único sostén.
 */
function SearchIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function EnterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

export default function OfficeLobbyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AccessFilter>('all');
  const [pinWorkspace, setPinWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      // Fetch user profile to check role
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUserProfile(profile);

      // Fetch all workspaces
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      setWorkspaces(ws || []);
      setLoading(false);
    };

    init();
  }, [router, supabase]);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
  const roleLabel = userProfile?.role ? ROLE_LABEL[userProfile.role] : undefined;
  const userInitial = (userProfile?.name?.trim()?.[0] || 'P').toUpperCase();
  const avatarColor = userProfile?.avatar_color || '#2563EB';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Entrar a un espacio: sin NIP entra directo; con NIP abre el modal.
  const handleJoin = (ws: Workspace) => {
    if (ws.pin_code) {
      setPinWorkspace(ws);
    } else {
      router.push(`/office/${ws.id}`);
    }
  };

  // Comparación del NIP, igual que antes: en el navegador, contra ws.pin_code.
  const handlePinSubmit = (pin: string): boolean => {
    if (!pinWorkspace) return false;
    return pin === pinWorkspace.pin_code;
  };

  // Buscador + filtros (solo afectan a la vista; no tocan los datos).
  const query = search.trim().toLowerCase();
  const matches = (name: string, access: 'free' | 'nip') =>
    (!query || name.toLowerCase().includes(query)) &&
    (filter === 'all' || filter === access);

  const showPublic = matches('Oficina Pública', 'free');
  const visibleWorkspaces = useMemo(
    () => workspaces.filter((ws) => matches(ws.name, ws.pin_code ? 'nip' : 'free')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaces, query, filter]
  );
  // La tarjeta de crear no es un espacio: no entra en el contador,
  // pero sí se oculta con búsqueda/filtros como en la maqueta.
  const showCreate =
    isAdmin && (!query || 'crear nuevo grupo'.includes(query)) && filter === 'all';
  const visibleSpaces = (showPublic ? 1 : 0) + visibleWorkspaces.length;
  const anyCardVisible = visibleSpaces > 0 || showCreate;

  if (loading) {
    return (
      <div className="lobby">
        <div className="loading">Cargando salas de PixelVibe...</div>
      </div>
    );
  }

  return (
    <div className="lobby">
      {/* ---------- Barra superior ---------- */}
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand">
            <div className="brand-logo" aria-hidden="true">
              <CubeLogo />
            </div>
            <div>
              <div className="brand-name">Pixel<span>Vibe</span></div>
              <div className="brand-sub">Oficina virtual</div>
            </div>
          </div>
          <div className="userbox">
            <div className="user-meta">
              <div className="avatar" style={{ background: avatarColor }} aria-hidden="true">
                {userInitial}
              </div>
              <div className="user-name-wrap">
                <div className="user-name">{userProfile?.name || 'Usuario'}</div>
                {roleLabel && (
                  <span className="role-badge">
                    <ShieldCheckIcon />
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>
            <button className="btn-logout" type="button" onClick={handleSignOut}>
              <LogoutIcon />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="wrap">
        <span className="eyebrow"><i /> Lobby</span>
        <h1>Espacios de <span className="accent">trabajo</span></h1>
        <p className="subtitle">
          Elige un espacio para entrar a la oficina virtual. Los espacios privados piden
          un NIP de 4 dígitos; los de acceso libre entran directo.
        </p>

        {/* ---------- Buscador y filtros ---------- */}
        <div className="controls">
          <div className="search">
            <SearchIcon />
            <input
              type="search"
              placeholder="Buscar un espacio por nombre…"
              aria-label="Buscar espacios por nombre"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters" role="group" aria-label="Filtrar por tipo de acceso">
            <button className="filter-btn" type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todos</button>
            <button className="filter-btn" type="button" aria-pressed={filter === 'free'} onClick={() => setFilter('free')}>Acceso libre</button>
            <button className="filter-btn" type="button" aria-pressed={filter === 'nip'} onClick={() => setFilter('nip')}>Con NIP</button>
          </div>
          <p className="counter" aria-live="polite">
            <strong>{visibleSpaces}</strong> {visibleSpaces === 1 ? 'espacio' : 'espacios'}
          </p>
        </div>

        {/* ---------- Tarjetas ---------- */}
        <section className="grid" aria-label="Lista de espacios de trabajo">
          {showPublic && (
            <article className="card">
              <div className="card-top">
                <div className="icon-box icon-teal" aria-hidden="true">
                  <GlobeIcon />
                </div>
                <span className="badge badge-free">
                  <CheckIcon />
                  Acceso libre
                </span>
              </div>
              <h2>Oficina Pública</h2>
              <p className="desc">Entrada libre para todos</p>
              <div className="meta-row">
                <span className="meta-item">
                  <EnterIcon />
                  Entrada directa
                </span>
                <span className="meta-item">
                  <UsersIcon />
                  Para todos
                </span>
              </div>
              <div className="spacer" />
              <button className="btn btn-teal" type="button" onClick={() => router.push('/office/public-room')}>
                Entrar
                <ArrowIcon />
              </button>
            </article>
          )}

          {visibleWorkspaces.map((ws) => (
            <article className="card" key={ws.id}>
              <div className="card-top">
                <div className={`icon-box ${ws.pin_code ? 'icon-blue' : 'icon-teal'}`} aria-hidden="true">
                  {ws.pin_code ? <LockIcon /> : <GlobeIcon />}
                </div>
                {ws.pin_code ? (
                  <span className="badge badge-private">
                    <LockIcon />
                    Privado · NIP
                  </span>
                ) : (
                  <span className="badge badge-free">
                    <CheckIcon />
                    Acceso libre
                  </span>
                )}
              </div>
              <h2>{ws.name}</h2>
              <p className="desc">
                {ws.pin_code
                  ? 'Espacio de trabajo privado · Acceso con NIP'
                  : 'Espacio de trabajo abierto · Entrada libre'}
              </p>
              <div className="meta-row">
                {ws.pin_code ? (
                  <span className="meta-item">
                    <LockIcon />
                    NIP de 4 dígitos
                  </span>
                ) : (
                  <span className="meta-item">
                    <EnterIcon />
                    Entrada directa
                  </span>
                )}
              </div>
              <div className="spacer" />
              <button
                className={`btn ${ws.pin_code ? 'btn-primary' : 'btn-teal'}`}
                type="button"
                onClick={() => handleJoin(ws)}
              >
                {ws.pin_code && <LockIcon />}
                {ws.pin_code ? 'Entrar con NIP' : 'Entrar'}
                {!ws.pin_code && <ArrowIcon />}
              </button>
            </article>
          ))}

          {showCreate && (
            <button
              className="card card-create"
              type="button"
              onClick={() => router.push('/admin/workspaces')}
            >
              <div className="card-top">
                <div className="icon-box icon-slate" aria-hidden="true">
                  <PlusIcon />
                </div>
                <span className="badge badge-admin">
                  <ShieldCheckIcon />
                  Solo administradores
                </span>
              </div>
              <h2>Crear nuevo grupo</h2>
              <p className="desc">Abre un espacio nuevo para un equipo o proyecto.</p>
              <div className="meta-row">
                <span className="meta-item">
                  <PlusIcon />
                  Gestionar espacios
                </span>
              </div>
              <div className="spacer" />
              <span className="btn btn-ghost" aria-hidden="true">
                Crear espacio
                <ArrowIcon />
              </span>
            </button>
          )}
        </section>

        {!anyCardVisible && (
          <div className="empty" role="status">
            <strong>Sin resultados</strong>
            Ningún espacio coincide con tu búsqueda o filtro. Prueba con otro nombre.
          </div>
        )}
      </main>

      <footer>
        <div className="wrap foot-in">
          <span className="foot-brand">
            <CubeLogo size={16} />
            PixelVibe · Oficina virtual de MT Digital Solutions
          </span>
        </div>
      </footer>

      {pinWorkspace && (
        <PinModal
          workspaceName={pinWorkspace.name}
          onClose={() => setPinWorkspace(null)}
          onSubmit={handlePinSubmit}
          onAccessGranted={() => {
            const ws = pinWorkspace;
            setPinWorkspace(null);
            router.push(`/office/${ws.id}`);
          }}
        />
      )}

      <style jsx>{`
        .lobby {
          --navy-2: #0e2242;
          --navy-3: #12294d;
          --panel: #0f2340;
          --panel-2: #132a4d;
          --line: rgba(148, 184, 255, 0.14);
          --line-strong: rgba(148, 184, 255, 0.28);
          --blue-2: #3b82f6;
          --teal-2: #2dd4bf;
          --text: #f1f5f9;
          --muted: #9fb3ce;
          --muted-2: #7e93b3;
          height: 100dvh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--navy);
          color: var(--text);
          font-family: 'Inter', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          position: relative;
        }
        /* Fondo: brillos radiales azul/turquesa + retícula tenue */
        .lobby::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(700px 420px at 12% -5%, rgba(37, 99, 235, 0.28), transparent 65%),
            radial-gradient(620px 380px at 88% 8%, rgba(20, 184, 166, 0.18), transparent 65%),
            radial-gradient(900px 600px at 50% 110%, rgba(37, 99, 235, 0.12), transparent 70%),
            linear-gradient(180deg, var(--navy) 0%, #081426 100%);
        }
        .lobby::after {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.5;
          background-image:
            linear-gradient(rgba(148, 184, 255, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 184, 255, 0.045) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 100%);
        }
        .lobby :global(button) {
          font-family: inherit;
          cursor: pointer;
        }
        .lobby :global(:focus-visible) {
          outline: 2px solid var(--blue-2);
          outline-offset: 3px;
          border-radius: 6px;
        }
        .loading {
          position: relative;
          z-index: 1;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
        }
        .wrap {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* ---------- Barra superior ---------- */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          background: rgba(8, 20, 38, 0.78);
          border-bottom: 1px solid var(--line);
        }
        .topbar-in {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-height: 68px;
          padding-top: 8px;
          padding-bottom: 8px;
          max-width: 1180px;
          margin: 0 auto;
          padding-left: 24px;
          padding-right: 24px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .brand-logo {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #1d4ed8, #0ea5a4);
          border-radius: 11px;
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
        .brand-name {
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
        }
        .brand-name span {
          color: var(--teal-2);
        }
        .brand-sub {
          font-size: 11.5px;
          color: var(--muted);
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .userbox {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .user-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 13px;
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.18);
        }
        .user-name-wrap {
          min-width: 0;
        }
        .user-name {
          font-weight: 600;
          font-size: 14.5px;
          line-height: 1.2;
          white-space: nowrap;
        }
        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 3px;
          font-size: 11px;
          font-weight: 600;
          color: #7dd3fc;
          background: rgba(37, 99, 235, 0.18);
          border: 1px solid rgba(59, 130, 246, 0.35);
          padding: 2px 8px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .role-badge svg {
          width: 11px;
          height: 11px;
        }
        .btn-logout {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          border: 1px solid var(--line-strong);
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          min-height: 42px;
          flex: 0 0 auto;
          transition: background 0.18s, border-color 0.18s;
        }
        .btn-logout:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(148, 184, 255, 0.45);
        }
        .btn-logout svg {
          width: 16px;
          height: 16px;
          opacity: 0.85;
        }

        /* ---------- Encabezado ---------- */
        main {
          padding: 44px 0 20px;
        }
        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--teal-2);
          background: rgba(20, 184, 166, 0.1);
          border: 1px solid rgba(20, 184, 166, 0.28);
          padding: 6px 12px;
          border-radius: 999px;
        }
        .eyebrow i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--turquoise);
          display: inline-block;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.18);
        }
        h1 {
          font-size: clamp(30px, 4.5vw, 44px);
          line-height: 1.08;
          letter-spacing: -0.03em;
          margin: 18px 0 10px;
          font-weight: 800;
          max-width: 640px;
        }
        h1 .accent {
          color: var(--blue-2);
        }
        .subtitle {
          color: var(--muted);
          font-size: 16.5px;
          line-height: 1.6;
          max-width: 560px;
          margin: 0;
        }

        /* ---------- Controles ---------- */
        .controls {
          margin-top: 34px;
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
          justify-content: space-between;
        }
        .search {
          position: relative;
          flex: 1 1 280px;
          max-width: 420px;
        }
        .search svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: var(--muted-2);
          pointer-events: none;
        }
        .search input {
          width: 100%;
          min-height: 48px;
          padding: 12px 16px 12px 44px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line-strong);
          border-radius: 12px;
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
        }
        .search input::placeholder {
          color: var(--muted-2);
        }
        .search input:focus {
          outline: none;
          border-color: var(--blue-2);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18);
        }
        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .filter-btn {
          min-height: 44px;
          padding: 10px 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--line-strong);
          color: var(--muted);
          font-size: 14px;
          font-weight: 600;
          transition: all 0.18s;
        }
        .filter-btn:hover {
          color: var(--text);
          border-color: rgba(148, 184, 255, 0.45);
        }
        .filter-btn[aria-pressed="true"] {
          background: var(--electric);
          border-color: var(--electric);
          color: #fff;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }
        .counter {
          font-size: 13.5px;
          color: var(--muted);
          font-weight: 500;
          margin: 0;
          white-space: nowrap;
        }
        .counter strong {
          color: var(--text);
        }

        /* ---------- Tarjetas ---------- */
        .grid {
          margin-top: 26px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .card {
          background: linear-gradient(180deg, var(--panel-2), var(--panel));
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 0;
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
          position: relative;
          font-family: inherit;
          color: inherit;
          text-align: left;
          min-width: 0;
        }
        .card:hover {
          transform: translateY(-5px);
          border-color: var(--blue-2);
          box-shadow: 0 20px 50px rgba(2, 8, 23, 0.45), 0 0 0 1px rgba(59, 130, 246, 0.25);
        }
        .card:focus-within {
          border-color: var(--blue-2);
        }
        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .icon-box {
          width: 56px;
          height: 56px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 10px 22px rgba(2, 8, 23, 0.35);
        }
        .icon-box svg {
          width: 28px;
          height: 28px;
          color: #fff;
        }
        .icon-blue {
          background: linear-gradient(145deg, var(--electric), #1e40af);
        }
        .icon-teal {
          background: linear-gradient(145deg, var(--turquoise), #0f766e);
        }
        .icon-slate {
          background: linear-gradient(145deg, #334155, #1e293b);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 5px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .badge svg {
          width: 12px;
          height: 12px;
        }
        .badge-free {
          color: #5eead4;
          background: rgba(20, 184, 166, 0.13);
          border: 1px solid rgba(20, 184, 166, 0.35);
        }
        .badge-private {
          color: #bfdbfe;
          background: rgba(37, 99, 235, 0.16);
          border: 1px solid rgba(59, 130, 246, 0.38);
        }
        .badge-admin {
          color: #cbd5e1;
          background: rgba(148, 163, 184, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        .card h2 {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.015em;
          margin: 20px 0 8px;
          line-height: 1.25;
          overflow-wrap: break-word;
        }
        .card p.desc {
          color: var(--muted);
          font-size: 14.5px;
          line-height: 1.6;
          margin: 0;
        }
        .meta-row {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
        }
        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
          color: #c7d6ee;
          font-weight: 500;
        }
        .meta-item svg {
          width: 15px;
          height: 15px;
          color: var(--teal-2);
        }
        .card .spacer {
          flex: 1;
        }
        .btn {
          margin-top: 22px;
          width: 100%;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          border: 1px solid transparent;
          transition: all 0.18s;
          padding: 12px 18px;
        }
        .btn svg {
          width: 17px;
          height: 17px;
        }
        .btn-primary {
          background: var(--electric);
          color: #fff;
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.32);
        }
        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .btn-teal {
          background: var(--turquoise);
          color: #04211d;
          box-shadow: 0 10px 24px rgba(20, 184, 166, 0.25);
        }
        .btn-teal:hover {
          background: #0d9488;
          color: #fff;
        }
        .btn-ghost {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          border-color: var(--line-strong);
        }
        .btn-ghost:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(148, 184, 255, 0.45);
        }
        .card-create {
          border-style: dashed;
          border-color: rgba(148, 184, 255, 0.32);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
        }
        .card-create:hover {
          border-color: var(--blue-2);
          background: rgba(37, 99, 235, 0.06);
        }
        .empty {
          margin-top: 26px;
          text-align: center;
          padding: 44px 20px;
          border: 1px dashed var(--line-strong);
          border-radius: 18px;
          color: var(--muted);
        }
        .empty strong {
          display: block;
          color: var(--text);
          font-size: 16px;
          margin-bottom: 6px;
        }

        /* ---------- Pie ---------- */
        footer {
          position: relative;
          z-index: 1;
          margin-top: 56px;
          border-top: 1px solid var(--line);
          padding: 22px 0 30px;
        }
        .foot-in {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: var(--muted-2);
        }
        .foot-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: var(--muted);
        }

        @media (max-width: 960px) {
          .grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 640px) {
          .wrap {
            padding: 0 16px;
          }
          main {
            padding-top: 30px;
          }
          .grid {
            grid-template-columns: 1fr;
          }
          .controls {
            flex-direction: column;
            align-items: stretch;
          }
          .search {
            max-width: none;
            flex: 0 0 auto;
            width: 100%;
          }
          .filters {
            justify-content: flex-start;
          }
          .topbar-in {
            flex-wrap: wrap;
            row-gap: 10px;
            padding-top: 10px;
            padding-bottom: 10px;
            padding-left: 16px;
            padding-right: 16px;
          }
          .userbox {
            margin-left: auto;
            gap: 10px;
          }
          .avatar {
            width: 34px;
            height: 34px;
            font-size: 12px;
          }
          .user-name {
            font-size: 13px;
          }
          .role-badge {
            font-size: 10px;
            padding: 1px 7px;
          }
          .btn-logout {
            padding: 8px 12px;
            min-height: 38px;
            font-size: 13px;
          }
          .brand-name {
            font-size: 18px;
          }
          .brand-logo {
            width: 38px;
            height: 38px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .card, .btn, .filter-btn {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

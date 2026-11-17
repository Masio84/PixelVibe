'use client';

import { useEffect, useRef, useState } from 'react';

interface PinModalProps {
  /** Nombre del espacio que se está abriendo (solo para mostrarlo). */
  workspaceName: string;
  onClose: () => void;
  /**
   * Valida el NIP. Devuelve true si es correcto.
   * La comparación se hace en el padre, exactamente como antes
   * (en el navegador, contra `workspace.pin_code`).
   */
  onSubmit: (pin: string) => boolean;
  /** Se llama cuando el acceso ya fue concedido (navegar al espacio). */
  onAccessGranted: () => void;
}

export default function PinModal({ workspaceName, onClose, onSubmit, onAccessGranted }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (success) return;
    if (onSubmit(pin)) {
      setError(false);
      setSuccess(true);
      // Breve confirmación visual antes de entrar al espacio.
      setTimeout(onAccessGranted, 900);
    } else {
      setError(true);
      setShakeKey((k) => k + 1);
      inputRef.current?.select();
    }
  };

  return (
    <div
      className="pin-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pin-modal">
        <div className="pin-modal-head">
          <div className="pin-modal-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <button className="pin-btn-close" type="button" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="pin-success-view">
            <div className="pin-success-ring" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3>Acceso concedido</h3>
            <p>NIP correcto. Entrando a <strong>{workspaceName}</strong>…</p>
            <button className="pin-btn pin-btn-primary" type="button" onClick={onAccessGranted}>
              Entrar ahora
            </button>
          </div>
        ) : (
          <>
            <h3 id="pin-title">{workspaceName}</h3>
            <p className="pin-sub">Este espacio es privado. Escribe el NIP de 4 dígitos para entrar.</p>
            <form onSubmit={handleSubmit} noValidate>
              <div className="pin-field">
                <label htmlFor="pin-input">NIP de acceso</label>
                <input
                  ref={inputRef}
                  id="pin-input"
                  className="pin-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  placeholder="••••"
                  aria-describedby="pin-error"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setError(false);
                  }}
                />
              </div>
              {error && (
                <div className="pin-msg pin-msg-error" id="pin-error" role="alert" key={shakeKey}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <span>NIP incorrecto. Inténtalo de nuevo.</span>
                </div>
              )}
              <div className="pin-actions">
                <button className="pin-btn pin-btn-ghost" type="button" onClick={onClose}>
                  Cancelar
                </button>
                <button className="pin-btn pin-btn-primary" type="submit">
                  Entrar al espacio
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <style jsx>{`
        .pin-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(3, 10, 22, 0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: pinFadeIn 0.2s ease;
        }
        .pin-modal {
          width: 100%;
          max-width: 440px;
          background: linear-gradient(180deg, #132a4d, #0e2242);
          border: 1px solid rgba(148, 184, 255, 0.28);
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 32px 70px rgba(2, 8, 23, 0.65);
          color: #f1f5f9;
          animation: pinPop 0.22s ease;
        }
        .pin-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }
        .pin-modal-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #fff;
          background: linear-gradient(145deg, var(--electric), #1e40af);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 10px 22px rgba(2, 8, 23, 0.35);
        }
        .pin-modal-icon svg {
          width: 24px;
          height: 24px;
        }
        .pin-btn-close {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          flex: 0 0 auto;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(148, 184, 255, 0.14);
          color: #9fb3ce;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pin-btn-close:hover {
          background: rgba(255, 255, 255, 0.11);
          color: #fff;
        }
        .pin-btn-close svg {
          width: 17px;
          height: 17px;
        }
        .pin-modal h3 {
          font-size: 21px;
          margin: 18px 0 6px;
          letter-spacing: -0.02em;
          font-weight: 700;
        }
        .pin-sub {
          color: #9fb3ce;
          font-size: 14.5px;
          line-height: 1.6;
          margin: 0;
        }
        .pin-field {
          margin-top: 20px;
        }
        .pin-field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #c7d6ee;
          margin-bottom: 8px;
        }
        .pin-input {
          width: 100%;
          min-height: 48px;
          padding: 12px 14px 12px calc(14px + 0.27em);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(148, 184, 255, 0.28);
          color: #f1f5f9;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 0.55em;
          text-align: center;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pin-input::placeholder {
          letter-spacing: 0.55em;
          color: #48628a;
          font-weight: 600;
        }
        .pin-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18);
        }
        .pin-msg {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
        }
        .pin-msg svg {
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
          margin-top: 1px;
        }
        /* El mensaje de error se remonta en cada intento fallido (key),
           así la animación de shake se dispara de nuevo. */
        .pin-msg-error {
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.4);
          color: #fecaca;
          animation: pinShake 0.45s ease;
        }
        .pin-actions {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }
        .pin-actions .pin-btn {
          flex: 1;
        }
        .pin-btn {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          border: 1px solid transparent;
          padding: 12px 18px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.18s;
        }
        .pin-btn-primary {
          background: var(--electric);
          color: #fff;
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.32);
        }
        .pin-btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .pin-btn-ghost {
          background: rgba(255, 255, 255, 0.04);
          color: #f1f5f9;
          border-color: rgba(148, 184, 255, 0.28);
        }
        .pin-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(148, 184, 255, 0.45);
        }
        .pin-success-view {
          text-align: center;
          padding: 10px 0 4px;
        }
        .pin-success-ring {
          width: 74px;
          height: 74px;
          margin: 6px auto 18px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(52, 211, 153, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.45);
          box-shadow: 0 0 0 10px rgba(52, 211, 153, 0.06);
        }
        .pin-success-ring svg {
          width: 34px;
          height: 34px;
          color: #34d399;
        }
        .pin-success-view h3 {
          margin: 0 0 8px;
        }
        .pin-success-view p {
          color: #9fb3ce;
          font-size: 14.5px;
          line-height: 1.6;
          margin: 0 auto;
          max-width: 320px;
        }
        .pin-success-view p strong {
          color: #e2e8f0;
        }
        .pin-success-view .pin-btn {
          max-width: 280px;
          width: 100%;
          margin: 22px auto 0;
        }
        @keyframes pinFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pinPop {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        @keyframes pinShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-5px); }
          40%, 60% { transform: translateX(5px); }
        }
        @media (max-width: 640px) {
          .pin-modal {
            padding: 24px 20px;
          }
          .pin-actions {
            flex-direction: column;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pin-overlay, .pin-modal {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

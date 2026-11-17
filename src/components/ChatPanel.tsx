'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface ChatPanelProps {
  profile: UserProfile;
  workspaceId: string;
  messages: ChatMessage[];
  localPosition: { x: number; y: number };
}

// Radio de chat en CASILLAS del mapa (no en píxeles).
// ANTES era 300, pero las posiciones x/y son coordenadas de grid (0-32):
// la distancia máxima en el mapa es ~45, así que el filtro nunca excluía
// a nadie y el "chat por proximidad" no funcionaba. 5 casillas ≈ 300px
// con tiles de 64px, que es lo que prometía el README.
const CHAT_RADIUS_TILES = 5;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function hasPosition(m: ChatMessage): m is ChatMessage & { x: number; y: number } {
  // OJO: x=0 o y=0 son coordenadas válidas; antes `!m.x` las trataba
  // como "sin posición" y esos mensajes se mostraban siempre.
  return typeof m.x === 'number' && typeof m.y === 'number';
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ChatPanel({ profile, workspaceId, messages, localPosition }: ChatPanelProps) {
  const [input, setInput] = useState('');
  // Fase 4: cerrado por defecto (antes abierto): tapaba ~35% de la
  // altura en pantallas bajas. Se abre con un clic en la cabecera.
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const nearbyMessages = messages.filter((m) => {
    if (!hasPosition(m)) return true;
    return distance(localPosition, { x: m.x, y: m.y }) <= CHAT_RADIUS_TILES;
  }).slice(-30);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nearbyMessages.length]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;
    setInput('');

    await supabase.from('messages').insert({
      user_id: profile.id,
      room_id: workspaceId,
      content,
      x: localPosition.x,
      y: localPosition.y,
      created_at: new Date().toISOString(),
      name: profile.name,
    });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`chat-panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="chat-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="chat-title">💬 Chat Local</span>
        <span className="chat-toggle">{isOpen ? '▼' : '▲'}</span>
        <span className="chat-radius-hint">Radio: ~{CHAT_RADIUS_TILES} casillas</span>
      </div>

      {isOpen && (
        <>
          <div className="chat-messages">
            {nearbyMessages.length === 0 && (
              <div className="chat-empty">Nadie cerca. ¡Muévete!</div>
            )}
            {nearbyMessages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.user_id === profile.id ? 'own' : ''}`}>
                <span className="chat-msg-name" style={{ color: msg.user_id === profile.id ? '#2dd4bf' : '#60a5fa' }}>
                  {msg.name || 'User'}
                </span>
                <span className="chat-msg-content">{msg.content}</span>
                <span className="chat-msg-time">{msg.created_at ? formatTime(msg.created_at) : 'ahora'}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribe un mensaje... (Enter para enviar)"
              maxLength={120}
            />
            <button className="chat-send-btn" onClick={sendMessage}>
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  );
}

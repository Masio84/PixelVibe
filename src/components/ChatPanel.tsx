'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, UserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface ChatPanelProps {
  profile: UserProfile;
  messages: ChatMessage[];
  localPosition: { x: number; y: number };
}

const CHAT_RADIUS = 300;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export default function ChatPanel({ profile, messages, localPosition }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const nearbyMessages = messages.filter((m) => {
    if (!m.x || !m.y) return true;
    return distance(localPosition, { x: m.x, y: m.y }) <= CHAT_RADIUS;
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
      room_id: 'main',
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
        <span className="chat-radius-hint">Radio: {CHAT_RADIUS}px</span>
      </div>

      {isOpen && (
        <>
          <div className="chat-messages">
            {nearbyMessages.length === 0 && (
              <div className="chat-empty">Nadie cerca. ¡Muévete!</div>
            )}
            {nearbyMessages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.user_id === profile.id ? 'own' : ''}`}>
                <span className="chat-msg-name" style={{ color: msg.user_id === profile.id ? '#a78bfa' : '#60a5fa' }}>
                  {msg.name || 'User'}
                </span>
                <span className="chat-msg-content">{msg.content}</span>
                <span className="chat-msg-time">{msg.created_at ? timeAgo(msg.created_at) : 'now'}</span>
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

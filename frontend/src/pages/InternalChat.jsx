import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getUsers, getInternalMessages, sendInternalMessage } from '../services/api';

let socket;

export default function InternalChat() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef();

  useEffect(() => {
    getUsers().then(r => setUsers(r.data)).catch(() => {});
    
    const token = localStorage.getItem('token');
    socket = io({ path: '/socket.io', auth: { token } });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewInternal = (message) => {
      const myId = localStorage.getItem('userId');
      if (message.senderId === myId) return; // Ignora se fui eu quem enviou (já adicionei no handleSend)

      if ((message.senderId === selected?.id && message.receiverId === myId) || 
          (message.senderId === myId && message.receiverId === selected?.id)) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('new_internal', handleNewInternal);
    return () => socket.off('new_internal', handleNewInternal);
  }, [selected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function selectUser(user) {
    setSelected(user);
    const { data } = await getInternalMessages(user.id);
    setMessages(data);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    try {
      const { data } = await sendInternalMessage({ receiverId: selected.id, body: text });
      setMessages(prev => [...prev, data]);
      setText('');
    } catch (err) {
      console.error('[chat] erro ao enviar:', err.response?.data || err.message);
      alert('Falha ao enviar mensagem: ' + (err.response?.data?.error || err.message));
    }
  }

  const myId = localStorage.getItem('userId');

  return (
    <div style={s.container}>
      <aside style={s.sidebar}>
        <div style={s.sidebarHeader}>👥 Equipe Multiatendimento</div>
        <div style={s.userList}>
          {users.filter(u => u.id !== myId).map(user => (
            <div 
              key={user.id} 
              style={{ ...s.userItem, background: selected?.id === user.id ? 'rgba(212, 175, 55, 0.1)' : 'none' }}
              onClick={() => selectUser(user)}
            >
              <div style={s.avatar}>{user.name[0].toUpperCase()}</div>
              <div>
                <div style={{ ...s.userName, color: selected?.id === user.id ? '#D4AF37' : '#fff' }}>{user.name}</div>
                <div style={s.userRole}>{user.role}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main style={s.main}>
        {selected ? (
          <>
            <div style={s.chatHeader}>
              <div style={s.avatarSmall}>{selected.name[0].toUpperCase()}</div>
              <span style={s.chatTitle}>{selected.name}</span>
              <div style={s.statusDot} />
            </div>
            <div style={s.messageList}>
              {messages.map((m, i) => (
                <div key={i} style={{ ...s.bubbleWrap, justifyContent: m.senderId === myId ? 'flex-end' : 'flex-start' }}>
                  <div style={{ 
                    ...s.bubble, 
                    background: m.senderId === myId ? '#D4AF37' : '#1A1A1B', 
                    color: m.senderId === myId ? '#000' : '#fff',
                    border: m.senderId === myId ? 'none' : '1px solid #333'
                  }}>
                    {m.body}
                    <div style={{ ...s.time, color: m.senderId === myId ? 'rgba(0,0,0,0.5)' : '#717171' }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} style={s.inputArea}>
              <input 
                style={s.input} 
                value={text} 
                onChange={e => setText(e.target.value)} 
                placeholder="Escreva uma mensagem interna..."
              />
              <button type="submit" style={s.sendBtn}>Enviar</button>
            </form>
          </>
        ) : (
          <div style={s.empty}>
            <div style={s.emptyIcon}>✨</div>
            <h3 style={{ color: '#fff', margin: '1rem 0 0.5rem' }}>Colaboração em Tempo Real</h3>
            <p style={{ color: '#717171', fontSize: '0.9rem' }}>Selecione um colega para iniciar a conversa.</p>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  container: { display: 'flex', flex: 1, height: '100%', width: '100%', background: '#0F0F0F' },
  sidebar: { width: '300px', borderRight: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', background: '#131314' },
  sidebarHeader: { padding: '1.5rem', fontWeight: 800, fontSize: '1rem', borderBottom: '1px solid #2A2A2A', color: '#fff', letterSpacing: '-0.02em' },
  userList: { flex: 1, overflowY: 'auto', padding: '0.5rem' },
  userItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', borderRadius: '12px', marginBottom: '0.25rem', transition: 'all 0.2s' },
  avatar: { width: '44px', height: '44px', borderRadius: '14px', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' },
  avatarSmall: { width: '32px', height: '32px', borderRadius: '10px', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' },
  userName: { fontWeight: 700, fontSize: '0.95rem' },
  userRole: { fontSize: '0.75rem', color: '#717171', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', background: '#0F0F0F' },
  chatHeader: { padding: '1rem 1.5rem', background: '#131314', borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', gap: '1rem' },
  chatTitle: { fontWeight: 800, color: '#fff', fontSize: '1.1rem' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#48bb78', marginLeft: 'auto' },
  messageList: { flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  bubbleWrap: { display: 'flex' },
  bubble: { padding: '0.75rem 1.25rem', borderRadius: '18px', maxWidth: '70%', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', position: 'relative' },
  time: { fontSize: '0.65rem', marginTop: '6px' },
  inputArea: { padding: '1.5rem', background: '#131314', borderTop: '1px solid #2A2A2A', display: 'flex', gap: '1rem' },
  input: { flex: 1, padding: '1rem 1.5rem', borderRadius: '30px', border: '1px solid #333', background: '#1A1A1B', color: '#fff', outline: 'none', fontSize: '0.95rem', transition: 'border-color 0.2s' },
  sendBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '0.5rem 2rem', borderRadius: '30px', fontWeight: 800, cursor: 'pointer', transition: 'transform 0.1s' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  emptyIcon: { fontSize: '4rem', filter: 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.3))' },
};

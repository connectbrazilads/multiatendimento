import React, { useEffect, useState, useRef } from 'react';
import { MessageSquareText, Send, Sparkles, Users } from 'lucide-react';
import { toast } from '../utils/toast';
import { io } from 'socket.io-client';
import { getUsers, getInternalMessages, sendInternalMessage } from '../services/api';
import { SOCKET_URL } from '../services/socket';
import ActionButton from '../components/ui/ActionButton';
import EmptyState from '../components/ui/EmptyState';

let socket;

export default function InternalChat() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    getUsers()
      .then((response) => setUsers(response.data))
      .catch(() => {});

    const token = localStorage.getItem('token');
    socket = io(SOCKET_URL, { auth: { token } });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewInternal = (message) => {
      const myId = localStorage.getItem('userId');
      if (message.senderId === myId) return;

      if (
        (message.senderId === selected?.id && message.receiverId === myId) ||
        (message.senderId === myId && message.receiverId === selected?.id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on('new_internal', handleNewInternal);
    return () => socket.off('new_internal', handleNewInternal);
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      setMessages((prev) => [...prev, data]);
      setText('');
    } catch (err) {
      console.error('[chat] erro ao enviar:', err.response?.data || err.message);
      toast.error('Falha ao enviar mensagem: ' + (err.response?.data?.error || err.message));
    }
  }

  const myId = localStorage.getItem('userId');

  return (
    <div style={s.container}>
      <aside style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <p style={s.sidebarKicker}>Colaboracao</p>
          <div style={s.sidebarTitle}>Equipe multiatendimento</div>
        </div>

        <div style={s.userList}>
          {users.filter((user) => user.id !== myId).map((user) => {
            const isSelected = selected?.id === user.id;
            return (
              <button
                key={user.id}
                style={{ ...s.userItem, ...(isSelected ? s.userItemActive : {}) }}
                onClick={() => selectUser(user)}
              >
                <div style={s.avatar}>{user.name[0].toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...s.userName, color: isSelected ? 'var(--accent)' : 'var(--text-main)' }}>{user.name}</div>
                  <div style={s.userRole}>{user.role}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main style={s.main}>
        {selected ? (
          <>
            <div style={s.chatHeader}>
              <div style={s.chatIdentity}>
                <div style={s.avatarSmall}>{selected.name[0].toUpperCase()}</div>
                <div>
                  <div style={s.chatTitle}>{selected.name}</div>
                  <div style={s.chatSubtitle}>Canal interno da equipe</div>
                </div>
              </div>
              <div style={s.onlineStatus}>
                <span style={s.statusDot} />
                Disponivel
              </div>
            </div>

            <div style={s.messageList}>
              {messages.map((message, index) => {
                const fromMe = message.senderId === myId;
                return (
                  <div key={index} style={{ ...s.bubbleWrap, justifyContent: fromMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ ...s.bubble, ...(fromMe ? s.bubbleFromMe : s.bubbleFromOther) }}>
                      <div>{message.body}</div>
                      <div style={{ ...s.time, color: fromMe ? 'rgba(74,56,0,0.72)' : 'var(--text-dim)' }}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} style={s.inputArea}>
              <input
                style={s.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva uma mensagem interna..."
              />
              <ActionButton type="submit" style={s.sendBtn}>
                <Send size={16} />
                Enviar
              </ActionButton>
            </form>
          </>
        ) : (
          <div style={s.emptyWrap}>
            <EmptyState
              icon={<Sparkles size={24} />}
              title="Colaboracao em tempo real"
              description="Selecione um colega para iniciar uma conversa interna e alinhar atendimentos em andamento."
              style={s.emptyState}
            />
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  container: {
    display: 'flex',
    flex: 1,
    height: '100%',
    width: '100%',
    background: 'var(--bg-base)',
  },
  sidebar: {
    width: '320px',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-surface)',
  },
  sidebarHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid var(--border-color)',
  },
  sidebarKicker: {
    margin: '0 0 0.35rem',
    color: 'var(--accent)',
    fontSize: '0.74rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  sidebarTitle: {
    color: 'var(--text-main)',
    fontWeight: 800,
    fontSize: '1.02rem',
    letterSpacing: '-0.02em',
  },
  userList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.75rem',
  },
  userItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
    padding: '0.95rem',
    cursor: 'pointer',
    borderRadius: '14px',
    marginBottom: '0.35rem',
    background: 'transparent',
    border: '1px solid transparent',
    textAlign: 'left',
  },
  userItemActive: {
    background: 'var(--accent-light)',
    borderColor: 'var(--accent-border)',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '1rem',
    flexShrink: 0,
  },
  avatarSmall: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.82rem',
    flexShrink: 0,
  },
  userName: {
    fontWeight: 700,
    fontSize: '0.95rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-base)',
  },
  chatHeader: {
    padding: '1rem 1.5rem',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  chatIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  chatTitle: {
    fontWeight: 800,
    color: 'var(--text-main)',
    fontSize: '1.05rem',
  },
  chatSubtitle: {
    fontSize: '0.78rem',
    color: 'var(--text-dim)',
    marginTop: '0.2rem',
  },
  onlineStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#48bb78',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  bubbleWrap: {
    display: 'flex',
  },
  bubble: {
    padding: '0.8rem 1.15rem',
    borderRadius: '18px',
    maxWidth: '70%',
    fontSize: '0.95rem',
    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    position: 'relative',
    lineHeight: 1.6,
  },
  bubbleFromMe: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: '1px solid var(--accent)',
  },
  bubbleFromOther: {
    background: 'var(--bg-surface)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
  },
  time: {
    fontSize: '0.68rem',
    marginTop: '0.4rem',
  },
  inputArea: {
    padding: '1.25rem 1.5rem',
    background: 'var(--bg-surface)',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    gap: '0.9rem',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '0.95rem 1.2rem',
    borderRadius: '999px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-panel)',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.95rem',
  },
  sendBtn: {
    padding: '0.9rem 1.15rem',
    borderRadius: '999px',
    minWidth: '8rem',
  },
  emptyWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  emptyState: {
    maxWidth: '30rem',
    width: '100%',
  },
};

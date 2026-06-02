import React, { useEffect, useState, useRef } from 'react';
import { Send, Users, X, ChevronLeft, Sparkles } from 'lucide-react';
import { toast } from '../utils/toast';
import { io } from 'socket.io-client';
import { getUsers, getInternalMessages, sendInternalMessage } from '../services/api';
import { SOCKET_URL } from '../services/socket';
import ActionButton from './ui/ActionButton';

let socket;

export default function InternalChatDrawer({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const myId = localStorage.getItem('userId');

  useEffect(() => {
    if (!isOpen) return;

    getUsers()
      .then((response) => setUsers(response.data))
      .catch(() => {});

    const token = localStorage.getItem('token');
    socket = io(SOCKET_URL, { auth: { token } });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleNewInternal = (message) => {
      if (message.senderId === myId) return;

      if (
        (message.senderId === selected?.id && message.receiverId === myId) ||
        (message.senderId === myId && message.receiverId === selected?.id)
      ) {
        setMessages((prev) => [...prev, message]);
      } else {
        // Se a mensagem for de outro usuário, mostraremos uma notificação no Layout
        // Aqui não precisamos fazer nada específico, o Layout já cuida da notificação
      }
    };

    socket.on('new_internal', handleNewInternal);
    return () => socket.off('new_internal', handleNewInternal);
  }, [selected, isOpen, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selected]);

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

  if (!isOpen) return null;

  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.drawer}>
        {!selected ? (
          // LIST VIEW
          <div style={s.viewContainer}>
            <div style={s.header}>
              <div style={s.headerTitle}>
                <Users size={18} />
                Equipe
              </div>
              <button style={s.iconBtn} onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            
            <div style={s.content}>
              {users.filter((user) => user.id !== myId).length === 0 ? (
                <div style={s.emptyWrap}>
                  <Sparkles size={24} color="var(--text-dim)" />
                  <p style={{color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem'}}>
                    Nenhum outro colaborador encontrado.
                  </p>
                </div>
              ) : (
                users.filter((user) => user.id !== myId).map((user) => (
                  <button key={user.id} style={s.userItem} onClick={() => selectUser(user)}>
                    <div style={s.avatar}>{user.name[0].toUpperCase()}</div>
                    <div style={s.userInfo}>
                      <div style={s.userName}>{user.name}</div>
                      <div style={s.userRole}>{user.role}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          // CHAT VIEW
          <div style={s.viewContainer}>
            <div style={s.header}>
              <button style={s.backBtn} onClick={() => setSelected(null)}>
                <ChevronLeft size={20} />
              </button>
              <div style={s.chatIdentity}>
                <div style={s.avatarSmall}>{selected.name[0].toUpperCase()}</div>
                <div>
                  <div style={s.chatTitle}>{selected.name}</div>
                  <div style={s.chatSubtitle}>Equipe Interna</div>
                </div>
              </div>
              <button style={s.iconBtn} onClick={onClose}>
                <X size={20} />
              </button>
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
                placeholder="Mensagem..."
              />
              <ActionButton type="submit" style={s.sendBtn}>
                <Send size={16} />
              </ActionButton>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

const s = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(2px)',
    zIndex: 1040,
    animation: 'fadeIn 0.2s ease',
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '380px',
    maxWidth: '100%',
    background: 'var(--bg-base)',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
    zIndex: 1050,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.3s ease',
  },
  viewContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-color)',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontWeight: 800,
    color: 'var(--text-main)',
    fontSize: '1.05rem',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
    padding: '0.85rem',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  userInfo: {
    minWidth: 0,
    flex: 1,
  },
  userName: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: 'var(--text-main)',
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
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: '8px',
    marginRight: '0.5rem',
    display: 'flex',
    alignItems: 'center',
  },
  chatIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1,
  },
  avatarSmall: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.8rem',
  },
  chatTitle: {
    fontWeight: 800,
    color: 'var(--text-main)',
    fontSize: '0.95rem',
  },
  chatSubtitle: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
  bubbleWrap: {
    display: 'flex',
  },
  bubble: {
    padding: '0.65rem 0.95rem',
    borderRadius: '14px',
    maxWidth: '85%',
    fontSize: '0.9rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    lineHeight: 1.5,
    userSelect: 'text',
    WebkitUserSelect: 'text',
    cursor: 'text',
  },
  bubbleFromMe: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
    border: '1px solid var(--accent)',
    borderBottomRightRadius: '4px',
  },
  bubbleFromOther: {
    background: 'var(--bg-surface)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    borderBottomLeftRadius: '4px',
  },
  time: {
    fontSize: '0.65rem',
    marginTop: '0.3rem',
    textAlign: 'right',
  },
  inputArea: {
    padding: '1rem',
    background: 'var(--bg-surface)',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '0.8rem 1rem',
    borderRadius: '999px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-panel)',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.9rem',
  },
  sendBtn: {
    padding: '0.8rem',
    borderRadius: '50%',
    minWidth: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1rem',
    opacity: 0.8,
  }
};

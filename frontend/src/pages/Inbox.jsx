import React, { useEffect, useState, useRef } from 'react';
import api, { 
  getTickets, getMessages, sendMessage, sendMediaMessage, 
  assignTicket, resolveTicket, getMe, getUsers, getTeams, 
  summarizeTicket, updateContact, getContactMedia, reopenTicket, updateTicket,
  getQuickResponses, scheduleMessage, sendAudioMessage, deleteMessage, spellCheckMessage,
  getTags, getSettings, getMediaUrl, getEquipments, BACKEND_URL
} from '../services/api';
import io from 'socket.io-client';
import { SOCKET_URL } from '../services/socket';

import CreateOsModal from '../components/CreateOsModal';
import LinkContactModal from '../components/LinkContactModal';

export default function Inbox() {
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('mine'); // mine, pending, resolved
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [transferModal, setTransferModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [showOsModal, setShowOsModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ priority: '', agentId: '', teamId: '' });
  const [quickResponses, setQuickResponses] = useState([]);
  const [filteredQuick, setFilteredQuick] = useState([]);
  const [showScheduling, setShowScheduling] = useState(false);
  const [scheduleData, setScheduleData] = useState({ body: '', sendAt: '' });
  const [previewImg, setPreviewImg] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [spellModal, setSpellModal] = useState(null); // { original, corrected }
  const [spellChecking, setSpellChecking] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0); // Força atualização de componentes filhos
  const [replyingTo, setReplyingTo] = useState(null);
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setView('list');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollRef = useRef();
  const socketRef = useRef();
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { sampleRate: 44100, channelCount: 1 } 
      });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
          ? 'audio/ogg; codecs=opus' 
          : MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
            ? 'audio/webm; codecs=opus'
            : 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        try {
          await sendAudioMessage(selectedId, blob);
          loadMessages();
        } catch (e) { alert('Erro ao enviar áudio'); }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (e) { alert('Permissão de microfone negada'); }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const [counts, setCounts] = useState({ mine: 0, pending: 0, resolved: 0 });

  const selectedIdRef = React.useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    loadInitial();
    const token = localStorage.getItem('token');
    // Força transporte websocket para maior estabilidade em VPS
    const s = io(SOCKET_URL, { 
      auth: { token },
      reconnectionDelayMax: 10000,
    });
    socketRef.current = s;

    s.on('new_message', ({ message, ticket: t }) => {
      if (t.id === selectedIdRef.current) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === message.id);
          if (exists) return prev.map(m => m.id === message.id ? message : m);
          return [...prev, message];
        });
      }
      loadTickets();
    });

    s.on('connect', () => {
      loadTickets();
      if (selectedIdRef.current) {
        getMessages(selectedIdRef.current).then(res => {
          setMessages(res.data);
        }).catch(e => console.error(e));
      }
    });

    s.on('message_updated', ({ message }) => {
      setMessages(prev => prev.map(m => m.id === message.id ? message : m));
    });

    s.on('ticket_updated', () => {
      loadTickets();
    });

    s.on('connect_error', (err) => {
      console.error('[socket] erro de conexão:', err.message);
    });

    return () => s.disconnect();
  }, []); // Roda apenas uma vez no mount
  useEffect(() => {
    loadTickets();
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('ticketId');
    if (tId) setSelectedId(tId);
  }, [tab, filters]);

  useEffect(() => {
    if (selectedId) loadMessages();
  }, [selectedId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  }

  const [botName, setBotName] = useState('Robô');

  async function loadInitial() {
    const [{ data: meData }, { data: uData }, { data: tData }, { data: qData }, { data: sData }] = await Promise.all([
      getMe(), getUsers(), getTeams(), getQuickResponses(), getSettings()
    ]);
    setMe(meData);
    setUsers(uData);
    setTeams(tData);
    setQuickResponses(qData);
    if (sData?.botName) setBotName(sData.botName);
  }

  async function loadTickets() {
    try {
      const { data } = await getTickets(
        tab === 'mine' ? null : tab, 
        tab === 'mine', 
        { ...filters, search }
      );
      setTickets(data.tickets || []);
      setCounts(data.counts || { mine: 0, pending: 0, resolved: 0 });
    } catch (e) { console.error(e); }
  }

  async function loadMessages() {
    setLoading(true);
    setSummary(null);
    try {
      const { data } = await getMessages(selectedId);
      setMessages(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleDeleteMessage(msgId) {
    if (!window.confirm('Deseja apagar esta mensagem para o cliente? (Ela continuará visível e riscada para você)')) return;
    try {
      await deleteMessage(selectedId, msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true } : m));
    } catch (e) { alert('Erro ao apagar mensagem'); }
  }

  async function handleSend(e) {
    e?.preventDefault();
    if (!text.trim() && !file) return;

    // Spell check apenas para mensagens de texto puras (sem arquivo)
    if (text.trim() && !file && text.trim().length >= 5) {
      setSpellChecking(true);
      try {
        const { data } = await spellCheckMessage(text.trim());
        if (data.corrected && data.corrected !== text.trim()) {
          setSpellChecking(false);
          setSpellModal({ original: text.trim(), corrected: data.corrected });
          return; // Para o envio e exibe o modal
        }
      } catch (_) { /* silencioso, não bloqueia */ }
      setSpellChecking(false);
    }

    await doSend(text, file);
  }

  async function doSend(body, attachment) {
    const tId = selectedId;
    const qId = replyingTo?.externalId;
    setText('');
    setFile(null);
    setSpellModal(null);
    setReplyingTo(null);
    try {
      if (attachment) {
        await sendMediaMessage(tId, attachment, body, qId);
      } else {
        await sendMessage(tId, body, qId);
      }
      loadMessages();
    } catch (e) { alert('Erro ao enviar'); }
  }

  async function handleTransfer(agentId, teamId) {
    try {
      await assignTicket(selectedId, agentId, teamId);
      setTransferModal(false);
      setSelectedId(null);
      loadTickets();
    } catch (e) { alert('Erro ao transferir'); }
  }

  async function handleResolve() {
    if (!window.confirm('Encerrar este atendimento?')) return;
    try {
      await resolveTicket(selectedId);
      setSelectedId(null);
      loadTickets();
    } catch (e) { alert('Erro ao encerrar'); }
  }

  async function handleReopen() {
    if (!window.confirm('Reabrir este atendimento?')) return;
    try {
      const { data } = await reopenTicket(selectedTicket.contactId);
      setSelectedId(data.id);
      loadTickets();
    } catch (e) { alert('Erro ao reabrir'); }
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const { data } = await summarizeTicket(selectedId);
      setSummary(data.summary);
    } catch (e) { alert('Erro ao gerar resumo'); } finally { setSummarizing(false); }
  }

  async function handleSchedule() {
    if (!scheduleData.body || !scheduleData.sendAt) return alert('Preencha a mensagem e o horário');
    try {
      const ticket = tickets.find(t => t.id === selectedId);
      await scheduleMessage({ ...scheduleData, contactId: ticket.contactId });
      alert('Mensagem agendada com sucesso!');
      setShowScheduling(false);
      setScheduleData({ body: '', sendAt: '' });
    } catch (e) { alert('Erro ao agendar'); }
  }

  const handleInput = (v) => {
    setText(v);
    if (v.startsWith('/')) {
      const q = v.slice(1).toLowerCase();
      setFilteredQuick(quickResponses.filter(r => r.shortcut.toLowerCase().includes(q)));
    } else {
      setFilteredQuick([]);
    }
  };

  const selectedTicket = tickets.find(t => t.id === selectedId);

  const selectTicket = (id) => {
    setSelectedId(id);
    if (isMobile) setView('chat');
  };

  return (
    <div style={s.layout}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {/* Sidebar */}
      <aside style={{ 
        ...s.sidebar, 
        display: (isMobile && view === 'chat') ? 'none' : 'flex',
        width: isMobile ? '100%' : s.sidebar.width,
        minWidth: isMobile ? '100%' : s.sidebar.minWidth
      }}>
        <div style={s.tabsWrap}>
          <div style={s.tabs}>
            {['mine', 'pending', 'resolved'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}>
                {t === 'mine' ? 'Meus' : t === 'pending' ? 'Aguardando' : 'Encerrados'}
                {counts[t] > 0 && <span style={s.badge}>{counts[t]}</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={s.searchWrap}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
             <input style={s.search} placeholder="🔍 Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadTickets()} />
             <button onClick={() => setFilters({ priority: '', agentId: '', teamId: '' })} style={s.clearBtn}>🧹</button>
          </div>
          
          <div style={s.filterBar}>
            <select style={s.filterSelect} value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})}>
              <option value="">Prioridade</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Normal</option>
              <option value="low">Baixa</option>
            </select>
            
            <select style={s.filterSelect} value={filters.agentId} onChange={e => setFilters({...filters, agentId: e.target.value})}>
              <option value="">Atendente</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>

            <select style={s.filterSelect} value={filters.teamId} onChange={e => setFilters({...filters, teamId: e.target.value})}>
              <option value="">Equipe</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div style={s.list}>
          {tickets.filter(t => t.contact.name?.toLowerCase().includes(search.toLowerCase()) || t.contact.phone.includes(search)).map(t => (
            <div key={t.id} onClick={() => selectTicket(t.id)} style={{ ...s.row, ...(selectedId === t.id ? s.rowActive : {}) }}>
              <Avatar name={t.contact.name || t.contact.phone} src={t.contact.avatarUrl} size={42} />
              <div style={s.rowInfo}>
                <div style={s.rowTop}>
                  <span style={s.rowName}>{t.contact.name || t.contact.phone}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={s.rowTime}>{fmt(t.updatedAt)}</span>
                    {t.status === 'pending' && (
                      <span style={{ fontSize: '0.6rem', color: '#D4AF37', fontWeight: 800 }}>
                        ⏳ {waitingSince(t.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={s.rowSub}>
                  <span style={{ ...s.dot, background: statusColor(t.status) }} />
                  {t.priority && t.priority !== 'medium' && (
                    <span style={{ 
                      fontSize: '0.6rem', 
                      background: t.priority === 'urgent' ? '#e53e3e' : t.priority === 'high' ? '#dd6b20' : '#3182ce',
                      color: '#fff',
                      padding: '1px 4px',
                      borderRadius: 4,
                      marginRight: 6,
                      fontWeight: 800,
                      textTransform: 'uppercase'
                    }}>
                      {t.priority}
                    </span>
                  )}
                  <span style={s.rowMsg}>{t.instance?.instanceName?.split('_').pop().toUpperCase()} · {statusLabel(t.status)}</span>
                </div>
                {(t.team || t.agent) && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {t.team && <span style={{ ...s.miniBadge, background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>👥 {t.team.name}</span>}
                    {t.agent && <span style={{ ...s.miniBadge, background: 'rgba(255,255,255,0.05)', color: '#717171' }}>👤 {t.agent.name}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {tickets.length === 0 && <Empty>Nenhuma conversa encontrada</Empty>}
        </div>
      </aside>

      {/* Main Chat */}
      <main 
        style={{ 
          ...s.main,
          display: (isMobile && view === 'list') ? 'none' : 'flex'
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
          }
        }}
      >
        {selectedTicket ? (
          <>
            <header style={{ ...s.chatHeader, padding: isMobile ? '0.5rem 1rem' : '1rem 2rem' }}>
              {isMobile && <button style={s.backBtn} onClick={() => setView('list')}>❮</button>}
              <Avatar name={selectedTicket.contact.name || selectedTicket.contact.phone} src={selectedTicket.contact.avatarUrl} size={isMobile ? 32 : 40} />
              <div style={{ ...s.rowInfo, overflow: 'hidden' }}>
                <div style={{ ...s.chatName, fontSize: isMobile ? '0.9rem' : '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedTicket.contact.name || selectedTicket.contact.phone}
                </div>
                {/* Mostra a empresa vinculada no cabeçalho se existir */}
                {!isMobile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ ...s.chatPhone, color: 'var(--accent)', fontWeight: 700 }}>
                      {selectedTicket.contact.phone}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ ...s.headerActions, gap: isMobile ? '4px' : '0.75rem' }}>
                <button style={{ ...s.aiBtn, padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }} onClick={() => setShowOsModal(true)}>
                  🔧 {isMobile ? 'O.S.' : 'Gerar O.S.'}
                </button>
                <button style={{ ...s.aiBtn, padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }} onClick={handleSummarize} disabled={summarizing}>
                  {isMobile ? '✨' : '✨ Resumo IA'}
                </button>
                {selectedTicket.status !== 'resolved' ? (
                  <>
                    <button style={{ ...s.transferBtn, padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }} onClick={() => setTransferModal(true)}>
                      {isMobile ? '➡️' : '➡️ Transferir'}
                    </button>
                    <button style={{ ...s.resolveBtn, padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }} onClick={handleResolve}>
                      {isMobile ? '✅' : '✅ Encerrar'}
                    </button>
                  </>
                ) : (
                  <button style={{ ...s.resolveBtn, background: 'var(--text-muted)', padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }} onClick={handleReopen}>
                    {isMobile ? '🔄' : '🔄 Reabrir'}
                  </button>
                )}
                <button style={s.infoBtn} onClick={() => setShowInfo(!showInfo)}>ℹ️</button>
              </div>
            </header>

            {summary && (
              <div style={s.summaryCard}>
                <div style={s.summaryHeader}><span>✨ RESUMO DA CONVERSA (IA)</span><button onClick={() => setSummary(null)}>✕</button></div>
                <div style={s.summaryBody}>{summary}</div>
              </div>
            )}

            <div style={s.messages} ref={scrollRef}>
              {loading ? <Empty>Carregando histórico...</Empty> : messages.map((m, i) => {
                if (m._separator) {
                  return (
                    <div key={`sep-${i}`} style={s.separator}>
                      <div style={s.sepLine} />
                      <div style={{ ...s.sepLabel, background: m.isCurrent ? '#D4AF37' : '#333' }}>
                        {m.isCurrent ? 'SESSÃO ATUAL' : `SESSÃO ANTERIOR (${new Date(m.date).toLocaleDateString()})`}
                      </div>
                      <div style={s.sepLine} />
                    </div>
                  );
                }

                if (m._type === 'event') {
                  let payload = {};
                  try { 
                    if (typeof m.payload === 'string') {
                      payload = JSON.parse(m.payload || '{}'); 
                    } else if (typeof m.payload === 'object' && m.payload !== null) {
                      payload = m.payload;
                    }
                  } catch(e) { console.error('Erro ao processar payload do evento:', e); }
                  
                  if (m.type === 'ia_summary' && payload?.summary) {
                    return (
                      <div key={m.id} style={s.summaryCard}>
                         <div style={s.summaryHeader}>🪄 RESUMO DE CONTEXTO (IA)</div>
                         <div style={s.summaryBody}>{payload.summary}</div>
                      </div>
                    );
                  }

                  const eventLabel = {
                    assigned: 'Assumiu o atendimento',
                    transferred: `Transferiu para ${payload?.teamName || 'outra equipe'}`,
                    resolved: 'Encerrou o atendimento',
                    reopened: 'Reabriu o atendimento',
                    ooo_message: 'Aviso de Fora de Horário Enviado'
                  }[m.type] || m.type;

                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                       <div style={{ 
                         background: m.type === 'resolved' ? 'rgba(39, 174, 96, 0.1)' : m.type === 'ooo_message' ? 'rgba(230, 126, 34, 0.1)' : 'rgba(212, 175, 55, 0.05)', 
                         color: m.type === 'resolved' ? '#2ecc71' : m.type === 'ooo_message' ? '#e67e22' : '#D4AF37', 
                         fontSize: '0.65rem', 
                         padding: '6px 16px', 
                         borderRadius: '20px', 
                         border: `1px solid ${m.type === 'resolved' ? 'rgba(39, 174, 96, 0.2)' : m.type === 'ooo_message' ? 'rgba(230, 126, 34, 0.2)' : 'rgba(212, 175, 55, 0.15)'}`, 
                         textTransform: 'uppercase', 
                         letterSpacing: '0.08em',
                         fontWeight: 600,
                         boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                       }}>
                          {m.user?.name || 'Sistema'} • {eventLabel} {m.createdAt ? `em ${new Date(m.createdAt).toLocaleDateString('pt-BR')} às ${new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                       </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} style={{ ...s.bubbleWrap, justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ 
                      ...s.bubble, 
                      background: m.fromMe ? '#D4AF37' : '#1A1A1B', 
                      color: m.fromMe ? '#000' : '#fff',
                      opacity: m.isDeleted ? 0.6 : 1,
                      textDecoration: m.isDeleted ? 'line-through' : 'none',
                      border: m.fromMe ? 'none' : '1px solid #333',
                      alignItems: m.fromMe ? 'flex-end' : 'flex-start'
                    }}>
                      {m.fromMe && !m.isDeleted && (
                        <button 
                          onClick={() => handleDeleteMessage(m.id)}
                          style={{ position: 'absolute', top: -10, right: -10, background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Apagar para o cliente"
                        >
                          ✕
                        </button>
                      )}
                      
                      {/* NOME DE QUEM ESTÁ FALANDO */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 800, 
                          color: m.fromMe ? 'rgba(0,0,0,0.6)' : '#D4AF37', 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {m.fromMe ? (m.fromBot ? `🤖 ${botName}` : (m.agent?.name || 'Você')) : (selectedTicket.contact.name || selectedTicket.contact.phone)}
                        </div>
                        {!m.isDeleted && (
                          <button 
                            onClick={() => setReplyingTo(m)}
                            style={{ background: 'none', border: 'none', color: m.fromMe ? 'rgba(0,0,0,0.4)' : '#717171', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}
                            title="Responder"
                          >
                            ↩️
                          </button>
                        )}
                      </div>

                      {/* MENSAGEM RESPONDIDA (QUOTED) */}
                      {m.quotedMsgBody && (
                        <div style={{ 
                          background: m.fromMe ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)',
                          borderLeft: `3px solid ${m.fromMe ? 'rgba(0,0,0,0.3)' : '#D4AF37'}`,
                          padding: '6px 10px',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          fontSize: '0.8rem',
                          color: m.fromMe ? 'rgba(0,0,0,0.6)' : '#A0A0A0',
                          fontStyle: 'italic',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {m.quotedMsgBody}
                        </div>
                      )}

                      <MediaContent message={m} onImageClick={setPreviewImg} />
                      {!m.mediaUrl && <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: m.fromMe ? 500 : 400 }}>{m.body}</div>}
                      <div style={{ ...s.time, color: m.fromMe ? 'rgba(0,0,0,0.4)' : '#717171' }}>{fmt(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredQuick.length > 0 && (
              <div style={s.quickList}>
                {filteredQuick.map(r => (
                  <div key={r.id} style={s.quickItem} onClick={() => { setText(r.message); setFilteredQuick([]); }}>
                    <strong>{r.shortcut}</strong>: {r.message}
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...s.inputArea, padding: isMobile ? '0.75rem' : '1rem', gap: isMobile ? '0.5rem' : '0.75rem', flexDirection: 'column', alignItems: 'stretch' }}>
              {replyingTo && (
                <div style={{ 
                  background: 'rgba(212,175,55,0.1)', 
                  borderLeft: '4px solid #D4AF37', 
                  padding: '8px 12px', 
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: '#D4AF37', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                      Respondendo a {replyingTo.fromMe ? 'você' : (selectedTicket.contact.name || selectedTicket.contact.phone)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {replyingTo.body || (replyingTo.mediaType ? `[${replyingTo.mediaType}]` : 'Mídia')}
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#717171', cursor: 'pointer', fontSize: '1rem', padding: '0 8px' }}>✕</button>
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
              {isRecording ? (
                <div style={s.recordingWrap}>
                  <div style={s.recordingDot} />
                  <span style={s.recordingTime}>{fmtTime(recordingTime)}</span>
                  <button style={s.stopBtn} onClick={stopRecording}>⏹ Parar e Enviar</button>
                </div>
              ) : (
                <>
                  <button style={{ ...s.attachBtn, fontSize: isMobile ? '1.1rem' : '1.4rem' }} onClick={() => document.getElementById('fileInput').click()}>📎</button>
                  <input type="file" id="fileInput" hidden onChange={e => setFile(e.target.files[0])} />
                  
                  {!isMobile && (
                    <button style={{ ...s.attachBtn, fontSize: '1.4rem' }} onClick={() => setShowScheduling(!showScheduling)}>📅</button>
                  )}
                  
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {file && <div style={s.filePreview}>📎 {file.name} <button onClick={() => setFile(null)}>✕</button></div>}
                    <textarea 
                      style={{ ...s.textInput, height: 'auto', minHeight: '40px', maxHeight: '120px', fontSize: isMobile ? '0.85rem' : '1rem' }} 
                      rows={1} 
                      value={text} 
                      onChange={e => {
                        handleInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = (e.target.scrollHeight) + 'px';
                      }} 
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                          e.target.style.height = '40px';
                        }
                      }}
                      placeholder={isMobile ? "Mensagem..." : "Digite sua mensagem..."}
                      spellCheck={true}
                    />
                  </div>
                  
                  <button 
                    style={{ 
                      ...s.sendBtn, 
                      width: isMobile ? '40px' : '45px', 
                      height: isMobile ? '40px' : '45px',
                      background: (isRecording || (!text.trim() && !file)) ? '#1A1A1B' : '#D4AF37',
                      border: (isRecording || (!text.trim() && !file)) ? '1px solid #333' : 'none',
                      color: (isRecording || (!text.trim() && !file)) ? '#717171' : '#000',
                      fontSize: isMobile ? '1.1rem' : '1.2rem'
                    }} 
                    onClick={(!text.trim() && !file) ? startRecording : handleSend}
                    onMouseDown={(!text.trim() && !file) ? startRecording : null}
                    onMouseUp={(!text.trim() && !file) ? stopRecording : null}
                  >
                    {spellChecking ? '⏳' : (!text.trim() && !file) ? '🎤' : '➤'}
                  </button>
                </>
              )}
              </div>
            </div>
          </>
        ) : (
          <div style={s.emptyChat}>
            <div style={s.emptyIcon}>💬</div>
            <h2>Central de Atendimento</h2>
            <p>Selecione um chat para começar a atender</p>
          </div>
        )}
      </main>

      {showInfo && selectedTicket && (
        <ContactPanel 
          key={selectedTicket.contact.id + '_' + updateTrigger}
          ticket={selectedTicket} 
          onClose={() => setShowInfo(false)} 
          onUpdate={() => { loadTickets(); setUpdateTrigger(prev => prev + 1); }}
          onImageClick={setPreviewImg}
          isMobile={isMobile}
          onLinkCRM={() => setLinkModal(true)}
        />
      )}

      {/* Modais */}
      
      {showScheduling && (
        <div style={s.overlay} onClick={() => setShowScheduling(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}><h3>📅 Agendar Mensagem</h3><button onClick={() => setShowScheduling(false)}>✕</button></div>
            <div style={s.modalBody}>
              <textarea style={s.modalInput} placeholder="Texto da mensagem..." value={scheduleData.body} onChange={e => setScheduleData({...scheduleData, body: e.target.value})} />
              <input style={s.modalInput} type="datetime-local" value={scheduleData.sendAt} onChange={e => setScheduleData({...scheduleData, sendAt: e.target.value})} />
              <button style={s.saveBtn} onClick={handleSchedule}>Confirmar Agendamento</button>
            </div>
          </div>
        </div>
      )}

      {previewImg && (
        <div style={s.overlay} onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="Preview" style={s.previewImg} />
        </div>
      )}

      {/* Modal de Correção Ortográfica */}
      {spellModal && (
        <div style={s.overlay} onClick={() => setSpellModal(null)}>
          <div style={{ ...s.modal, maxWidth: '480px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>✍️ Correção Sugerida</h3>
              <button onClick={() => setSpellModal(null)}>✕</button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#717171', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original</div>
                <div style={{ background: '#0F0F0F', border: '1px solid #333', borderRadius: '10px', padding: '0.75rem', color: '#A0A0A0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {spellModal.original}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#D4AF37', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>✅ Corrigido pela IA</div>
                <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 500 }}>
                  {spellModal.corrected}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: '#A0A0A0', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                  onClick={() => doSend(spellModal.original, null)}
                >
                  Enviar Original
                </button>
                <button
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#D4AF37', color: '#000', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}
                  onClick={() => { setText(spellModal.corrected); doSend(spellModal.corrected, null); }}
                >
                  ✅ Usar Correção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {transferModal && (
        <TransferModal 
          users={users}
          teams={teams}
          onClose={() => setTransferModal(false)}
          onTransfer={handleTransfer}
        />
      )}

      {showOsModal && selectedTicket && (
        <CreateOsModal
          ticket={selectedTicket}
          onClose={() => setShowOsModal(false)}
          onCreated={(os) => {
            setShowOsModal(false);
            const token = localStorage.getItem('token');
            window.open(`${BACKEND_URL}/api/os/${os.id}/pdf?token=${token}`, '_blank');
          }}
        />
      )}

      {linkModal && (
        <LinkContactModal 
          onClose={() => setLinkModal(false)}
          onLink={async (targetId) => {
            try {
              console.log('[LinkContact] Tentando vincular ticket:', selectedTicket?.id, 'ao contato:', targetId);
              const res = await api.patch(`/tickets/${selectedTicket.id}/link-contact`, { contactId: targetId });
              console.log('[LinkContact] Sucesso:', res.data);
              
              // Atualiza a lista de tickets e o gatilho de visualização
              loadTickets(); 
              setUpdateTrigger(prev => prev + 1);
              setLinkModal(false);
              alert('Cliente vinculado com sucesso!');
            } catch (e) {
              console.error('[LinkContact] Erro ao vincular:', e.response?.data || e.message);
              alert('Erro ao vincular cliente: ' + (e.response?.data?.error || e.message));
            }
          }}
        />
      )}

    </div>
  );
}

function Avatar({ name, src, size = 40 }) {
  const base = { width: size, height: size, borderRadius: '12px', flexShrink: 0, objectFit: 'cover' };
  if (src) return <img src={src} alt={name} style={base} />;
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return <div style={{ ...base, background: 'rgba(212,175,55,0.1)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.4 }}>{initials}</div>;
}

function MediaContent({ message: m, onImageClick }) {
  const url = getMediaUrl(m.mediaUrl);
  if (url && m.mediaType === 'image') return <img src={url} alt="" style={s.imgMedia} onClick={() => onImageClick(url)} />;
  if (url && m.mediaType === 'audio') return <AudioPlayer src={url} fromMe={m.fromMe} transcription={m.transcription} />;
  if (url && m.mediaType === 'document') {
    const isPdf = m.fileName?.toLowerCase().endsWith('.pdf');
    return (
      <a href={url} target="_blank" rel="noreferrer" style={s.pdfCard}>
        <div style={s.pdfIcon}>{isPdf ? '📕' : '📎'}</div>
        <div style={s.pdfInfo}>
          <div style={s.pdfName}>{m.fileName || 'Arquivo'}</div>
          <div style={s.pdfSize}>{isPdf ? 'Documento PDF' : 'Documento'}</div>
        </div>
      </a>
    );
  }
  return null;
}

function AudioPlayer({ src, fromMe, transcription }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <audio controls style={{ height: 32, maxWidth: 200, filter: fromMe ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
        <source src={src} type="audio/ogg; codecs=opus" />
        <source src={src} type="audio/mpeg" />
      </audio>
      {transcription && <div style={{ ...s.transcription, borderLeft: `2px solid ${fromMe ? '#000' : '#D4AF37'}`, color: fromMe ? 'rgba(0,0,0,0.6)' : '#A0A0A0' }}>{transcription}</div>}
    </div>
  );
}

function ContactPanel({ ticket, onClose, onUpdate, onImageClick, isMobile, onLinkCRM }) {
  const contact = ticket.contact;
  const [notes, setNotes] = useState(contact.notes || '');
  const [priority, setPriority] = useState(ticket.priority || 'medium');
  const [tags, setTags] = useState(() => { try { return JSON.parse(contact.tags || '[]'); } catch { return []; } });
  const [newTag, setNewTag] = useState('');
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [equipments, setEquipments] = useState([]);

  const [linkedCrm, setLinkedCrm] = useState(null);

  useEffect(() => {
    getContactMedia(contact.id).then(r => setMedia(r.data));
    getTags().then(r => setAvailableTags(r.data));
    getEquipments(contact.id).then(r => setEquipments(r.data));
    
    // Busca se existe uma empresa vinculada a este telefone
    api.get(`/contacts?search=${contact.phone}`).then(r => {
      const list = r.data.contacts || r.data || [];
      const crm = list.find(c => c.id !== contact.id && c.whatsapp === contact.phone);
      setLinkedCrm(crm);
    }).catch(() => {});
  }, [contact.id]);

  async function saveContact() { 
    await updateContact(contact.id, { notes, tags: JSON.stringify(tags) }); 
    onUpdate(); 
  }

  async function handlePriorityChange(p) {
    setPriority(p);
    setLoading(true);
    await updateTicket(ticket.id, { priority: p });
    onUpdate();
    setLoading(false);
  }

  const addTag = (tagName) => {
    if (!tagName) return;
    if (tags.includes(tagName)) return;
    const updated = [...tags, tagName];
    setTags(updated);
    updateContact(contact.id, { tags: JSON.stringify(updated) }).then(onUpdate);
  };

  const removeTag = (tag) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    updateContact(contact.id, { tags: JSON.stringify(updated) }).then(onUpdate);
  };

  return (
    <div style={{
      ...s.infoPanel,
      position: isMobile ? 'fixed' : 'relative',
      inset: isMobile ? 0 : 'auto',
      width: isMobile ? '100%' : '380px',
      zIndex: isMobile ? 2000 : 1,
      height: '100%'
    }}>
      <div style={s.infoPanelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ficha do Cliente</h3>
        </div>
        <button style={s.infoClose} onClick={onClose}>✕</button>
      </div>
      
      <div style={s.infoScroll}>
        <div style={s.infoProfile}>
          <Avatar name={contact.name || contact.phone} src={contact.avatarUrl} size={80} />
          <h4 style={s.infoName}>{contact.name || contact.phone}</h4>
          
          {linkedCrm ? (
            <div style={{ 
              color: '#D4AF37', 
              fontSize: '0.9rem', 
              fontWeight: 800, 
              marginBottom: 12,
              padding: '6px 16px',
              background: 'rgba(212,175,55,0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🏢 {linkedCrm.fantasyName || linkedCrm.name}
            </div>
          ) : (
            contact.fantasyName && (
              <div style={{ 
                color: 'var(--accent)', 
                fontSize: '0.9rem', 
                fontWeight: 700, 
                marginBottom: 8,
                padding: '4px 12px',
                background: 'rgba(212,175,55,0.1)',
                borderRadius: '8px',
                display: 'inline-block'
              }}>
                🏢 {contact.fantasyName}
              </div>
            )
          )}
          
          <div style={s.infoPhone}>{contact.phone}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <div style={s.infoBadge}>WhatsApp</div>
            <button 
              onClick={onLinkCRM}
              style={{ ...s.infoBadge, background: 'var(--accent)', color: '#000', cursor: 'pointer', border: 'none' }}
            >
              🔗 Vincular CRM
            </button>
          </div>
        </div>

        <div style={s.infoSection}>
          <h5 style={s.infoLabel}>🏷️ ETIQUETAS</h5>
          <div style={s.tagContainer}>
            {tags.map(t => (
              <span key={t} style={s.tagItem}>
                {t} <button onClick={() => removeTag(t)} style={s.tagDel}>✕</button>
              </span>
            ))}
            <select 
              style={s.tagSelect} 
              value="" 
              onChange={e => addTag(e.target.value)}
            >
              <option value="">+ Tag</option>
              {availableTags.filter(t => !tags.includes(t.name)).map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={s.infoSection}>
          <h5 style={s.infoLabel}>⚡ PRIORIDADE DO TICKET</h5>
          <div style={s.priorityGrid}>
            {[
              { id: 'urgent', label: 'Urgente', color: '#e53e3e' },
              { id: 'high', label: 'Alta', color: '#dd6b20' },
              { id: 'medium', label: 'Normal', color: '#d4af37' },
              { id: 'low', label: 'Baixa', color: '#3182ce' }
            ].map(p => (
              <button 
                key={p.id}
                onClick={() => handlePriorityChange(p.id)}
                style={{
                  ...s.priorityBtn,
                  background: priority === p.id ? p.color : 'rgba(255,255,255,0.03)',
                  color: priority === p.id ? '#000' : '#717171',
                  borderColor: priority === p.id ? p.color : '#333'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={s.infoSection}>
          <h5 style={s.infoLabel}>📝 NOTAS INTERNAS</h5>
          <textarea 
            style={s.notesArea} 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            onBlur={saveContact}
            placeholder="Adicione observações sobre este cliente..."
          />
        </div>

        <div style={s.infoSection}>
          <h5 style={s.infoLabel}>🛠️ EQUIPAMENTOS</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {equipments.map(e => (
              <div key={e.id} style={{ background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, border: '1px solid #333' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{e.manufacturer ? `${e.manufacturer} ` : ''}{e.model}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>{e.type || 'Equipamento'}</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>Série: {e.serialNumber || 'S/N'}</div>
                {e.sector && <div style={{ fontSize: '0.75rem', color: '#888' }}>Setor: {e.sector}</div>}
              </div>
            ))}
            {equipments.length === 0 && <div style={{ color: '#444', fontSize: '0.8rem' }}>Nenhum equipamento vinculado</div>}
          </div>
        </div>

        <div style={s.infoSection}>
          <h5 style={s.infoLabel}>🖼️ MÍDIAS COMPARTILHADAS</h5>
          <div style={s.mediaGrid}>
            {media.filter(m => m.mediaType === 'image').slice(0, 9).map(m => (
              <img key={m.id} src={m.mediaUrl} style={s.mediaThumb} onClick={() => onImageClick(m.mediaUrl)} />
            ))}
            {media.length === 0 && <div style={{ color: '#444', fontSize: '0.8rem' }}>Nenhuma mídia enviada</div>}
          </div>
        </div>

        <div style={s.infoSection}>
          <h5 style={s.infoLabel}>ℹ️ DETALHES TÉCNICOS</h5>
          <div style={s.techInfo}>
            <div style={s.techRow}><span>ID Ticket</span> <span>#{ticket.id}</span></div>
            <div style={s.techRow}><span>Criado em</span> <span>{new Date(ticket.createdAt).toLocaleDateString()}</span></div>
            <div style={s.techRow}><span>Atendente</span> <span>{ticket.agent?.name || 'Aguardando'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransferModal({ users, teams, onClose, onTransfer }) {
  const [target, setTarget] = useState('users');
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}><h3>Transferir Chat</h3><button onClick={onClose}>✕</button></div>
        <div style={s.tabs}><button onClick={() => setTarget('users')} style={{ ...s.tab, ...(target === 'users' ? s.tabActive : {}) }}>Agentes</button><button onClick={() => setTarget('teams')} style={{ ...s.tab, ...(target === 'teams' ? s.tabActive : {}) }}>Equipes</button></div>
        <div style={{ padding: '1rem', maxHeight: 300, overflowY: 'auto' }}>
          {target === 'users' ? users.map(u => <div key={u.id} style={s.transferRow} onClick={() => onTransfer(u.id, null)}><Avatar name={u.name} size={30} />{u.name}</div>) : teams.map(t => <div key={t.id} style={s.transferRow} onClick={() => onTransfer(null, t.id)}>👥 {t.name}</div>)}
        </div>
      </div>
    </div>
  );
}

function Empty({ children }) { return <div style={{ textAlign: 'center', padding: '3rem', color: '#717171' }}>{children}</div>; }
function fmt(d) { const date = new Date(d); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function waitingSince(d) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
function statusLabel(s) { return { pending: 'Aguardando', open: 'Atendimento', resolved: 'Resolvido' }[s] || s; }
function statusColor(s) { return { pending: '#D4AF37', open: '#48bb78', resolved: '#717171' }[s] || '#717171'; }

const s = {
  layout: { display: 'flex', height: '100%', width: '100%', background: 'var(--bg-base)', color: 'var(--text-main)', overflow: 'hidden' },
  sidebar: { width: '320px', minWidth: '320px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)' },
  tabsWrap: { padding: '1rem', borderBottom: '1px solid var(--border-color)' },
  tabs: { display: 'flex', gap: '4px', background: 'var(--bg-base)', padding: '4px', borderRadius: '12px' },
  tab: { flex: 1, padding: '0.6rem 0.2rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', transition: 'all 0.2s' },
  tabActive: { background: 'var(--bg-panel)', color: 'var(--accent)', boxShadow: 'var(--shadow-sm)' },
  badge: { marginLeft: 4, background: 'var(--accent)', color: '#000', borderRadius: '4px', padding: '1px 4px', fontSize: '0.6rem' },
  searchWrap: { padding: '1rem' },
  search: { flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'var(--text-main)', outline: 'none' },
  clearBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)', padding: '0 1rem', cursor: 'pointer' },
  filterBar: { display: 'flex', gap: '4px' },
  filterSelect: { flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px', color: 'var(--text-muted)', fontSize: '0.7rem', outline: 'none' },
  list: { flex: 1, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' },
  rowActive: { background: 'var(--accent-light)', borderLeft: '4px solid var(--accent)' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  rowName: { fontWeight: 700, fontSize: '0.95rem' },
  rowTime: { fontSize: '0.7rem', color: 'var(--text-muted)' },
  rowSub: { display: 'flex', alignItems: 'center', gap: '6px' },
  rowMsg: { fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  dot: { width: 8, height: 8, borderRadius: '50%' },
  miniBadge: { fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' },

  main: { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', position: 'relative', minWidth: 0, overflow: 'hidden' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2rem', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', zIndex: 10, width: '100%', boxSizing: 'border-box', minHeight: '64px' },
  chatName: { fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' },
  chatPhone: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  headerActions: { marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' },
  aiBtn: { background: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6', border: '1px solid rgba(155, 89, 182, 0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' },
  transferBtn: { background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' },
  resolveBtn: { background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' },
  infoBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  
  messages: { flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box' },
  bubbleWrap: { display: 'flex', width: '100%' },
  bubble: { padding: '0.8rem 1.2rem', borderRadius: '16px', maxWidth: '85%', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: 'var(--shadow-sm)' },
  time: { fontSize: '0.65rem', marginTop: 6, fontWeight: 700 },
  imgMedia: { maxWidth: '300px', maxHeight: '300px', borderRadius: '12px', cursor: 'pointer', objectFit: 'contain' },
  docLink: { color: 'inherit', fontWeight: 700, textDecoration: 'none' },
  pdfCard: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    padding: '12px', 
    background: 'rgba(0,0,0,0.05)', 
    borderRadius: '12px', 
    textDecoration: 'none', 
    color: 'inherit',
    border: '1px solid rgba(0,0,0,0.1)',
    maxWidth: '280px'
  },
  pdfIcon: { fontSize: '1.8rem' },
  pdfInfo: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  pdfName: { fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pdfSize: { fontSize: '0.7rem', color: 'rgba(0,0,0,0.5)' },
  transcription: { fontSize: '0.8rem', fontStyle: 'italic', padding: '4px 8px', marginTop: 8, background: 'var(--border-light)', borderRadius: 6 },
  
  inputArea: { padding: '1rem', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' },
  textInput: { flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '15px', padding: '0.75rem 1rem', color: 'var(--text-main)', outline: 'none', resize: 'none', minHeight: '40px', maxHeight: '120px' },
  sendBtn: { background: 'var(--accent)', color: '#000', border: 'none', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', fontWeight: 800, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' },
  attachBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', flexShrink: 0 },
  filePreview: { fontSize: '0.8rem', color: 'var(--accent)', padding: '4px 0' },
  recordingWrap: { flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(229, 62, 62, 0.1)', padding: '0.5rem 1.5rem', borderRadius: '15px', border: '1px solid rgba(229, 62, 62, 0.3)' },
  recordingDot: { width: 12, height: 12, borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1.5s infinite' },
  recordingTime: { color: 'var(--text-main)', fontWeight: 800, fontSize: '1rem', fontFamily: 'monospace' },
  stopBtn: { marginLeft: 'auto', background: 'var(--danger)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' },
  backBtn: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: '1.2rem', cursor: 'pointer', marginRight: '0.5rem' },


  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' },
  emptyIcon: { fontSize: '4rem', marginBottom: '1rem', opacity: 0.2 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-panel)', borderRadius: '24px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalBody: { padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  modalInput: { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'var(--text-main)' },
  saveBtn: { background: 'var(--accent)', color: '#000', border: 'none', padding: '0.75rem 1rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' },

  previewImg: { maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px' },
  summaryCard: { margin: '0 1.5rem 1.5rem', background: 'rgba(155, 89, 182, 0.05)', border: '1px solid rgba(155, 89, 182, 0.2)', borderRadius: '16px', padding: '1.25rem' },
  summaryHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 900, color: '#9b59b6', marginBottom: 8 },
  summaryBody: { fontSize: '0.9rem', color: '#9b59b6', lineHeight: '1.4' },
  
  separator: { display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0' },
  sepLine: { flex: 1, height: '1px', background: 'var(--border-color)' },
  sepLabel: { fontSize: '0.65rem', fontWeight: 900, padding: '4px 12px', borderRadius: '20px', color: 'var(--text-inverse)', background: 'var(--text-muted)' },
  
  infoPanel: { width: '380px', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' },
  infoPanelHeader: { padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoClose: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' },
  infoScroll: { flex: 1, overflowY: 'auto', padding: '2rem 1.5rem' },
  infoProfile: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2.5rem' },
  infoName: { margin: '1rem 0 0.2rem', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' },
  infoPhone: { color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.75rem' },
  infoBadge: { background: 'var(--accent-light)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' },
  infoSection: { marginBottom: '2.5rem' },
  infoLabel: { fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.1em' },
  tagContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  tagItem: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' },
  tagDel: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '0.8rem' },
  tagSelect: { background: 'none', border: '1px dashed var(--accent-border)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' },
  priorityGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  priorityBtn: { border: '1px solid', padding: '0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' },
  notesArea: { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', outline: 'none', resize: 'none', minHeight: '100px' },
  mediaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  mediaThumb: { width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border-color)' },
  techInfo: { background: 'var(--bg-base)', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' },
  techRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' },
  transferRow: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', cursor: 'pointer', borderRadius: '12px', transition: 'background 0.2s' },
  quickList: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', position: 'absolute', bottom: '80px', left: '20px', right: '20px', maxHeight: '200px', overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-lg)' },
  quickItem: { padding: '1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-main)' }
};

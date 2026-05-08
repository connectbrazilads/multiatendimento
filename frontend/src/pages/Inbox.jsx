import React, { useEffect, useState, useRef, useCallback } from 'react';
import api, { 
  getTickets, getMessages, sendMessage, sendMediaMessage, 
  assignTicket, resolveTicket, getMe, getUsers, getTeams, 
  summarizeTicket, updateContact, getContactMedia, reopenTicket, updateTicket,
  getQuickResponses, scheduleMessage, sendAudioMessage, deleteMessage, spellCheckMessage,
  getTags, getSettings, getMediaUrl, getEquipments, forwardMessage, getContacts, BACKEND_URL
} from '../services/api';
import io from 'socket.io-client';
import { SOCKET_URL } from '../services/socket';
import { toast } from '../utils/toast';
import { useIsMobile } from '../hooks/useIsMobile';

import CreateOsModal from '../components/CreateOsModal';
import LinkContactModal from '../components/LinkContactModal';

export default function Inbox() {
  const MESSAGE_PAGE_SIZE = 60;
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('mine'); // mine, pending, all
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextMessagesCursor, setNextMessagesCursor] = useState(null);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [transferModal, setTransferModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [showOsModal, setShowOsModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [files, setFiles] = useState([]);
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
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const isMobile = useIsMobile();

  // Volta para view lista quando janela é expandida para desktop
  useEffect(() => {
    if (!isMobile) setView('list');
  }, [isMobile]);

  const scrollRef = useRef();
  const socketRef = useRef();
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);

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
        } catch (e) { toast.error('Erro ao enviar áudio'); }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (e) { toast.error('Permissão de microfone negada'); }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const [counts, setCounts] = useState({ mine: 0, pending: 0, all: 0 });

  const selectedIdRef = React.useRef(selectedId);
  const tabRef = React.useRef(tab);
  const filtersRef = React.useRef(filters);
  const searchRef = React.useRef(search);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { searchRef.current = search; }, [search]);
  
  const loadTickets = useCallback(async () => {
    try {
      const currentTab = tabRef.current;
      const currentFilters = filtersRef.current;
      const currentSearch = searchRef.current || '';

      const { data } = await getTickets(
        currentTab === 'mine' ? null : currentTab, 
        currentTab === 'mine', 
        { ...currentFilters, search: currentSearch }
      );
      setTickets(data.tickets || []);
      setCounts(data.counts || { mine: 0, pending: 0, all: 0 });
    } catch (e) { console.error(e); }
  }, []);

  const debounceTimerRef = useRef(null);
  const debouncedLoadTickets = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      loadTickets();
    }, 500); 
  }, [loadTickets]);

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
        shouldScrollToBottomRef.current = true;
        setMessages(prev => {
          const exists = prev.find(m => m.id === message.id);
          if (exists) return prev.map(m => m.id === message.id ? message : m);
          return [...prev, message];
        });
      }
      debouncedLoadTickets();
    });

    s.on('connect', () => {
      loadTickets();
      if (selectedIdRef.current) {
        loadMessages({ ticketId: selectedIdRef.current, replace: true }).catch(e => console.error(e));
      }
    });

    s.on('message_updated', ({ message }) => {
      setMessages(prev => prev.map(m => m.id === message.id ? message : m));
    });

    s.on('ticket_updated', () => {
      debouncedLoadTickets();
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
    if (shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = false;
      scrollToBottom();
    }
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
    try {
      const [{ data: meData }, { data: uData }, { data: tData }, { data: qData }, { data: sData }] = await Promise.all([
        getMe(), getUsers(), getTeams(), getQuickResponses(), getSettings()
      ]);
      setMe(meData);
      setUsers(uData || []);
      setTeams(tData || []);
      setQuickResponses(qData || []);
      if (sData?.botName) setBotName(sData.botName);
    } catch (e) {
      console.error('Erro ao carregar dados iniciais:', e);
    }
  }

  async function loadMessages({ ticketId = selectedIdRef.current, before = null, replace = true } = {}) {
    if (!ticketId) return;

    if (replace) setLoading(true);
    else setLoadingMoreMessages(true);

    setSummary(null);
    const prevScrollHeight = scrollRef.current?.scrollHeight || 0;
    const prevScrollTop = scrollRef.current?.scrollTop || 0;

    try {
      const { data } = await getMessages(ticketId, { limit: MESSAGE_PAGE_SIZE, ...(before ? { before } : {}) });
      const incomingItems = data?.items || [];

      if (replace) {
        shouldScrollToBottomRef.current = true;
        setMessages(incomingItems);
      } else {
        setMessages(prev => mergeMessagePages(prev, incomingItems, true));
        setTimeout(() => {
          if (scrollRef.current) {
            const newHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = newHeight - prevScrollHeight + prevScrollTop;
          }
        }, 0);
      }

      setHasMoreMessages(Boolean(data?.hasMore));
      setNextMessagesCursor(data?.nextCursor || null);
    } catch (e) { console.error(e); } finally {
      if (replace) setLoading(false);
      else setLoadingMoreMessages(false);
    }
  }

  async function handleLoadMoreMessages() {
    if (!selectedId || !hasMoreMessages || !nextMessagesCursor || loadingMoreMessages) return;
    await loadMessages({ ticketId: selectedId, before: nextMessagesCursor, replace: false });
  }

  async function handleDeleteMessage(msgId) {
    toast.confirm(
      'Deseja apagar esta mensagem para o cliente? (Ela continuará visível e riscada para você)',
      async () => {
        try {
          await deleteMessage(selectedId, msgId);
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true } : m));
          toast.success('Mensagem apagada.');
        } catch (e) { toast.error('Erro ao apagar mensagem'); }
      }
    );
  }

  async function handleSend(e) {
    e?.preventDefault();
    if (!text.trim() && files.length === 0) return;

    // Spell check apenas para mensagens de texto puras (sem arquivos)
    if (text.trim() && files.length === 0 && text.trim().length >= 5) {
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

    if (files.length > 0) {
      const currentFiles = [...files];
      const currentText = text;
      const qId = replyingTo?.externalId;
      setText('');
      setFiles([]);
      setReplyingTo(null);
      
      for (let i = 0; i < currentFiles.length; i++) {
        try {
          // O primeiro arquivo leva o texto como legenda, os outros vão sem
          await sendMediaMessage(selectedId, currentFiles[i], i === 0 ? currentText : '', qId);
          // Pequeno delay para não sobrecarregar o backend/whatsapp
          if (i < currentFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (e) {
          console.error('Erro ao enviar arquivo:', currentFiles[i].name, e);
        }
      }
      loadMessages();
    } else {
      await doSend(text, null);
    }
  }

  async function doSend(body, attachment) {
    const tId = selectedId;
    const qId = replyingTo?.externalId;
    setText('');
    setFiles([]);
    setSpellModal(null);
    setReplyingTo(null);
    try {
      if (attachment) {
        await sendMediaMessage(tId, attachment, body, qId);
      } else {
        await sendMessage(tId, body, qId);
      }
      loadMessages();
    } catch (e) { toast.error('Erro ao enviar mensagem'); }
  }

  async function handleTransfer(agentId, teamId) {
    try {
      await assignTicket(selectedId, agentId, teamId);
      setTransferModal(false);
      setSelectedId(null);
      loadTickets();
      toast.success('Atendimento transferido!');
    } catch (e) { toast.error('Erro ao transferir'); }
  }

  async function handleResolve() {
    toast.confirm('Encerrar este atendimento?', async () => {
      try {
        await resolveTicket(selectedId);
        setSelectedId(null);
        loadTickets();
        toast.success('Atendimento encerrado!');
      } catch (e) { toast.error('Erro ao encerrar'); }
    });
  }

  async function handleReopen() {
    toast.confirm('Reabrir este atendimento?', async () => {
      try {
        const { data } = await reopenTicket(selectedTicket.contactId);
        setSelectedId(data.id);
        loadTickets();
        toast.success('Atendimento reaberto!');
      } catch (e) { toast.error('Erro ao reabrir'); }
    });
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const { data } = await summarizeTicket(selectedId);
      setSummary(data.summary);
    } catch (e) { toast.error('Erro ao gerar resumo IA'); } finally { setSummarizing(false); }
  }

  async function handleSchedule() {
    if (!scheduleData.body || !scheduleData.sendAt) return toast.error('Preencha a mensagem e o horário');
    try {
      const ticket = tickets.find(t => t.id === selectedId);
      await scheduleMessage({ ...scheduleData, contactId: ticket.contactId });
      toast.success('Mensagem agendada com sucesso!');
      setShowScheduling(false);
      setScheduleData({ body: '', sendAt: '' });
    } catch (e) { toast.error('Erro ao agendar'); }
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

  const selectTicket = async (id) => {
    setSelectedId(id);
    if (isMobile) setView('chat');
    
    // Zera o contador localmente para feedback imediato
    setTickets(prev => prev.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
    
    // O backend já zera ao chamar getMessages (que é disparado pelo useEffect do selectedId)
  };

  if (!me) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'var(--bg-surface)',
        color: 'var(--text-muted)',
        gap: '20px'
      }}>
        <div className="loading-spinner" style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid var(--border-color)', 
          borderTop: '4px solid var(--accent)', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Sincronizando Inbox...
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

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
            {['mine', 'pending', 'all'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}>
                {t === 'mine' ? 'Meus' : t === 'pending' ? 'Espera' : 'Contatos'}
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
          {tickets.filter(t => {
            const sQuery = (search || '').toLowerCase();
            const name = (t.contact?.name || '').toLowerCase();
            const phone = t.contact?.phone || '';
            return name.includes(sQuery) || phone.includes(sQuery);
          }).map(t => (
            <div key={t.id} onClick={() => selectTicket(t.id)} style={{ ...s.row, ...(selectedId === t.id ? s.rowActive : {}) }}>
              <Avatar name={t.contact?.name || t.contact?.phone || 'Desconhecido'} src={t.contact?.avatarUrl} size={36} />
              <div style={s.rowInfo}>
                <div style={s.rowTop}>
                  <span style={s.rowName}>{t.contact?.name || t.contact?.phone || 'Desconhecido'}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={s.rowTime}>{fmt(t.updatedAt)}</span>
                  </div>
                </div>
                <div style={s.rowSub}>
                  <span style={{ ...s.dot, background: statusColor(t.status), color: statusColor(t.status) }} />
                  <span style={s.rowMsg}>{t.instance?.instanceName?.split('_').pop().toUpperCase()} · {statusLabel(t.status)}</span>
                  {t.unreadCount > 0 && (
                    <div style={s.unreadBadge}>{t.unreadCount}</div>
                  )}
                </div>
                
                {/* TAGS NA LISTA LATERAL - Mais compactas */}
                {t.contact?.tags && (
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                    {JSON.parse(t.contact.tags).slice(0, 2).map(tag => (
                      <span key={tag} style={{ 
                        fontSize: '0.5rem', 
                        background: 'rgba(212,175,55,0.05)', 
                        color: '#D4AF37', 
                        padding: '1px 5px', 
                        borderRadius: '3px',
                        fontWeight: 700,
                        border: '1px solid rgba(212,175,55,0.1)'
                      }}>
                        {tag}
                      </span>
                    ))}
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
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
          }
        }}
      >
        {selectedTicket ? (
          <>
            <header style={{ ...s.chatHeader, padding: isMobile ? '0.5rem 1rem' : '1rem 2rem' }}>
              {isMobile && <button style={s.backBtn} onClick={() => setView('list')}>❮</button>}
              <Avatar name={selectedTicket.contact?.name || selectedTicket.contact?.phone || 'Desconhecido'} src={selectedTicket.contact?.avatarUrl} size={isMobile ? 32 : 40} />
              <div style={{ ...s.rowInfo, overflow: 'hidden' }}>
                <div style={{ ...s.chatName, fontSize: isMobile ? '0.9rem' : '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedTicket.contact?.name || selectedTicket.contact?.phone || 'Desconhecido'}
                </div>
                {/* Mostra a empresa vinculada no cabeçalho se existir */}
                {!isMobile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ ...s.chatPhone, color: 'var(--accent)', fontWeight: 700 }}>
                      {selectedTicket.contact?.phone}
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
              {loading ? <Empty>Carregando historico...</Empty> : <>
                {hasMoreMessages && (
                  <div style={s.loadMoreWrap}>
                    <button
                      onClick={handleLoadMoreMessages}
                      disabled={loadingMoreMessages}
                      style={{ ...s.loadMoreBtn, opacity: loadingMoreMessages ? 0.7 : 1 }}
                    >
                      {loadingMoreMessages ? 'Carregando...' : 'Carregar mais'}
                    </button>
                  </div>
                )}
                {messages.map((m, i) => {
                if (m._separator) {
                  return (
                    <div key={`sep-${i}`} style={s.separator}>
                      <div style={s.sepLine} />
                      <div style={{ ...s.sepLabel, background: m.isCurrent ? '#D4AF37' : '#333' }}>
                        {m.isCurrent ? 'SESSAO ATUAL' : `SESSAO ANTERIOR (${new Date(m.date).toLocaleDateString()})`}
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
                  } catch (e) { console.error('Erro ao processar payload do evento:', e); }

                  if (m.type === 'ia_summary' && payload?.summary) {
                    return (
                      <div key={m.id} style={s.summaryCard}>
                         <div style={s.summaryHeader}>RESUMO DE CONTEXTO (IA)</div>
                         <div style={s.summaryBody}>{payload.summary}</div>
                      </div>
                    );
                  }

                  const eventLabel = {
                    assigned: 'Assumiu o atendimento',
                    transferred: `Transferiu para ${payload?.teamName || 'outra equipe'}`,
                    resolved: 'Encerrou o atendimento',
                    reopened: 'Reabriu o atendimento',
                    ooo_message: 'Aviso de Fora de Horario Enviado'
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
                          {m.user?.name || 'Sistema'} - {eventLabel} {m.createdAt ? `em ${new Date(m.createdAt).toLocaleDateString('pt-BR')} as ${new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                       </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} style={{ ...s.bubbleWrap, justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      ...s.bubble,
                      background: m.fromMe ? (m.fromBot ? 'var(--bg-msg-ai)' : 'var(--bg-msg-me)') : 'var(--bg-msg-contact)',
                      color: m.fromMe ? (m.fromBot ? 'var(--text-msg-ai)' : 'var(--text-msg-me)') : 'var(--text-msg-contact)',
                      opacity: m.isDeleted ? 0.6 : 1,
                      textDecoration: m.isDeleted ? 'line-through' : 'none',
                      border: m.fromMe ? (m.fromBot ? '1px solid var(--border-msg-ai)' : 'none') : '1px solid var(--border-color)',
                      alignItems: m.fromMe ? 'flex-end' : 'flex-start',
                      borderBottomRightRadius: m.fromMe ? '4px' : '20px',
                      borderBottomLeftRadius: m.fromMe ? '20px' : '4px',
                    }}>
                      {m.fromMe && !m.isDeleted && (
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          style={{ position: 'absolute', top: -10, right: -10, background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Apagar para o cliente"
                        >
                          X
                        </button>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: m.fromMe ? (m.fromBot ? 'var(--text-msg-ai)' : 'rgba(0,0,0,0.5)') : 'var(--accent)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          opacity: m.fromBot ? 0.8 : 1
                        }}>
                          {m.fromMe ? (m.fromBot ? `BOT ${botName}` : (m.agent?.name || 'Voce')) : (selectedTicket.contact?.name || selectedTicket.contact?.phone || 'Cliente')}
                        </div>
                        {!m.isDeleted && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setReplyingTo(m)}
                              style={{ background: 'none', border: 'none', color: m.fromMe ? (m.fromBot ? 'var(--text-msg-ai)' : 'rgba(0,0,0,0.4)') : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}
                              title="Responder"
                            >
                              Resp.
                            </button>
                            <button
                              onClick={() => setForwardingMessage(m)}
                              style={{ background: 'none', border: 'none', color: m.fromMe ? (m.fromBot ? 'var(--text-msg-ai)' : 'rgba(0,0,0,0.4)') : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}
                              title="Encaminhar"
                            >
                              Enc.
                            </button>
                          </div>
                        )}
                      </div>

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
                      {m.body && <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: m.fromMe ? 500 : 400, marginTop: m.mediaUrl ? '8px' : 0 }}>{m.body}</div>}
                      <div style={{ ...s.time, color: m.fromMe ? 'rgba(0,0,0,0.4)' : '#717171' }}>{fmt(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
                {!messages.length && <Empty>Nenhuma mensagem encontrada</Empty>}
              </>}
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
                  <input type="file" id="fileInput" hidden multiple onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                  
                  {!isMobile && (
                    <button style={{ ...s.attachBtn, fontSize: '1.4rem' }} onClick={() => setShowScheduling(!showScheduling)}>📅</button>
                  )}
                  
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {files.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {files.map((f, idx) => (
                          <div key={idx} style={s.filePreview}>
                            📎 {f.name.length > 15 ? f.name.substring(0, 12) + '...' : f.name} 
                            <button onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      background: (isRecording || (!text.trim() && files.length === 0)) ? '#1A1A1B' : '#D4AF37',
                      border: (isRecording || (!text.trim() && files.length === 0)) ? '1px solid #333' : 'none',
                      color: (isRecording || (!text.trim() && files.length === 0)) ? '#717171' : '#000',
                      fontSize: isMobile ? '1.1rem' : '1.2rem'
                    }} 
                    onClick={(!text.trim() && files.length === 0) ? startRecording : handleSend}
                    onMouseDown={(!text.trim() && files.length === 0) ? startRecording : null}
                    onMouseUp={(!text.trim() && files.length === 0) ? stopRecording : null}
                  >
                    {spellChecking ? '⏳' : (!text.trim() && files.length === 0) ? '🎤' : '➤'}
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
          key={(selectedTicket.contact?.id || 'new') + '_' + updateTrigger}
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

      {forwardingMessage && (
        <ForwardModal 
          onClose={() => setForwardingMessage(null)}
          onForward={async (contact) => {
            try {
              await forwardMessage(selectedId, forwardingMessage.id, contact.id);
              toast.success('Mensagem encaminhada!');
              setForwardingMessage(null);
              loadTickets();
            } catch (e) {
              toast.error('Erro ao encaminhar mensagem');
            }
          }}
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
              const res = await api.patch(`/tickets/${selectedTicket.id}/link-contact`, { contactId: targetId });
              loadTickets(); 
              setUpdateTrigger(prev => prev + 1);
              setLinkModal(false);
              toast.success('Cliente vinculado com sucesso!');
            } catch (e) {
              toast.error('Erro ao vincular cliente: ' + (e.response?.data?.error || e.message));
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
  
  // Mídia com falha definitiva — token expirou ou download impossível
  if (!url && m.mediaStatus === 'failed' && m.mediaType && m.mediaType !== 'text') {
    return (
      <div style={{ 
        padding: '0.75rem 1rem', 
        background: 'rgba(255,80,80,0.05)', 
        borderRadius: '8px', 
        border: '1px dashed rgba(255,80,80,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.8rem',
        color: '#ff6b6b'
      }}>
        <span style={{ fontSize: '1rem' }}>🚫</span> Mídia indisponível
      </div>
    );
  }

  // Mídia ainda sendo baixada (pending)
  if (!url && m.mediaType && m.mediaType !== 'text' && (m.mediaType === 'image' || m.mediaType === 'video' || m.mediaType === 'audio' || m.mediaType === 'document' || m.mediaType === 'sticker')) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: 'rgba(212,175,55,0.05)', 
        borderRadius: '8px', 
        border: '1px dashed rgba(212,175,55,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.85rem',
        color: '#D4AF37'
      }}>
        <span style={{ fontSize: '1.2rem' }}>⏳</span> Baixando mídia do WhatsApp...
      </div>
    );
  }

  if (url && m.mediaType === 'image') return <img src={url} alt="" style={s.imgMedia} onClick={() => onImageClick(url)} />;
  if (url && m.mediaType === 'video') return <video src={url} controls style={s.imgMedia} />;
  if (url && m.mediaType === 'audio') return <AudioPlayer src={url} fromMe={m.fromMe} transcription={m.transcription} />;
  if (url && m.mediaType === 'sticker') return <img src={url} alt="" style={{ maxWidth: 150, borderRadius: 8 }} />;
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
  const [city, setCity] = useState(contact.city || '');
  const [state, setState] = useState(contact.state || '');
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
    await updateContact(contact.id, { notes, tags: JSON.stringify(tags), city, state }); 
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
          <h5 style={s.infoLabel}>📍 LOCALIZAÇÃO</h5>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              style={{ ...s.modalInput, flex: 2, padding: '8px 12px', fontSize: '0.85rem', height: 'auto', minHeight: '38px' }} 
              placeholder="Cidade" 
              value={city} 
              onChange={e => setCity(e.target.value)} 
              onBlur={saveContact}
            />
            <input 
              style={{ ...s.modalInput, flex: 1, padding: '8px 12px', fontSize: '0.85rem', height: 'auto', minHeight: '38px' }} 
              placeholder="UF" 
              value={state} 
              maxLength={2}
              onChange={e => setState(e.target.value.toUpperCase())} 
              onBlur={saveContact}
            />
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
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {e.model.toLowerCase().startsWith(e.manufacturer?.toLowerCase()) 
                    ? e.model 
                    : (e.manufacturer ? `${e.manufacturer} ${e.model}` : e.model)}
                </div>
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

function ForwardModal({ onClose, onForward }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getContacts(search).then(r => {
        setContacts(r.data.contacts || r.data || []);
        setLoading(false);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={{ margin: 0 }}>🚀 Encaminhar Mensagem</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#717171', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ padding: '1rem' }}>
          <input 
            style={{ ...s.modalInput, marginBottom: '1rem' }} 
            placeholder="🔍 Buscar contato..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {loading ? <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Carregando...</div> : (
              contacts.map(c => (
                <div key={c.id} onClick={() => onForward(c)} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.2s'
                }} className="hover-item">
                  <Avatar name={c.name} src={c.avatarUrl} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.phone}</div>
                  </div>
                  <div style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 800 }}>SELECIONAR</div>
                </div>
              ))
            )}
            {!loading && contacts.length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Nenhum contato encontrado</div>}
          </div>
        </div>
        <style>{`
          .hover-item:hover { background: rgba(212,175,55,0.08) !important; }
        `}</style>
      </div>
    </div>
  );
}

function Empty({ children }) { return <div style={{ textAlign: 'center', padding: '3rem', color: '#717171' }}>{children}</div>; }
function fmt(d) { const date = new Date(d); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function mergeMessagePages(current, incoming, prepend = false) {
  const items = prepend ? [...incoming, ...current] : [...current, ...incoming];
  const seen = new Set();
  const merged = [];

  for (const item of items) {
    const key = item._separator
      ? `sep:${item.ticketId}:${new Date(item.date).toISOString()}`
      : `${item._type || 'message'}:${item.id}`;

    if (seen.has(key)) continue;

    const previous = merged[merged.length - 1];
    if (item._separator && previous?._separator && previous.ticketId === item.ticketId) {
      continue;
    }

    seen.add(key);
    merged.push(item);
  }

  return merged;
}

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
  layout: { display: 'flex', height: '100%', width: '100%', background: 'var(--bg-base)', color: 'var(--text-main)', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  sidebar: { width: '320px', minWidth: '320px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' },
  tabsWrap: { padding: '1rem 0.75rem', borderBottom: '1px solid var(--border-color)' },
  tabs: { display: 'flex', gap: '4px', background: 'var(--bg-panel)', padding: '4px', borderRadius: '12px' },
  tab: { 
    flex: 1, 
    padding: '0.55rem 0.4rem', 
    border: 'none', 
    background: 'none', 
    cursor: 'pointer', 
    color: 'var(--text-muted)', 
    fontSize: '0.68rem', 
    fontWeight: 800, 
    borderRadius: '8px', 
    transition: 'all 0.2s', 
    textTransform: 'uppercase', 
    letterSpacing: '0.01em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    whiteSpace: 'nowrap'
  },
  tabActive: { background: 'var(--bg-panel-hover)', color: 'var(--accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  badge: { 
    background: 'var(--accent)', 
    color: 'var(--text-inverse)', 
    borderRadius: '6px', 
    padding: '1px 6px', 
    fontSize: '0.6rem', 
    fontWeight: 900,
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  searchWrap: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' },
  search: { flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '0.85rem 1rem', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', transition: 'border-color 0.2s' },
  clearBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px', color: 'var(--text-muted)', padding: '0 1rem', cursor: 'pointer' },
  filterBar: { display: 'flex', gap: '6px' },
  filterSelect: { flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '6px 8px', color: 'var(--text-muted)', fontSize: '0.7rem', outline: 'none', fontWeight: 600 },
  list: { flex: 1, overflowY: 'auto', padding: '0.25rem' },
  row: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.8rem', cursor: 'pointer', borderRadius: '12px', margin: '1px 6px', transition: 'all 0.2s' },
  rowActive: { background: 'var(--accent-light)', boxShadow: 'inset 0 0 0 1px var(--accent-border)' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 },
  rowName: { fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rowTime: { fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600 },
  rowSub: { display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' },
  rowMsg: { fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 400, flex: 1 },
  unreadBadge: { 
    background: '#e53e3e', 
    color: '#fff', 
    borderRadius: '50%', 
    minWidth: '20px', 
    height: '20px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '0.65rem', 
    fontWeight: 900, 
    boxShadow: '0 2px 8px rgba(229, 62, 62, 0.5)',
    border: '1.5px solid var(--bg-surface)'
  },
  dot: { width: 6, height: 6, borderRadius: '50%', boxShadow: '0 0 6px currentColor' },
  miniBadge: { fontSize: '0.6rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' },

  main: { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', position: 'relative', minWidth: 0, overflow: 'hidden' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)', zIndex: 10, width: '100%', boxSizing: 'border-box', minHeight: '72px' },
  chatName: { fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  chatPhone: { fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 },
  headerActions: { marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' },
  aiBtn: { background: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6', border: '1px solid rgba(155, 89, 182, 0.2)', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem', padding: '0.6rem 1rem' },
  transferBtn: { background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem', padding: '0.6rem 1rem' },
  resolveBtn: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem', padding: '0.6rem 1rem', boxShadow: '0 4px 12px var(--accent-light)' },
  infoBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '38px', height: '38px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  messages: { flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' },
  loadMoreWrap: { display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' },
  loadMoreBtn: { background: 'rgba(255,255,255,0.9)', color: '#4a5568', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '999px', padding: '0.55rem 1.15rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' },
  bubbleWrap: { display: 'flex', width: '100%' },
  bubble: { 
    padding: '0.85rem 1.1rem', 
    borderRadius: '20px', 
    maxWidth: 'min(75%, 520px)', 
    fontSize: '0.9rem', 
    display: 'flex', 
    flexDirection: 'column', 
    position: 'relative', 
    boxShadow: 'var(--shadow-sm)',
    lineHeight: 1.5
  },
  time: { fontSize: '0.6rem', marginTop: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 },
  imgMedia: { maxWidth: '320px', maxHeight: '400px', borderRadius: '16px', cursor: 'pointer', objectFit: 'cover', border: '1px solid var(--border-color)' },
  pdfCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--bg-panel)', borderRadius: '14px', textDecoration: 'none', color: 'var(--text-main)', border: '1px solid var(--border-color)', maxWidth: '300px' },
  pdfIcon: { fontSize: '2rem' },
  pdfInfo: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  pdfName: { fontSize: '0.9rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pdfSize: { fontSize: '0.7rem', color: 'var(--text-muted)' },
  transcription: { fontSize: '0.85rem', fontStyle: 'italic', padding: '10px 14px', marginTop: 10, background: 'var(--border-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' },
  
  inputArea: { padding: '1.5rem 2rem', background: 'transparent', width: '100%', boxSizing: 'border-box', position: 'relative' },
  textInput: { flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1rem 1.5rem', color: 'var(--text-main)', outline: 'none', resize: 'none', minHeight: '52px', maxHeight: '150px', fontSize: '1rem', boxShadow: 'var(--shadow-lg)' },
  sendBtn: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', boxShadow: '0 4px 15px var(--accent-light)', transition: 'transform 0.1s' },
  attachBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  filePreview: { fontSize: '0.8rem', color: 'var(--accent)', padding: '8px 16px', background: 'var(--accent-light)', borderRadius: '100px', alignSelf: 'flex-start', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 },
  recordingWrap: { flex: 1, display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(229, 62, 62, 0.1)', padding: '0.75rem 1.5rem', borderRadius: '24px', border: '1px solid rgba(229, 62, 62, 0.2)' },
  recordingDot: { width: 12, height: 12, borderRadius: '50%', background: '#ff4444', animation: 'pulse 1.5s infinite' },
  recordingTime: { color: 'var(--text-main)', fontWeight: 900, fontSize: '1.1rem', fontFamily: 'monospace' },
  stopBtn: { marginLeft: 'auto', background: '#ff4444', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' },
  
  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' },
  emptyIcon: { fontSize: '5rem', marginBottom: '1.5rem', opacity: 0.1 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
  modal: { background: 'var(--bg-surface)', borderRadius: '32px', width: '100%', maxWidth: '440px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalBody: { padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  modalInput: { width: '100%', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1rem', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' },
  saveBtn: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', padding: '1rem', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', fontSize: '1rem' },

  previewImg: { maxWidth: '90vw', maxHeight: '90vh', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' },
  summaryCard: { margin: '0 2rem 1.5rem', background: 'rgba(155, 89, 182, 0.08)', border: '1px solid rgba(155, 89, 182, 0.2)', borderRadius: '20px', padding: '1.5rem' },
  summaryHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 900, color: '#9b59b6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' },
  summaryBody: { fontSize: '0.95rem', color: '#b794f4', lineHeight: '1.6' },
  
  separator: { display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '2.5rem 0' },
  sepLine: { flex: 1, height: '1px', background: 'var(--border-color)' },
  sepLabel: { fontSize: '0.65rem', fontWeight: 900, padding: '6px 16px', borderRadius: '20px', color: 'var(--text-inverse)', background: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  
  infoPanel: { width: '380px', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' },
  infoPanelHeader: { padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoClose: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '8px', borderRadius: '10px', cursor: 'pointer' },
  infoScroll: { flex: 1, overflowY: 'auto', padding: '2.5rem 1.5rem' },
  infoProfile: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '3rem' },
  infoName: { margin: '1.5rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' },
  infoPhone: { color: 'var(--accent)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' },
  infoBadge: { background: 'var(--accent-light)', color: 'var(--accent)', padding: '6px 16px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' },
  infoSection: { marginBottom: '3rem' },
  infoLabel: { fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-dim)', marginBottom: '1.25rem', letterSpacing: '0.15em', textTransform: 'uppercase' },
  tagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  tagItem: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 },
  tagDel: { background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, fontSize: '0.9rem' },
  tagSelect: { background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' },
  priorityGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  priorityBtn: { border: '1px solid', padding: '0.85rem', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' },
  notesArea: { width: '100%', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '1.25rem', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', resize: 'none', minHeight: '120px', lineHeight: 1.5 },
  mediaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  mediaThumb: { width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)' },
  techInfo: { background: 'var(--bg-panel)', borderRadius: '18px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' },
  techRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 },
  transferRow: { display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', cursor: 'pointer', borderRadius: '16px', transition: 'all 0.2s', border: '1px solid transparent' },
  quickList: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '20px', position: 'absolute', bottom: '110px', left: '2rem', right: '2rem', maxHeight: '250px', overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-lg)', padding: '0.5rem' },
  quickItem: { padding: '1.25rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '12px', transition: 'background 0.2s' }
};

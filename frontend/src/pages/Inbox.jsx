import React, { useEffect, useState, useRef, useCallback } from 'react';
import api, {
  getTickets,
  getMessages,
  sendMessage,
  sendMediaMessage,
  assignTicket,
  resolveTicket,
  getMe,
  getUsers,
  getTeams,
  summarizeTicket,
  reopenTicket,
  getQuickResponses,
  scheduleMessage,
  sendAudioMessage,
  deleteMessage,
  getSettings,
  forwardMessage,
  BACKEND_URL,
} from '../services/api';
import { toast } from '../utils/toast';
import { useIsMobile } from '../hooks/useIsMobile';
import CreateOsModal from '../components/CreateOsModal';
import LinkContactModal from '../components/LinkContactModal';
import { ChatHeader, ContactPanel, ForwardModal, MessageComposer, MessageList, TicketSidebar, TransferModal } from './inbox/components';
import { Empty } from './inbox/helpers.jsx';
import { useInboxMessages, useInboxRealtime, useInboxTickets } from './inbox/hooks';

class InboxSectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro desconhecido',
    };
  }

  componentDidCatch(error) {
    console.error(`[inbox] erro no bloco ${this.props.label}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            margin: '1rem 2rem',
            padding: '1rem 1.25rem',
            borderRadius: '18px',
            background: 'rgba(230, 126, 34, 0.08)',
            border: '1px solid rgba(230, 126, 34, 0.2)',
            color: '#e67e22',
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          Nao foi possivel exibir a secao "{this.props.label}" desta conversa, mas o restante da tela continua disponivel.
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.92 }}>
            Erro: {this.state.errorMessage}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Inbox() {
  const MESSAGE_PAGE_SIZE = 60;
  const [selectedId, setSelectedId] = useState(null);
  const [text, setText] = useState('');
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
  const [quickResponses, setQuickResponses] = useState([]);
  const [filteredQuick, setFilteredQuick] = useState([]);
  const [showScheduling, setShowScheduling] = useState(false);
  const [scheduleData, setScheduleData] = useState({ body: '', sendAt: '' });
  const [previewImg, setPreviewImg] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [updateTrigger, setUpdateTrigger] = useState(0); // Forca atualizacao de componentes filhos
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const isMobile = useIsMobile();

  // Volta para a lista quando a janela retorna ao desktop
  useEffect(() => {
    if (!isMobile) setView('list');
  }, [isMobile]);

  const scrollRef = useRef();
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);
  const selectedIdRef = React.useRef(selectedId);

  const {
    counts,
    debouncedLoadTickets,
    filters,
    loadTickets,
    search,
    setFilters,
    setSearch,
    setTab,
    setTickets,
    tab,
    tickets,
    upsertTicket,
  } = useInboxTickets({ me });

  const {
    handleLoadMoreMessages,
    hasMoreMessages,
    loadMessages,
    loading,
    loadingMoreMessages,
    messages,
    setMessages,
  } = useInboxMessages({
    messagePageSize: MESSAGE_PAGE_SIZE,
    scrollRef,
    selectedId,
    selectedIdRef,
    setSummary,
    shouldScrollToBottomRef,
  });

  function normalizeText(value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value == null) return '';

    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

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
        } catch (e) { toast.error('Erro ao enviar audio'); }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (e) { toast.error('Permissao de microfone negada'); }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
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

  function openPreviewImage(url) {
    setPreviewZoom(1);
    setPreviewImg(url);
  }

  function closePreviewImage() {
    setPreviewImg(null);
    setPreviewZoom(1);
  }

  function handlePreviewWheel(event) {
    event.preventDefault();
    setPreviewZoom((previous) => {
      const next = previous + (event.deltaY < 0 ? 0.12 : -0.12);
      return Math.min(4, Math.max(0.6, Number(next.toFixed(2))));
    });
  }

  const [botName, setBotName] = useState('Robo');

  const loadInitial = useCallback(async () => {
    try {
      // getMe e o unico critico para sair do loop de sincronizacao
      const { data: meData } = await getMe();
      setMe(meData);

      // Carrega o restante em paralelo sem bloquear se um falhar
      Promise.all([
        getUsers().then(r => setUsers(r.data || [])).catch(e => console.error('getUsers error:', e)),
        getTeams().then(r => setTeams(r.data || [])).catch(e => console.error('getTeams error:', e)),
        getQuickResponses().then(r => setQuickResponses(r.data || [])).catch(e => console.error('getQuickResponses error:', e)),
        getSettings().then(r => {
          if (r.data?.botName) setBotName(r.data.botName);
        }).catch(e => console.error('getSettings error:', e))
      ]);
    } catch (e) {
      console.error('Erro critico ao carregar perfil:', e);
      // Se nem o getMe funcionar, o interceptor 401 do axios provavelmente vai redirecionar para o login
    }
  }, []);

  useInboxRealtime({
    debouncedLoadTickets,
    loadInitial,
    loadMessages,
    loadTickets,
    selectedIdRef,
    setMessages,
    setTickets,
    shouldScrollToBottomRef,
    upsertTicket,
  });

  async function handleDeleteMessage(msgId) {
    toast.confirm(
      'Deseja apagar esta mensagem para o cliente? (Ela continuara visivel e riscada para voce)',
      async () => {
        try {
          await deleteMessage(selectedId, msgId);
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true } : m));
          toast.success('Mensagem apagada.');
        } catch (e) { toast.error('Erro ao apagar mensagem'); }
      }
    );
  }

  async function handleCopyMessage(message) {
    const parts = [];
    const quotedText = normalizeText(message.quotedMsgBody);
    const bodyText = normalizeText(message.body);
    const transcriptionText = normalizeText(message.transcription);

    if (quotedText) parts.push(`Respondendo: ${quotedText}`);
    if (bodyText) parts.push(bodyText);
    if (transcriptionText) parts.push(`Transcricao: ${transcriptionText}`);
    if (!parts.length) return toast.info('Nada para copiar nesta mensagem');

    try {
      await navigator.clipboard.writeText(parts.join('\n\n'));
      toast.success('Texto copiado');
    } catch (e) {
      toast.error('Nao foi possivel copiar o texto');
    }
  }

  async function handleSend(e) {
    e?.preventDefault();
    if (!text.trim() && files.length === 0) return;


    if (files.length > 0) {
      const currentFiles = [...files];
      const currentText = text;
      const qId = replyingTo?.externalId;
      setText('');
      setFiles([]);
      setReplyingTo(null);
      
      toast.info(`Enviando ${currentFiles.length} anexo(s) em segundo plano...`);
      (async () => {
        for (let i = 0; i < currentFiles.length; i++) {
          try {
            await sendMediaMessage(selectedId, currentFiles[i], i === 0 ? currentText : '', qId);
            if (i < currentFiles.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 350));
            }
          } catch (e) {
            console.error('Erro ao enviar arquivo:', currentFiles[i].name, e);
            toast.error(`Falha ao enviar ${currentFiles[i].name}`);
          }
        }
        await loadMessages();
      })();
      return;
    } else {
      await doSend(text, null);
    }
  }

  async function doSend(body, attachment) {
    const tId = selectedId;
    const qId = replyingTo?.externalId;
    setText('');
    setFiles([]);
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
    if (!scheduleData.body || !scheduleData.sendAt) return toast.error('Preencha a mensagem e o horario');
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
    
    // O backend ja zera ao chamar getMessages pelo useEffect do selectedId
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
      <TicketSidebar
        counts={counts}
        filters={filters}
        isMobile={isMobile}
        search={search}
        selectedId={selectedId}
        selectTicket={selectTicket}
        setFilters={setFilters}
        setSearch={setSearch}
        setTab={setTab}
        styles={s}
        tab={tab}
        teams={teams}
        tickets={tickets}
        users={users}
        view={view}
      />

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
            <InboxSectionErrorBoundary key={`header-${selectedTicket.id}`} label="cabecalho da conversa">
              <ChatHeader
                botName={botName}
                handleReopen={handleReopen}
                handleResolve={handleResolve}
                handleSummarize={handleSummarize}
                isMobile={isMobile}
                selectedTicket={selectedTicket}
                setShowInfo={setShowInfo}
                setShowOsModal={setShowOsModal}
                setTransferModal={setTransferModal}
                setView={setView}
                showInfo={showInfo}
                styles={s}
                summarizing={summarizing}
              />
            </InboxSectionErrorBoundary>

            {summary && (
              <InboxSectionErrorBoundary key={`summary-${selectedTicket.id}`} label="resumo da conversa">
                <div style={s.summaryCard}>
                  <div style={s.summaryHeader}><span>RESUMO DA CONVERSA (IA)</span><button onClick={() => setSummary(null)}>X</button></div>
                  <div style={s.summaryBody}>{normalizeText(summary)}</div>
                </div>
              </InboxSectionErrorBoundary>
            )}

            <InboxSectionErrorBoundary key={`messages-${selectedTicket.id}`} label="historico da conversa">
              <MessageList
                botName={botName}
                handleCopyMessage={handleCopyMessage}
                handleDeleteMessage={handleDeleteMessage}
                handleLoadMoreMessages={handleLoadMoreMessages}
                hasMoreMessages={hasMoreMessages}
                loading={loading}
              loadingMoreMessages={loadingMoreMessages}
              messages={messages}
              onImageClick={openPreviewImage}
              scrollRef={scrollRef}
              selectedTicket={selectedTicket}
              setForwardingMessage={setForwardingMessage}
                setReplyingTo={setReplyingTo}
                styles={s}
              />
            </InboxSectionErrorBoundary>

            <InboxSectionErrorBoundary key={`composer-${selectedTicket.id}`} label="campo de envio">
              <MessageComposer
                files={files}
                filteredQuick={filteredQuick}
                fmtTime={fmtTime}
                handleInput={handleInput}
                handleSend={handleSend}
                isMobile={isMobile}
                isRecording={isRecording}
                recordingTime={recordingTime}
                replyingTo={replyingTo}
                selectedTicket={selectedTicket}
                setFiles={setFiles}
                setFilteredQuick={setFilteredQuick}
                setReplyingTo={setReplyingTo}
                setShowScheduling={setShowScheduling}
                startRecording={startRecording}
                stopRecording={stopRecording}
                styles={s}
                setText={setText}
                text={text}
              />
            </InboxSectionErrorBoundary>
          </>
        ) : (
            <div style={s.emptyChat}>
            <div style={s.emptyIcon}>Chat</div>
            <h2>Central de Atendimento</h2>
            <p>Selecione um chat para comecar a atender</p>
          </div>
        )}
      </main>

      {showInfo && selectedTicket && (
        <InboxSectionErrorBoundary key={`info-${selectedTicket.id}-${updateTrigger}`} label="painel do cliente">
          <ContactPanel 
            key={(selectedTicket.contact?.id || 'new') + '_' + updateTrigger}
            ticket={selectedTicket} 
            onClose={() => setShowInfo(false)} 
            onUpdate={() => { loadTickets(); setUpdateTrigger(prev => prev + 1); }}
            onImageClick={openPreviewImage}
            isMobile={isMobile}
            onLinkCRM={() => setLinkModal(true)}
            styles={s}
          />
        </InboxSectionErrorBoundary>
      )}

      {/* Modais */}
      
      {showScheduling && (
        <div style={s.overlay} onClick={() => setShowScheduling(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}><h3>Agendar Mensagem</h3><button onClick={() => setShowScheduling(false)}>X</button></div>
            <div style={s.modalBody}>
              <textarea style={s.modalInput} placeholder="Texto da mensagem..." value={scheduleData.body} onChange={e => setScheduleData({...scheduleData, body: e.target.value})} />
              <input style={s.modalInput} type="datetime-local" value={scheduleData.sendAt} onChange={e => setScheduleData({...scheduleData, sendAt: e.target.value})} />
              <button style={s.saveBtn} onClick={handleSchedule}>Confirmar Agendamento</button>
            </div>
          </div>
        </div>
      )}

      {previewImg && (
        <div style={s.overlay} onClick={closePreviewImage}>
          <div style={s.previewToolbar} onClick={(event) => event.stopPropagation()}>
            <span style={s.previewHint}>Scroll para zoom</span>
            <button type="button" style={s.previewZoomBtn} onClick={() => setPreviewZoom((previous) => Math.max(0.6, Number((previous - 0.2).toFixed(2))))}>-</button>
            <button type="button" style={s.previewZoomValue} onClick={() => setPreviewZoom(1)}>{Math.round(previewZoom * 100)}%</button>
            <button type="button" style={s.previewZoomBtn} onClick={() => setPreviewZoom((previous) => Math.min(4, Number((previous + 0.2).toFixed(2))))}>+</button>
          </div>
          <div style={s.previewViewport} onWheel={handlePreviewWheel} onClick={(event) => event.stopPropagation()}>
            <img src={previewImg} alt="Preview" style={{ ...s.previewImg, transform: `scale(${previewZoom})` }} />
          </div>
        </div>
      )}


      {transferModal && (
        <TransferModal 
          users={users}
          teams={teams}
          onClose={() => setTransferModal(false)}
          onTransfer={handleTransfer}
          styles={s}
        />
      )}

      {forwardingMessage && (
        <ForwardModal 
          onClose={() => setForwardingMessage(null)}
          styles={s}
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
    lineHeight: 1.5,
    userSelect: 'text',
    WebkitUserSelect: 'text'
  },
  messageText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    userSelect: 'text',
    WebkitUserSelect: 'text'
  },
  time: { fontSize: '0.74rem', marginTop: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.92 },
  imgMedia: { maxWidth: '320px', maxHeight: '400px', borderRadius: '16px', cursor: 'pointer', objectFit: 'cover', border: '1px solid var(--border-color)' },
  pdfCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--bg-panel)', borderRadius: '14px', textDecoration: 'none', color: 'var(--text-main)', border: '1px solid var(--border-color)', maxWidth: '300px' },
  pdfIcon: { fontSize: '2rem' },
  pdfInfo: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  pdfName: { fontSize: '0.9rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pdfSize: { fontSize: '0.7rem', color: 'var(--text-muted)' },
  transcription: { fontSize: '0.85rem', fontStyle: 'italic', padding: '10px 14px', marginTop: 10, background: 'var(--border-light)', borderRadius: '12px', border: '1px solid var(--glass-border)', userSelect: 'text', WebkitUserSelect: 'text' },
  
  inputArea: { padding: '1.5rem 2rem', background: 'transparent', width: '100%', boxSizing: 'border-box', position: 'relative' },
  textInput: { flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1rem 1.5rem', color: 'var(--text-main)', outline: 'none', resize: 'none', minHeight: '52px', maxHeight: '150px', fontSize: '1rem', boxShadow: 'var(--shadow-lg)' },
  sendBtn: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', width: '52px', height: '52px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', boxShadow: '0 4px 15px var(--accent-light)', transition: 'transform 0.1s' },
  attachBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  composerShell: { display: 'flex', flex: 1, minWidth: 0, alignItems: 'stretch', gap: '0.75rem' },
  composerToolbar: { display: 'flex', flexDirection: 'column', gap: '0.6rem', alignSelf: 'flex-end', flexShrink: 0 },
  composerActionBtn: { background: 'rgba(212,175,55,0.1)', color: 'var(--accent)', border: '1px solid rgba(212,175,55,0.22)', minHeight: '44px', padding: '0 1rem', borderRadius: '16px', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap', boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.04)' },
  composerActionBtnMuted: { background: 'var(--bg-panel)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', minHeight: '44px', padding: '0 1rem', borderRadius: '16px', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap' },
  composerInputRow: { display: 'flex', alignItems: 'flex-end', gap: '0.75rem', minWidth: 0 },
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

  previewViewport: { maxWidth: '92vw', maxHeight: '88vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  previewToolbar: { position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(10,10,10,0.72)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.45rem 0.55rem', zIndex: 2, backdropFilter: 'blur(8px)' },
  previewHint: { color: '#fff', fontSize: '0.8rem', fontWeight: 700, padding: '0 0.35rem' },
  previewZoomBtn: { width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 900 },
  previewZoomValue: { minWidth: '58px', height: '34px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, padding: '0 0.75rem' },
  previewImg: { maxWidth: '90vw', maxHeight: '90vh', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', transition: 'transform 0.12s ease-out', transformOrigin: 'center center' },
  summaryCard: { margin: '0 2rem 1.5rem', background: 'rgba(155, 89, 182, 0.08)', border: '1px solid rgba(155, 89, 182, 0.2)', borderRadius: '20px', padding: '1.5rem' },
  summaryHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 900, color: '#9b59b6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' },
  summaryBody: { fontSize: '0.95rem', color: '#b794f4', lineHeight: '1.6' },
  
  separator: { display: 'flex', alignItems: 'center', gap: '1rem', margin: '2.5rem 0' },
  sepLine: { flex: 1, height: '1px', background: 'var(--border-color)' },
  sepLabel: { fontSize: '0.88rem', fontWeight: 900, padding: '10px 18px', borderRadius: '16px', color: 'var(--text-inverse)', background: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' },
  
  infoPanel: { width: '380px', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' },
  infoPanelHeader: { padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoClose: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '8px', borderRadius: '10px', cursor: 'pointer' },
  infoScroll: { flex: 1, overflowY: 'auto', padding: '2.5rem 1.5rem', userSelect: 'text', WebkitUserSelect: 'text' },
  infoProfile: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '3rem' },
  infoName: { margin: '1.5rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' },
  infoPhone: { color: 'var(--accent)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' },
  infoPhoneButton: { background: 'none', border: 'none', cursor: 'pointer', padding: 0, userSelect: 'text', WebkitUserSelect: 'text' },
  infoBadge: { background: 'var(--accent-light)', color: 'var(--accent)', padding: '6px 16px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' },
  infoActionRow: { display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' },
  infoActionBtn: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)', minHeight: '40px', padding: '0 0.95rem', borderRadius: '14px', fontSize: '0.76rem', fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' },
  infoActionBtnPrimary: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', boxShadow: '0 8px 18px rgba(212,175,55,0.18)' },
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

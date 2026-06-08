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
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [updateTrigger, setUpdateTrigger] = useState(0); // Forca atualizacao de componentes filhos
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
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
  const historySearchRef = React.useRef(historySearch);
  const previewDragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

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
      historySearch,
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
        } catch (e) { toast.error('Erro ao enviar áudio: ' + (e.response?.data?.error || e.message)); }
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
  useEffect(() => { historySearchRef.current = historySearch; }, [historySearch]);
  useEffect(() => {
    loadTickets();
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('ticketId');
    if (tId) setSelectedId(tId);
  }, [tab, filters]);

  useEffect(() => {
    if (selectedId) loadMessages();
  }, [selectedId, historySearch]);

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
    setPreviewOffset({ x: 0, y: 0 });
    setPreviewImg(url);
  }

  function closePreviewImage() {
    setPreviewImg(null);
    setPreviewZoom(1);
    setPreviewOffset({ x: 0, y: 0 });
  }

  function handlePreviewWheel(event) {
    event.preventDefault();
    setPreviewZoom((previous) => {
      const next = previous + (event.deltaY < 0 ? 0.12 : -0.12);
      const normalized = Math.min(4, Math.max(0.6, Number(next.toFixed(2))));
      if (normalized <= 1) setPreviewOffset({ x: 0, y: 0 });
      return normalized;
    });
  }

  function handlePreviewPointerDown(event) {
    if (previewZoom <= 1) return;
    event.preventDefault();
    previewDragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: previewOffset.x,
      originY: previewOffset.y,
    };
  }

  function handlePreviewPointerMove(event) {
    if (!previewDragRef.current.active) return;

    const deltaX = event.clientX - previewDragRef.current.startX;
    const deltaY = event.clientY - previewDragRef.current.startY;

    setPreviewOffset({
      x: previewDragRef.current.originX + deltaX,
      y: previewDragRef.current.originY + deltaY,
    });
  }

  function handlePreviewPointerUp() {
    previewDragRef.current.active = false;
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
    historySearchRef,
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
            toast.error(`Falha ao enviar ${currentFiles[i].name}: ` + (e.response?.data?.error || e.message));
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
    } catch (e) { toast.error('Erro ao enviar mensagem: ' + (e.response?.data?.error || e.message)); }
  }

  async function handleTransfer(agentId, teamId) {
    try {
      await assignTicket(selectedId, agentId, teamId);
      setTransferModal(false);
      setSelectedId(null);
      loadTickets();
      toast.success('Atendimento transferido!');
    } catch (e) { toast.error('Erro ao transferir: ' + (e.response?.data?.error || e.message)); }
  }

  async function handleResolve() {
    toast.confirm('Encerrar este atendimento?', async () => {
      try {
        await resolveTicket(selectedId);
        setSelectedId(null);
        loadTickets();
        toast.success('Atendimento encerrado!');
      } catch (e) { toast.error('Erro ao encerrar: ' + (e.response?.data?.error || e.message)); }
    });
  }

  async function handleReopen() {
    toast.confirm('Reabrir este atendimento?', async () => {
      try {
        const { data } = await reopenTicket(selectedTicket.contactId);
        setSelectedId(data.id);
        loadTickets();
        toast.success('Atendimento reaberto!');
      } catch (e) { toast.error('Erro ao reabrir: ' + (e.response?.data?.error || e.message)); }
    });
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const { data } = await summarizeTicket(selectedId);
      setSummary(data.summary);
    } catch (e) { toast.error('Erro ao gerar resumo IA: ' + (e.response?.data?.error || e.message)); } finally { setSummarizing(false); }
  }

  async function handleSchedule() {
    if (!scheduleData.body || !scheduleData.sendAt) return toast.error('Preencha a mensagem e o horario');
    try {
      const ticket = tickets.find(t => t.id === selectedId);
      await scheduleMessage({ ...scheduleData, contactId: ticket.contactId });
      toast.success('Mensagem agendada com sucesso!');
      setShowScheduling(false);
      setScheduleData({ body: '', sendAt: '' });
    } catch (e) { toast.error('Erro ao agendar: ' + (e.response?.data?.error || e.message)); }
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
    if (selectedId !== id && historySearch) {
      setHistorySearch('');
    }
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
                onImageClick={openPreviewImage}
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
                historySearch={historySearch}
                isMobile={isMobile}
                loading={loading}
              loadingMoreMessages={loadingMoreMessages}
              messages={messages}
              onImageClick={openPreviewImage}
              onHistorySearch={setHistorySearch}
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
        <div style={s.overlay}>
          <div style={s.previewToolbar} onClick={(event) => event.stopPropagation()}>
            <span style={s.previewHint}>Scroll para zoom{previewZoom > 1 ? ' e arraste para mover' : ''}</span>
            <button type="button" style={s.previewZoomBtn} onClick={() => {
              setPreviewZoom((previous) => {
                const next = Math.max(0.6, Number((previous - 0.2).toFixed(2)));
                if (next <= 1) setPreviewOffset({ x: 0, y: 0 });
                return next;
              });
            }}>-</button>
            <button type="button" style={s.previewZoomValue} onClick={() => {
              setPreviewZoom(1);
              setPreviewOffset({ x: 0, y: 0 });
            }}>{Math.round(previewZoom * 100)}%</button>
            <button type="button" style={s.previewZoomBtn} onClick={() => setPreviewZoom((previous) => Math.min(4, Number((previous + 0.2).toFixed(2))))}>+</button>
          </div>
          <div
            style={{
              ...s.previewViewport,
              cursor: previewZoom > 1 ? 'grab' : 'zoom-in',
            }}
            onWheel={handlePreviewWheel}
            onMouseDown={handlePreviewPointerDown}
            onMouseMove={handlePreviewPointerMove}
            onMouseUp={handlePreviewPointerUp}
            onMouseLeave={handlePreviewPointerUp}
            onClick={(event) => {
              if (event.target === event.currentTarget) closePreviewImage();
            }}
          >
            <img
              src={previewImg}
              alt="Preview"
              style={{
                ...s.previewImg,
                transform: `translate3d(${previewOffset.x}px, ${previewOffset.y}px, 0) scale(${previewZoom})`,
              }}
            />
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

export const inboxStyles = {
  layout: { display: 'flex', height: '100%', width: '100%', background: 'var(--bg-base)', color: 'var(--text-main)', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  sidebar: { width: '348px', minWidth: '348px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' },
  sidebarHeader: { padding: '1.25rem 1rem 0.9rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  sidebarEyebrow: { fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-dim)', fontWeight: 800, marginBottom: '0.45rem' },
  sidebarTitle: { fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)' },
  sidebarSubtitle: { fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' },
  sidebarCounter: { minWidth: '42px', height: '42px', borderRadius: '14px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontWeight: 800, fontSize: '0.9rem' },
  tabsWrap: { padding: '0.9rem 1rem 0.8rem', borderBottom: '1px solid var(--border-color)' },
  tabs: { display: 'flex', gap: '4px', background: 'var(--bg-panel)', padding: '4px', borderRadius: '14px' },
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
  tabActive: { background: 'var(--bg-surface)', color: 'var(--text-main)', boxShadow: '0 4px 12px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.04)' },
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
  searchWrap: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderBottom: '1px solid var(--border-color)' },
  searchRow: { display: 'flex', gap: '8px', marginBottom: '4px' },
  searchShell: { flex: 1, display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '0 0.95rem' },
  searchIcon: { color: 'var(--text-dim)', flexShrink: 0 },
  search: { flex: 1, background: 'transparent', border: 'none', padding: '0.85rem 0', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', transition: 'border-color 0.2s' },
  clearBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px', color: 'var(--text-muted)', padding: '0 1rem', cursor: 'pointer', fontWeight: 700 },
  filterBar: { display: 'flex', gap: '6px' },
  filterSelect: { flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px 10px', color: 'var(--text-muted)', fontSize: '0.72rem', outline: 'none', fontWeight: 700 },
  list: { flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem 0.75rem' },
  row: { display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.85rem 0.9rem', cursor: 'pointer', borderRadius: '16px', marginBottom: '0.35rem', transition: 'all 0.18s ease', border: '1px solid transparent' },
  rowActive: { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', boxShadow: '0 10px 24px rgba(0,0,0,0.12)' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', marginBottom: 2 },
  rowName: { fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rowTime: { fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, flexShrink: 0 },
  rowPreview: { fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.45rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rowSub: { display: 'flex', alignItems: 'center', gap: '0.45rem', position: 'relative', flexWrap: 'wrap' },
  rowStatusPill: { display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.22rem 0.55rem', borderRadius: '999px', fontSize: '0.67rem', fontWeight: 800, lineHeight: 1.2 },
  priorityPill: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.22rem 0.55rem', borderRadius: '999px', fontSize: '0.67rem', fontWeight: 800, lineHeight: 1.2 },
  rowMetaLine: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.55rem' },
  rowOwner: { fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rowTags: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' },
  rowTag: { fontSize: '0.62rem', background: 'rgba(212,175,55,0.08)', color: 'var(--accent)', padding: '0.18rem 0.45rem', borderRadius: '999px', fontWeight: 800, border: '1px solid rgba(212,175,55,0.16)' },
  rowMetaSpacer: { display: 'inline-block', minWidth: '1px', minHeight: '1px' },
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

  main: { flex: 1, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 24px 24px, rgba(148,163,184,0.08) 1px, transparent 0) 0 0 / 28px 28px, linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 180px), var(--bg-base)', position: 'relative', minWidth: 0, overflow: 'hidden' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: 'var(--chat-header-bg)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-color)', zIndex: 10, width: '100%', boxSizing: 'border-box', minHeight: '76px' },
  backBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-main)', width: '38px', height: '38px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chatIdentity: { minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  chatTitleRow: { display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flexWrap: 'wrap' },
  chatName: { fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  chatStatusPill: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '26px', padding: '0 0.7rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 },
  chatMetaRow: { display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' },
  chatMetaText: { fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, padding: '0.2rem 0.55rem', background: 'var(--chat-meta-bg)', borderRadius: '999px', border: '1px solid var(--chat-meta-border)' },
  headerActions: { marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 },
  headerGhostBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', minHeight: '40px', padding: '0 0.9rem', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.76rem' },
  headerGhostIconBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  headerMenuPanel: { position: 'absolute', top: 'calc(100% + 0.45rem)', right: 0, minWidth: '220px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '14px', boxShadow: '0 18px 32px rgba(0,0,0,0.24)', padding: '0.4rem', zIndex: 20 },
  headerMenuItem: { width: '100%', border: 'none', background: 'transparent', color: 'var(--text-main)', textAlign: 'left', padding: '0.8rem 0.9rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.55rem' },
  resolveBtn: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem', padding: '0.72rem 1rem', boxShadow: '0 8px 18px rgba(212,175,55,0.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  
  messages: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box' },
  loadMoreWrap: { display: 'flex', justifyContent: 'center', marginBottom: '0.15rem' },
  loadMoreBtn: { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '999px', padding: '0.6rem 1rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.76rem' },
  historySearchSticky: { position: 'sticky', top: '-1.25rem', zIndex: 2, marginBottom: '0.25rem', paddingTop: '1.25rem', background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-base) 78%, rgba(255,255,255,0) 100%)' },
  historySearchWrap: { display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '0.65rem' },
  historySearchField: { flex: '1 1 260px', minWidth: '220px', display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0 0.9rem' },
  historySearchInput: { flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: '0.78rem 0', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem' },
  historySearchBtn: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.78rem 1rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem' },
  historySearchClearBtn: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.78rem 1rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem' },
  historySearchMeta: { fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: 700, marginTop: '0.55rem' },
  bubbleWrap: { display: 'flex', width: '100%' },
  bubble: { 
    padding: '0.85rem 0.95rem', 
    borderRadius: '16px', 
    maxWidth: 'min(78%, 560px)', 
    fontSize: '0.92rem', 
    display: 'flex', 
    flexDirection: 'column', 
    position: 'relative', 
    boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
    lineHeight: 1.55,
    userSelect: 'text',
    WebkitUserSelect: 'text'
  },
  messageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.55rem', width: '100%' },
  messageSender: { fontSize: '0.74rem', fontWeight: 800, letterSpacing: '-0.01em' },
  messageHeaderSide: { display: 'flex', alignItems: 'center', gap: '0.15rem', marginLeft: 'auto', flexShrink: 0 },
  messageHeaderTime: { fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 },
  messageMenuRoot: { position: 'relative' },
  messageMenuTrigger: { width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  messageMenuPanel: { position: 'absolute', top: 'calc(100% + 0.35rem)', right: 0, minWidth: '210px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 14px 28px rgba(0,0,0,0.22)', padding: '0.35rem', zIndex: 5 },
  messageMenuItem: { width: '100%', border: 'none', background: 'transparent', color: 'var(--text-main)', textAlign: 'left', padding: '0.75rem 0.85rem', borderRadius: '9px', cursor: 'pointer', fontSize: '0.92rem', fontWeight: 500 },
  messageMenuItemDanger: { color: '#e86a6a' },
  messageText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    userSelect: 'text',
    WebkitUserSelect: 'text'
  },
  quotedBlock: { padding: '0.5rem 0.7rem', borderRadius: '10px', marginBottom: '0.55rem', fontSize: '0.78rem', fontStyle: 'italic', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  time: { fontSize: '0.74rem', marginTop: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.92 },
  imgMedia: { maxWidth: '320px', maxHeight: '400px', borderRadius: '16px', cursor: 'pointer', objectFit: 'cover', border: '1px solid var(--border-color)' },
  pdfCard: { display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 0.95rem', background: 'rgba(12,12,13,0.92)', borderRadius: '16px', textDecoration: 'none', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', maxWidth: 'min(100%, 290px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)' },
  pdfIcon: { minWidth: '54px', height: '54px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, letterSpacing: '0.08em' },
  pdfInfo: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  pdfName: { fontSize: '0.92rem', fontWeight: 800, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  pdfSize: { fontSize: '0.74rem', color: 'rgba(255,255,255,0.72)', fontWeight: 600, marginTop: '0.15rem' },
  attachmentCard: { width: '100%', maxWidth: '360px', background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(27,43,73,0.16)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(18,32,61,0.08)' },
  attachmentPreviewWrap: { background: '#f7f8fb', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  attachmentPreviewImage: { width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '4px', cursor: 'zoom-in' },
  attachmentFooterBtn: { width: '100%', border: 'none', borderTop: '1px solid rgba(27,43,73,0.12)', background: '#fff', color: '#4d6291', display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.7rem 0.8rem', cursor: 'pointer', fontSize: '0.86rem', textAlign: 'left' },
  attachmentFooterText: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 },
  documentPreview: { minHeight: '170px', background: '#f7f8fb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', padding: '1.25rem' },
  documentPreviewBadge: { minWidth: '84px', minHeight: '84px', borderRadius: '22px', background: '#e9eefb', color: '#526b9f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.06em' },
  documentPreviewLabel: { fontSize: '0.88rem', color: '#7f8ba3', fontWeight: 500, textAlign: 'center' },
  transcription: { fontSize: '0.85rem', fontStyle: 'italic', padding: '10px 14px', marginTop: 10, background: 'var(--border-light)', borderRadius: '12px', border: '1px solid var(--glass-border)', userSelect: 'text', WebkitUserSelect: 'text' },
  
  inputArea: { padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  textInput: { flex: 1, background: 'transparent', border: 'none', borderRadius: '18px', padding: '0.8rem 0', color: 'var(--text-main)', outline: 'none', resize: 'none', minHeight: '52px', maxHeight: '150px', fontSize: '0.97rem', boxShadow: 'none' },
  sendBtn: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', width: '48px', height: '48px', borderRadius: '14px', cursor: 'pointer', fontWeight: 900, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 8px 18px rgba(212,175,55,0.16)', transition: 'transform 0.1s' },
  attachBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '46px', height: '46px', borderRadius: '14px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  composerMetaRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' },
  composerShell: { display: 'flex', flex: 1, minWidth: 0, alignItems: 'flex-end', gap: '0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '0.65rem' },
  composerCenter: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  composerToolbar: { display: 'flex', flexDirection: 'column', gap: '0.6rem', alignSelf: 'flex-end', flexShrink: 0 },
  composerActionBtn: { background: 'rgba(212,175,55,0.1)', color: 'var(--accent)', border: '1px solid rgba(212,175,55,0.22)', minHeight: '44px', padding: '0 1rem', borderRadius: '16px', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap', boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' },
  composerActionBtnMuted: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', minHeight: '36px', padding: '0 0.85rem', borderRadius: '999px', cursor: 'pointer', fontWeight: 800, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' },
  composerHint: { minHeight: '36px', padding: '0 0.8rem', borderRadius: '999px', border: '1px dashed rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.05)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' },
  composerInputRow: { display: 'flex', alignItems: 'flex-end', gap: '0.75rem', minWidth: 0 },
  filePreview: { fontSize: '0.8rem', color: 'var(--accent)', padding: '8px 16px', background: 'var(--accent-light)', borderRadius: '100px', alignSelf: 'flex-start', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 },
  draftAttachmentList: { display: 'flex', flexWrap: 'wrap', gap: '0.6rem' },
  draftAttachmentCard: { display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, maxWidth: '260px', padding: '0.55rem 0.7rem', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' },
  draftAttachmentThumb: { width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 },
  draftAttachmentBadge: { width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212,175,55,0.14)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.08em', flexShrink: 0 },
  draftAttachmentInfo: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.18rem', flex: 1 },
  draftAttachmentName: { fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  draftAttachmentMeta: { fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  draftAttachmentRemove: { width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  replyBanner: { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderLeft: '3px solid var(--accent)', padding: '0.75rem 0.9rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' },
  replyLabel: { fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.08em' },
  replyPreview: { fontSize: '0.84rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  replyDismiss: { background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-dim)', cursor: 'pointer', width: '30px', height: '30px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recordingWrap: { flex: 1, display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(229, 62, 62, 0.08)', padding: '0.85rem 1.1rem', borderRadius: '18px', border: '1px solid rgba(229, 62, 62, 0.16)' },
  recordingDot: { width: 12, height: 12, borderRadius: '50%', background: '#ff4444', animation: 'pulse 1.5s infinite' },
  recordingTime: { color: 'var(--text-main)', fontWeight: 900, fontSize: '1.1rem', fontFamily: 'monospace' },
  stopBtn: { marginLeft: 'auto', background: '#ff4444', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' },
  
  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' },
  emptyIcon: { fontSize: '5rem', marginBottom: '1.5rem', opacity: 0.1 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
  modal: { background: 'var(--bg-surface)', borderRadius: '32px', width: '100%', maxWidth: '440px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalBody: { padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  modalInput: { width: '100%', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1rem', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' },
  saveBtn: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', padding: '1rem', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', fontSize: '1rem' },

  previewViewport: { width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5.5rem 2rem 2rem', boxSizing: 'border-box', touchAction: 'none' },
  previewToolbar: { position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(10,10,10,0.72)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.45rem 0.55rem', zIndex: 2, backdropFilter: 'blur(8px)' },
  previewHint: { color: '#fff', fontSize: '0.8rem', fontWeight: 700, padding: '0 0.35rem' },
  previewZoomBtn: { width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 900 },
  previewZoomValue: { minWidth: '58px', height: '34px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, padding: '0 0.75rem' },
  previewImg: { maxWidth: '92vw', maxHeight: '88vh', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', transition: 'transform 0.12s ease-out', transformOrigin: 'center center', userSelect: 'none', WebkitUserSelect: 'none', display: 'block', willChange: 'transform' },
  summaryCard: { margin: '0 1.5rem 1rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.16)', borderRadius: '18px', padding: '1rem 1.15rem' },
  summaryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', fontWeight: 900, color: '#60a5fa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' },
  summaryBody: { fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.6' },
  
  separator: { display: 'flex', alignItems: 'center', gap: '0.9rem', margin: '1.25rem 0 0.35rem' },
  sepLine: { flex: 1, height: '1px', background: 'var(--border-color)' },
  sepLabel: { fontSize: '0.72rem', fontWeight: 800, padding: '0.4rem 0.8rem', borderRadius: '999px', color: 'var(--text-muted)', background: 'var(--bg-panel)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', border: '1px solid var(--border-color)' },
  eventWrap: { display: 'flex', justifyContent: 'center', margin: '0.15rem 0 0.35rem' },
  eventBadge: { background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '0.55rem 0.9rem', borderRadius: '999px', border: '1px solid var(--border-color)', lineHeight: 1.4, textAlign: 'center', maxWidth: 'min(92%, 760px)' },
  
  infoPanel: { width: '400px', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 32px rgba(0,0,0,0.08)' },
  infoPanelHeader: { padding: '1.2rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
  infoPanelHeaderMain: { minWidth: 0 },
  infoPanelEyebrow: { fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-dim)', fontWeight: 800, marginBottom: '0.35rem' },
  infoPanelTitle: { margin: 0, fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)' },
  infoPanelTabs: { padding: '0.8rem 1rem', display: 'flex', gap: '0.45rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' },
  infoPanelTab: { flex: 1, minHeight: '36px', borderRadius: '12px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem' },
  infoPanelTabActive: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)' },
  infoClose: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoScroll: { flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem 2rem', userSelect: 'text', WebkitUserSelect: 'text' },
  infoProfile: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.75rem' },
  infoName: { margin: '1.5rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' },
  infoPhone: { color: 'var(--accent)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' },
  infoPhoneButton: { background: 'none', border: 'none', cursor: 'pointer', padding: 0, userSelect: 'text', WebkitUserSelect: 'text' },
  infoBadgeRow: { display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' },
  infoBadge: { background: 'var(--accent-light)', color: 'var(--accent)', padding: '6px 14px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid transparent' },
  infoActionRow: { display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' },
  infoActionBtn: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)', minHeight: '40px', padding: '0 0.95rem', borderRadius: '14px', fontSize: '0.76rem', fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' },
  infoActionBtnPrimary: { background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', boxShadow: '0 8px 18px rgba(212,175,55,0.18)' },
  infoSection: { marginBottom: '2rem' },
  infoLabel: { fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-dim)', marginBottom: '1.25rem', letterSpacing: '0.15em', textTransform: 'uppercase' },
  infoSnapshotGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' },
  infoSnapshotCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '0.95rem' },
  infoSnapshotLabel: { display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)', fontWeight: 800, marginBottom: '0.45rem' },
  infoSnapshotValue: { display: 'block', fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 800, lineHeight: 1.35 },
  infoCardList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  infoListCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '0.95rem' },
  infoListTitle: { fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 800, lineHeight: 1.35, marginBottom: '0.3rem' },
  infoListMeta: { fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' },
  infoListSubtle: { fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  infoEmpty: { background: 'var(--bg-panel)', border: '1px dashed var(--border-color)', borderRadius: '14px', padding: '0.95rem', color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' },
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
  quickList: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '18px', position: 'absolute', bottom: '108px', left: '1.5rem', right: '1.5rem', maxHeight: '250px', overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-lg)', padding: '0.45rem' },
  quickItem: { padding: '0.95rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '12px', transition: 'background 0.2s' }
};
const s = inboxStyles;

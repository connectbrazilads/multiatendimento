import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Save, Search, Sparkles, Users } from 'lucide-react';
import { toast } from '../utils/toast';
import io from 'socket.io-client';
import { SOCKET_URL } from '../services/socket';
import { getTags, createTag, updateContact, getContacts, sendCampaign, getQuickResponses } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import ActionButton from '../components/ui/ActionButton';
import SurfaceCard from '../components/ui/SurfaceCard';
import EmptyState from '../components/ui/EmptyState';
import ModalShell from '../components/ui/ModalShell';

export default function Campaigns() {
  const [tag, setTag] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [message, setMessage] = useState('');
  const [delay, setDelay] = useState(5);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ sent: 0, errors: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);

  const [templates, setTemplates] = useState([]);
  const [showSaveTag, setShowSaveTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, { auth: { token } });

    loadTags();
    loadTemplates();

    socket.on('bulk_progress', (data) => {
      setProgress(data);
      if (data.status === 'finished') setStatus('finished');
      else setStatus('processing');
    });

    return () => socket.disconnect();
  }, []);

  async function loadTags() {
    try {
      const { data } = await getTags();
      setAvailableTags(data.map((item) => item.name));
    } catch {
      // erro silencioso
    }
  }

  async function loadTemplates() {
    try {
      const { data } = await getQuickResponses();
      setTemplates(data);
    } catch {
      // erro silencioso
    }
  }

  async function searchContacts(query) {
    setSearch(query);
    if (query.length < 2) return setSearchResults([]);
    const { data } = await getContacts(query);
    setSearchResults(data);
  }

  function addContact(contact) {
    if (selectedContacts.find((item) => item.id === contact.id)) return;
    setSelectedContacts([...selectedContacts, contact]);
    setSearch('');
    setSearchResults([]);
  }

  async function handleSaveTag() {
    if (!newTagName) return toast.info('De um nome para a tag');
    try {
      const { data: officialTags } = await getTags();
      let tagExists = officialTags.find((item) => item.name.toLowerCase() === newTagName.toLowerCase());

      if (!tagExists) {
        const { data: createdTag } = await createTag({ name: newTagName, color: '#D4AF37' });
        tagExists = createdTag;
      }

      await Promise.all(
        selectedContacts.map((contact) => {
          let currentTags = [];
          try {
            currentTags = JSON.parse(contact.tags || '[]');
          } catch {
            currentTags = [];
          }

          if (!currentTags.includes(tagExists.name)) {
            return updateContact(contact.id, { tags: [...currentTags, tagExists.name] });
          }
          return Promise.resolve();
        })
      );

      toast.success(`Grupo salvo com sucesso. A etiqueta "${tagExists.name}" foi adicionada a lista oficial.`);
      setShowSaveTag(false);
      setNewTagName('');
      loadTags();
      setTag(tagExists.name);
      setSelectedContacts([]);
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel salvar o grupo. Tente novamente.');
    }
  }

  async function handleStart() {
    if (loading || status === 'processing') return;
    if (!tag && selectedContacts.length === 0) return toast.info('Selecione uma tag ou adicione contatos');
    if (!message) return toast.info('Escreva uma mensagem');

    const audience =
      selectedContacts.length > 0
        ? `${selectedContacts.length} contato${selectedContacts.length > 1 ? 's' : ''} selecionado${selectedContacts.length > 1 ? 's' : ''}`
        : `todos os contatos com a tag "${tag}"`;

    toast.confirm(`Disparar esta campanha agora para ${audience}? As mensagens serao enviadas de imediato e o disparo nao pode ser cancelado.`, async () => {
      setLoading(true);
      try {
        await sendCampaign({
          tag: tag || null,
          contactIds: selectedContacts.length > 0 ? selectedContacts.map((contact) => contact.id) : null,
          message,
          delay: delay * 1000,
        });
        setStatus('processing');
        setProgress({ sent: 0, errors: 0, total: 0 });
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erro ao iniciar o disparo. Tente novamente em instantes.');
      } finally {
        setLoading(false);
      }
    });
  }

  const processed = progress.sent + progress.errors;
  const percentage = progress.total > 0 ? (processed / progress.total) * 100 : 0;

  return (
    <div style={s.container}>
      <PageHeader
        kicker="Automacao comercial"
        title="Disparo em massa"
        subtitle="Envie campanhas para grupos de clientes com mais controle sobre publico, mensagem e progresso."
      />

      <SurfaceCard style={s.card}>
        <div style={s.twoCols}>
          <div>
            <label style={s.label}>Publico por tag</label>
            <select
              style={s.input}
              value={tag}
              onChange={(e) => {
                setTag(e.target.value);
                setSelectedContacts([]);
              }}
              disabled={status === 'processing'}
            >
              <option value="">Selecione uma tag...</option>
              {availableTags.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={s.label}>Adicionar individualmente</label>
            <div style={s.searchBox}>
              <Search size={16} style={s.searchIcon} />
              <input
                style={{ ...s.input, paddingLeft: '2.6rem', marginBottom: 0 }}
                placeholder="Buscar por nome ou numero..."
                value={search}
                onChange={(e) => {
                  searchContacts(e.target.value);
                  setTag('');
                }}
                disabled={status === 'processing'}
              />
              {search.trim().length >= 2 ? (
                <div style={s.results}>
                  {searchResults.length > 0 ? (
                    searchResults.map((contact) => (
                      <div key={contact.id} style={s.resultItem} onClick={() => addContact(contact)}>
                        <div style={s.resultName}>{contact.name}</div>
                        <div style={s.resultPhone}>{contact.phone}</div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title={`Nenhum contato encontrado para "${search}"`}
                      description="Tente buscar por outro nome ou numero de telefone."
                      style={s.searchEmpty}
                    />
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {selectedContacts.length > 0 ? (
          <div style={s.selectedPanel}>
            <div style={s.selectedHeader}>
              <label style={{ ...s.label, marginBottom: 0, fontVariantNumeric: 'tabular-nums' }}>
                Selecionados ({selectedContacts.length})
              </label>
              <ActionButton variant="secondary" size="sm" onClick={() => setShowSaveTag(true)}>
                <Save size={14} />
                Salvar como grupo
              </ActionButton>
            </div>

            <div style={s.chipsWrap}>
              {selectedContacts.map((contact) => (
                <span key={contact.id} style={s.selectedChip}>
                  <span style={s.selectedChipText} title={contact.name || contact.phone}>
                    {contact.name || contact.phone}
                  </span>
                  <button style={s.removeChip} onClick={() => setSelectedContacts(selectedContacts.filter((item) => item.id !== contact.id))}>
                    x
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ marginBottom: '1.2rem' }}>
          <label style={s.label}>Modelo de mensagem (opcional)</label>
          <select style={s.input} onChange={(e) => setMessage(e.target.value)} disabled={status === 'processing'}>
            <option value="">Selecione um modelo pronto...</option>
            {templates.map((template) => {
              const preview = template.message || '';
              return (
                <option key={template.id} value={template.message}>
                  {template.shortcut} - {preview.length > 30 ? `${preview.slice(0, 30)}...` : preview}
                </option>
              );
            })}
          </select>
        </div>

        <label style={s.label}>Mensagem</label>
        <textarea
          style={s.textarea}
          placeholder="Escreva sua mensagem aqui..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === 'processing'}
        />
        <p style={s.hint}>
          Use <b>[nome]</b> para inserir o nome do cliente automaticamente.
        </p>

        <label style={s.label}>Intervalo entre envios (segundos)</label>
        <input
          type="number"
          style={s.input}
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          min="3"
          disabled={status === 'processing'}
        />

        <ActionButton
          onClick={handleStart}
          disabled={status === 'processing'}
          loading={loading}
          style={{ width: '100%', marginTop: '0.4rem' }}
        >
          {status === 'processing' ? <Sparkles size={18} /> : loading ? null : <Megaphone size={18} />}
          {status === 'processing' ? 'Processando disparo...' : loading ? 'Iniciando disparo...' : 'Iniciar disparo agora'}
        </ActionButton>

        {status !== 'idle' ? (
          <div style={s.progressBox}>
            <div style={s.progressHeader}>
              <span style={{ ...s.progressTitle, color: status === 'finished' ? 'var(--success-text)' : 'var(--accent)' }}>
                {status === 'finished' ? 'Disparo concluido' : 'Enviando mensagens...'}
              </span>
              <span style={s.progressCount}>
                {processed} de {progress.total}
              </span>
            </div>

            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${percentage}%` }} />
            </div>

            <div style={s.stats}>
              <span style={{ color: 'var(--success-text)' }}>Enviados: {progress.sent}</span>
              <span style={{ color: 'var(--danger-text)' }}>Falhas: {progress.errors}</span>
            </div>
          </div>
        ) : null}
      </SurfaceCard>

      {showSaveTag ? (
        <ModalShell kicker="Salvar grupo" title="Criar novo grupo de contatos" onClose={() => setShowSaveTag(false)} maxWidth="28rem">
          <div style={s.modalBody}>
            <p style={s.modalText}>De um nome para este grupo de {selectedContacts.length} contatos.</p>
            <label style={s.label}>Nome da tag</label>
            <input style={s.input} placeholder="Ex: CLIENTES_JUNHO" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />

            <div style={s.modalFooter}>
              <ActionButton variant="secondary" onClick={() => setShowSaveTag(false)}>
                Cancelar
              </ActionButton>
              <ActionButton onClick={handleSaveTag}>Salvar grupo</ActionButton>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

const s = {
  container: { padding: 'var(--space-10)', maxWidth: '900px', margin: '0 auto', color: 'var(--text-main)', width: '100%', display: 'block' },
  card: { padding: 'var(--space-8)' },
  label: {
    display: 'block',
    marginBottom: 'var(--space-2)',
    fontSize: 'var(--text-xs)',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '0.95rem 1rem',
    color: 'var(--text-main)',
    marginBottom: '1.2rem',
    fontSize: 'var(--text-md)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    color: 'var(--text-main)',
    marginBottom: 'var(--space-4)',
    fontSize: 'var(--text-md)',
    outline: 'none',
    minHeight: '150px',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    lineHeight: 1.6,
  },
  hint: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 0, marginBottom: '1.2rem' },
  twoCols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', minWidth: 0 },
  searchBox: { position: 'relative', minWidth: 0 },
  searchIcon: { position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', zIndex: 1 },
  results: {
    position: 'absolute',
    top: 'calc(100% - 0.8rem)',
    left: 0,
    right: 0,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    zIndex: 10,
    maxHeight: '220px',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-md)',
  },
  resultItem: { padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' },
  resultName: { fontWeight: 700, color: 'var(--text-main)' },
  resultPhone: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.2rem' },
  searchEmpty: { border: 'none', background: 'transparent', padding: 'var(--space-6) var(--space-4)' },
  selectedPanel: {
    marginBottom: '1.2rem',
    background: 'var(--bg-panel)',
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-lg)',
    border: '1px dashed var(--border-color)',
  },
  selectedHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' },
  chipsWrap: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' },
  selectedChip: {
    display: 'inline-flex',
    alignItems: 'center',
    maxWidth: '100%',
    background: 'var(--accent-light)',
    border: '1px solid var(--accent-border)',
    padding: '0.38rem 0.75rem',
    borderRadius: 'var(--radius-pill)',
    fontSize: 'var(--text-xs)',
    color: 'var(--accent)',
    gap: 'var(--space-2)',
  },
  selectedChipText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '14rem',
  },
  removeChip: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontWeight: 900,
    padding: 0,
    lineHeight: 1,
    flexShrink: 0,
  },
  progressBox: {
    marginTop: '1.8rem',
    padding: '1.4rem',
    background: 'var(--accent-light)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--accent-border)',
  },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' },
  progressTitle: { fontWeight: 800 },
  progressCount: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' },
  progressBar: { height: '8px', background: 'var(--border-color)', borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginTop: 'var(--space-4)' },
  progressFill: { height: '100%', background: 'var(--accent)', transition: 'width 0.3s' },
  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '0.85rem',
    fontSize: 'var(--text-sm)',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  modalBody: { padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  modalText: { margin: 0, color: 'var(--text-muted)', lineHeight: 1.6 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '0.4rem' },
};

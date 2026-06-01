import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Radar, Trash2, Send, CheckSquare, Square, Star,
  Phone, MapPin, Globe, Loader, ExternalLink, XCircle, Image,
} from 'lucide-react';
import { searchLeads, getLeads, deleteLead, deleteAllLeads, sendToLeads, uploadFile } from '../services/api';
import { toast } from '../utils/toast';
import PageHeader from '../components/ui/PageHeader';
import ActionButton from '../components/ui/ActionButton';
import SurfaceCard from '../components/ui/SurfaceCard';
import EmptyState from '../components/ui/EmptyState';
import ModalShell from '../components/ui/ModalShell';

export default function LeadScraper() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [maxResults, setMaxResults] = useState(20);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const [sendImage, setSendImage] = useState(null);
  const [sendImagePreview, setSendImagePreview] = useState('');
  const [sending, setSending] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getLeads(search ? { q: search } : {});
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[leads] erro:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  async function handleSearch() {
    if (!niche.trim()) return toast.error('Informe o nicho/tipo de empresa');
    if (!city.trim()) return toast.error('Informe a cidade');

    setSearching(true);
    try {
      const query = `${niche.trim()} em ${city.trim()}`;
      const { data } = await searchLeads({ query, maxResults });
      toast.success(data.message);
      loadLeads();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro na busca');
    } finally {
      setSearching(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      selected.delete(id);
      setSelected(new Set(selected));
      toast.success('Lead removido');
    } catch (err) {
      toast.error('Erro ao remover');
    }
  }

  async function handleDeleteAll() {
    if (!confirm('Tem certeza que deseja remover TODOS os leads?')) return;
    try {
      await deleteAllLeads();
      setLeads([]);
      setSelected(new Set());
      toast.success('Todos os leads foram removidos');
    } catch (err) {
      toast.error('Erro ao remover');
    }
  }

  function toggleSelect(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === leadsWithPhone.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leadsWithPhone.map((l) => l.id)));
    }
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSendImage(file);
    setSendImagePreview(URL.createObjectURL(file));
  }

  async function handleSend() {
    if (selected.size === 0) return toast.error('Selecione pelo menos um lead');
    if (!sendMessage.trim() && !sendImage) return toast.error('Escreva uma mensagem ou selecione uma imagem');

    setSending(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (sendImage) {
        const uploadRes = await uploadFile(sendImage);
        mediaUrl = uploadRes.data.url;
        mediaType = 'image';
      }

      const { data } = await sendToLeads({
        leadIds: Array.from(selected),
        message: sendMessage.trim(),
        mediaUrl,
        mediaType,
      });

      toast.success(data.message);
      setShowSendModal(false);
      setSendMessage('');
      setSendImage(null);
      setSendImagePreview('');
      setSelected(new Set());
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  const leadsWithPhone = leads.filter((l) => l.phone);
  const filteredLeads = leads;

  return (
    <div style={s.container}>
      <PageHeader
        kicker="Prospecção"
        title="Buscar Leads"
        subtitle={
          leads.length > 0
            ? `${leads.length} leads capturados • ${leadsWithPhone.length} com telefone`
            : 'Encontre novos clientes buscando empresas no Google Maps.'
        }
      />

      {/* SEARCH BAR */}
      <SurfaceCard style={s.searchCard}>
        <div style={s.searchRow}>
          <div style={s.searchField}>
            <label style={s.fieldLabel}>Nicho / Tipo de empresa</label>
            <input
              style={s.input}
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Ex: dentistas, restaurantes, advogados..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div style={s.searchField}>
            <label style={s.fieldLabel}>Cidade</label>
            <input
              style={s.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: São Paulo, Curitiba..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div style={s.searchField}>
            <label style={s.fieldLabel}>Máx. resultados</label>
            <select
              style={s.input}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
          <ActionButton
            onClick={handleSearch}
            disabled={searching}
            style={s.searchBtn}
          >
            {searching ? <Loader size={18} className="spin" /> : <Radar size={18} />}
            {searching ? 'Buscando...' : 'Buscar'}
          </ActionButton>
        </div>
        {searching ? (
          <div style={s.searchingInfo}>
            <Loader size={16} className="spin" />
            <span>Buscando empresas no Google Maps... Isso pode levar até 2 minutos.</span>
          </div>
        ) : null}
      </SurfaceCard>

      {/* TOOLBAR */}
      {leads.length > 0 ? (
        <div style={s.toolbar}>
          <div style={s.toolbarLeft}>
            <div style={s.searchWrap}>
              <Search size={16} style={s.searchIcon} />
              <input
                style={s.filterInput}
                placeholder="Filtrar leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span style={s.selectedCount}>
              {selected.size > 0 ? `${selected.size} selecionados` : ''}
            </span>
          </div>
          <div style={s.toolbarRight}>
            {leadsWithPhone.length > 0 ? (
              <ActionButton variant="secondary" onClick={toggleSelectAll} style={s.toolBtn}>
                {selected.size === leadsWithPhone.length ? <CheckSquare size={16} /> : <Square size={16} />}
                {selected.size === leadsWithPhone.length ? 'Desmarcar' : 'Selecionar todos'}
              </ActionButton>
            ) : null}
            {selected.size > 0 ? (
              <ActionButton onClick={() => setShowSendModal(true)} style={s.toolBtn}>
                <Send size={16} />
                Enviar WhatsApp ({selected.size})
              </ActionButton>
            ) : null}
            <ActionButton variant="secondary" onClick={handleDeleteAll} style={{ ...s.toolBtn, color: '#e53e3e' }}>
              <Trash2 size={16} />
              Limpar tudo
            </ActionButton>
          </div>
        </div>
      ) : null}

      {/* TABLE */}
      {loading ? (
        <div style={s.loadingWrap}>Carregando leads...</div>
      ) : filteredLeads.length > 0 ? (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}></th>
                <th style={s.th}>Nome</th>
                <th style={s.th}>Telefone</th>
                <th style={s.th}>Endereço</th>
                <th style={s.th}>Categoria</th>
                <th style={s.th}>Avaliação</th>
                <th style={s.th}>Website</th>
                <th style={s.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const isSelected = selected.has(lead.id);
                const hasPhone = !!lead.phone;
                return (
                  <tr key={lead.id} style={{ ...s.tr, ...(isSelected ? s.trSelected : {}) }}>
                    <td style={s.td}>
                      {hasPhone ? (
                        <button
                          style={s.checkBtn}
                          onClick={() => toggleSelect(lead.id)}
                        >
                          {isSelected ? <CheckSquare size={18} color="var(--accent)" /> : <Square size={18} />}
                        </button>
                      ) : (
                        <span style={{ opacity: 0.3 }}><Square size={18} /></span>
                      )}
                    </td>
                    <td style={s.td}>
                      <div style={s.leadName}>{lead.name}</div>
                      <div style={s.leadQuery}>{lead.query}</div>
                    </td>
                    <td style={s.td}>
                      {lead.phone ? (
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={s.phoneLink}>
                          <Phone size={14} />
                          {lead.phone}
                        </a>
                      ) : (
                        <span style={s.noData}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      {lead.address ? (
                        <div style={s.addressText}>
                          <MapPin size={14} style={{ flexShrink: 0 }} />
                          <span>{lead.address}</span>
                        </div>
                      ) : (
                        <span style={s.noData}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      {lead.category ? <span style={s.categoryPill}>{lead.category}</span> : <span style={s.noData}>—</span>}
                    </td>
                    <td style={s.td}>
                      {lead.rating ? (
                        <div style={s.ratingWrap}>
                          <Star size={14} fill="#D4AF37" color="#D4AF37" />
                          <span>{lead.rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span style={s.noData}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" style={s.websiteLink}>
                          <Globe size={14} />
                        </a>
                      ) : (
                        <span style={s.noData}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <button style={s.deleteBtn} onClick={() => handleDelete(lead.id)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<Radar size={24} />}
          title="Nenhum lead encontrado"
          description="Use a barra de busca acima para encontrar empresas no Google Maps e capturar leads."
        />
      )}

      {/* SEND MODAL */}
      {showSendModal ? (
        <ModalShell
          kicker="Envio em massa"
          title={`Enviar WhatsApp para ${selected.size} lead(s)`}
          onClose={() => setShowSendModal(false)}
          maxWidth="36rem"
        >
          <div style={s.modalBody}>
            <div style={s.field}>
              <label style={s.fieldLabel}>Mensagem</label>
              <textarea
                style={s.textarea}
                rows={5}
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                placeholder="Escreva a mensagem que será enviada para todos os leads selecionados..."
              />
            </div>

            <div style={s.field}>
              <label style={s.fieldLabel}>Imagem (opcional)</label>
              <div style={s.imageUploadArea}>
                {sendImagePreview ? (
                  <div style={s.imagePreviewWrap}>
                    <img src={sendImagePreview} alt="Preview" style={s.imagePreview} />
                    <button
                      style={s.removeImageBtn}
                      onClick={() => {
                        setSendImage(null);
                        setSendImagePreview('');
                      }}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ) : (
                  <label style={s.imageUploadLabel}>
                    <Image size={20} />
                    Clique para anexar imagem
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <div style={s.modalFooter}>
              <ActionButton variant="secondary" onClick={() => setShowSendModal(false)} style={{ flex: 1 }}>
                Cancelar
              </ActionButton>
              <ActionButton onClick={handleSend} disabled={sending} style={{ flex: 1 }}>
                {sending ? <Loader size={16} className="spin" /> : <Send size={16} />}
                {sending ? 'Enviando...' : `Enviar para ${selected.size} leads`}
              </ActionButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

const s = {
  container: {
    padding: '2.5rem',
    background: 'var(--bg-base)',
    height: '100%',
    overflowY: 'auto',
    flex: 1,
    color: 'var(--text-main)',
  },
  searchCard: {
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  searchRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  searchField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    flex: '1 1 200px',
  },
  fieldLabel: {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
  },
  searchBtn: {
    padding: '0.85rem 1.5rem',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    alignSelf: 'flex-end',
  },
  searchingInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    marginTop: '1rem',
    padding: '0.85rem 1rem',
    background: 'var(--accent-light)',
    borderRadius: '12px',
    fontSize: '0.85rem',
    color: 'var(--accent)',
    fontWeight: 700,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    flexWrap: 'wrap',
  },
  searchWrap: { position: 'relative' },
  searchIcon: {
    position: 'absolute',
    left: '0.85rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-dim)',
  },
  filterInput: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    padding: '0.7rem 1rem 0.7rem 2.5rem',
    borderRadius: '12px',
    color: 'var(--text-main)',
    width: '240px',
    outline: 'none',
    fontSize: '0.88rem',
  },
  selectedCount: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--accent)',
  },
  toolBtn: {
    fontSize: '0.82rem',
    padding: '0.6rem 1rem',
    whiteSpace: 'nowrap',
  },
  loadingWrap: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-muted)',
    fontWeight: 700,
  },
  tableWrap: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-surface)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.85rem 1rem',
    fontWeight: 800,
    fontSize: '0.72rem',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap',
    background: 'var(--bg-panel)',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'background 0.15s ease',
  },
  trSelected: {
    background: 'var(--accent-light)',
  },
  td: {
    padding: '0.75rem 1rem',
    verticalAlign: 'middle',
  },
  checkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '2px',
    display: 'flex',
  },
  leadName: {
    fontWeight: 700,
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '220px',
  },
  leadQuery: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    marginTop: '2px',
    fontStyle: 'italic',
  },
  phoneLink: {
    color: '#48bb78',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    whiteSpace: 'nowrap',
    fontSize: '0.85rem',
  },
  addressText: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.35rem',
    color: 'var(--text-muted)',
    maxWidth: '240px',
    fontSize: '0.82rem',
    lineHeight: 1.4,
  },
  categoryPill: {
    fontSize: '0.7rem',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    padding: '3px 10px',
    borderRadius: '8px',
    fontWeight: 700,
    border: '1px solid var(--accent-border)',
    whiteSpace: 'nowrap',
  },
  ratingWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontWeight: 700,
    color: '#D4AF37',
    fontSize: '0.88rem',
  },
  websiteLink: {
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
  },
  noData: {
    color: 'var(--text-dim)',
    fontSize: '0.82rem',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '8px',
    display: 'flex',
    transition: 'color 0.2s',
  },
  modalBody: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  textarea: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    color: 'var(--text-main)',
    outline: 'none',
    fontSize: '0.95rem',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  imageUploadArea: {
    border: '2px dashed var(--border-color)',
    borderRadius: '12px',
    overflow: 'hidden',
    minHeight: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    padding: '1.5rem',
    color: 'var(--text-muted)',
    fontWeight: 700,
    fontSize: '0.88rem',
  },
  imagePreviewWrap: {
    position: 'relative',
    width: '100%',
  },
  imagePreview: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'cover',
    display: 'block',
  },
  removeImageBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.6)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '50%',
    padding: '4px',
    display: 'flex',
  },
  modalFooter: {
    display: 'flex',
    gap: '0.85rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid var(--border-color)',
    marginTop: '0.5rem',
  },
};

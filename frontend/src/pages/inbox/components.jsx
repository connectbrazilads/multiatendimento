import React, { useEffect, useRef, useState } from 'react';
import api, {
  updateContact,
  getContactMedia,
  updateTicket,
  getTags,
  getMediaUrl,
  getEquipments,
  getContacts,
} from '../../services/api';
import { Download, FileText, Image, Mic, MoreVertical, Paperclip, SendHorizontal, X } from 'lucide-react';
import { toast } from '../../utils/toast';
import { Empty, fmt, statusColor, statusLabel } from './helpers.jsx';

function getSafeTags(rawTags) {
  if (!rawTags) return [];

  try {
    const parsed = JSON.parse(rawTags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getInstanceLabel(ticket) {
  const rawName = getSafeText(ticket?.instance?.instanceName);
  if (!rawName) return 'Sem instancia';

  const parts = rawName.split('_');
  const label = parts[parts.length - 1] || rawName;
  return label.toUpperCase();
}

function getSafeText(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return fallback;

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function getSafeLowerText(value) {
  return getSafeText(value).toLowerCase();
}

function getContactDisplayName(contact, fallback = 'Desconhecido') {
  return getSafeText(contact?.name) || getSafeText(contact?.phone) || fallback;
}

function getContactPhone(contact, fallback = '') {
  return getSafeText(contact?.phone, fallback);
}

async function copyText(text, successMessage = 'Copiado com sucesso') {
  const value = getSafeText(text).trim();
  if (!value) {
    toast.info('Nada para copiar');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error('Nao foi possivel copiar');
  }
}

class MessageRenderErrorBoundary extends React.Component {
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
    console.error('[inbox] erro ao renderizar mensagem:', this.props.messageId, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
          <div
            style={{
              background: 'rgba(230, 126, 34, 0.08)',
              color: '#e67e22',
              fontSize: '0.85rem',
              padding: '10px 14px',
              borderRadius: '14px',
              border: '1px solid rgba(230, 126, 34, 0.2)',
              fontWeight: 700,
              lineHeight: 1.4,
              textAlign: 'center',
              maxWidth: 'min(92%, 640px)',
            }}
          >
            Uma mensagem deste historico nao pode ser exibida, mas a conversa continua disponivel.
            <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', fontWeight: 600, opacity: 0.92 }}>
              {this.state.errorMessage}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function Avatar({ name, src, size = 40 }) {
  const safeName = getSafeText(name, '?');
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = !hasError ? getMediaUrl(src) : '';

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const base = { width: size, height: size, borderRadius: '12px', flexShrink: 0, objectFit: 'cover' };
  if (resolvedSrc) {
    return <img src={resolvedSrc} alt={safeName} style={base} onError={() => setHasError(true)} />;
  }

  const initials = safeName.split(' ').map((item) => item[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div
      style={{
        ...base,
        background: 'rgba(212,175,55,0.1)',
        color: '#D4AF37',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}

function AudioPlayer({ src, fromMe, transcription, styles }) {
  const transcriptionText = getSafeText(transcription);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <audio controls style={{ height: 32, maxWidth: 200, filter: fromMe ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
        <source src={src} type="audio/ogg; codecs=opus" />
        <source src={src} type="audio/mpeg" />
      </audio>
      {transcriptionText ? (
        <div
          style={{
            ...styles.transcription,
            borderLeft: `2px solid ${fromMe ? '#000' : '#D4AF37'}`,
            color: fromMe ? 'rgba(0,0,0,0.6)' : '#A0A0A0',
          }}
        >
          {transcriptionText}
        </div>
      ) : null}
    </div>
  );
}

function getFileExtensionFromMime(type) {
  const fallback = 'bin';
  if (!type) return fallback;

  const mapped = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
  };

  return mapped[type] || type.split('/')[1] || fallback;
}

function ensureDraftFile(file, prefix = 'anexo') {
  if (!(file instanceof File)) return null;
  if (file.name) return file;

  const extension = getFileExtensionFromMime(file.type);
  return new File([file], `${prefix}-${Date.now()}.${extension}`, {
    type: file.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return 'sem tamanho';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getDraftFileMeta(file) {
  const name = getSafeText(file?.name, 'Arquivo');
  const extension = name.includes('.') ? name.split('.').pop().toUpperCase() : 'ARQ';

  if (file?.type?.startsWith('image/')) {
    return { badge: 'IMG', label: 'Imagem' };
  }

  if (extension === 'PDF') {
    return { badge: 'PDF', label: 'Documento PDF' };
  }

  return { badge: extension.slice(0, 3) || 'ARQ', label: 'Documento' };
}

function DraftAttachmentPreview({ file, onRemove, styles }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file?.type?.startsWith('image/')) {
      setPreviewUrl('');
      return undefined;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const meta = getDraftFileMeta(file);

  return (
    <div style={styles.draftAttachmentCard}>
      {previewUrl ? (
        <img src={previewUrl} alt={getSafeText(file?.name, 'Imagem')} style={styles.draftAttachmentThumb} />
      ) : (
        <div style={styles.draftAttachmentBadge}>{meta.badge}</div>
      )}

      <div style={styles.draftAttachmentInfo}>
        <div style={styles.draftAttachmentName}>{getSafeText(file?.name, 'Arquivo')}</div>
        <div style={styles.draftAttachmentMeta}>
          {meta.label} - {formatFileSize(file?.size)}
        </div>
      </div>

      <button type="button" onClick={onRemove} style={styles.draftAttachmentRemove} title="Remover anexo">
        <X size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function triggerMediaDownload(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function MediaContent({ message, onImageClick, styles }) {
  const url = getMediaUrl(message.mediaUrl);
  const fileName = getSafeText(message.fileName, 'Arquivo');

  if (!url && message.mediaStatus === 'failed' && message.mediaType && message.mediaType !== 'text') {
    return (
      <div
        style={{
          padding: '0.75rem 1rem',
          background: 'rgba(255,80,80,0.05)',
          borderRadius: '8px',
          border: '1px dashed rgba(255,80,80,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: '#ff6b6b',
        }}
      >
        <span style={{ fontSize: '1rem' }}>Indisponivel</span> Midia indisponivel
      </div>
    );
  }

  if (!url && message.mediaType && message.mediaType !== 'text' && ['image', 'video', 'audio', 'document', 'sticker'].includes(message.mediaType)) {
    return (
      <div
        style={{
          padding: '1rem',
          background: 'rgba(212,175,55,0.05)',
          borderRadius: '8px',
          border: '1px dashed rgba(212,175,55,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          color: '#D4AF37',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>Baixando</span> Baixando midia do WhatsApp...
      </div>
    );
  }

  if (url && message.mediaType === 'image') {
    return (
      <div style={styles.attachmentCard}>
        <div style={styles.attachmentPreviewWrap}>
          <img src={url} alt={fileName} style={styles.attachmentPreviewImage} onClick={() => onImageClick(url)} />
        </div>
        {message.fileName && (
          <button type="button" style={styles.attachmentFooterBtn} onClick={() => triggerMediaDownload(url)} title="Abrir imagem">
            <Download size={14} strokeWidth={2.2} />
            <span style={styles.attachmentFooterText}>{fileName}</span>
          </button>
        )}
      </div>
    );
  }
  if (url && message.mediaType === 'video') return <video src={url} controls style={styles.imgMedia} />;
  if (url && message.mediaType === 'audio') return <AudioPlayer src={url} fromMe={message.fromMe} transcription={message.transcription} styles={styles} />;
  if (url && message.mediaType === 'sticker') return <img src={url} alt="" style={{ maxWidth: 150, borderRadius: 8 }} />;
  if (url && message.mediaType === 'document') {
    const isPdf = fileName.toLowerCase().endsWith('.pdf');
    const extensionLabel = isPdf ? 'PDF' : (fileName.split('.').pop() || 'DOC').slice(0, 4).toUpperCase();
    return (
      <div style={styles.attachmentCard}>
        <div style={styles.documentPreview}>
          <div style={styles.documentPreviewBadge}>
            <FileText size={22} strokeWidth={2.1} />
            <span>{extensionLabel}</span>
          </div>
          <div style={styles.documentPreviewLabel}>
            {isPdf ? 'Documento PDF' : 'Documento anexado'}
          </div>
        </div>
        <button type="button" style={styles.attachmentFooterBtn} onClick={() => triggerMediaDownload(url)} title="Baixar anexo">
          <Download size={14} strokeWidth={2.2} />
          <span style={styles.attachmentFooterText}>{fileName}</span>
        </button>
      </div>
    );
  }
  return null;
}

export function ContactPanel({ ticket, onClose, onUpdate, onImageClick, isMobile, onLinkCRM, styles }) {
  const contact = ticket.contact;
  const contactName = getContactDisplayName(contact);
  const contactPhone = getContactPhone(contact);
  const [notes, setNotes] = useState(contact.notes || '');
  const [city, setCity] = useState(contact.city || '');
  const [state, setState] = useState(contact.state || '');
  const [priority, setPriority] = useState(ticket.priority || 'medium');
  const [tags, setTags] = useState(() => {
    try {
      return JSON.parse(contact.tags || '[]');
    } catch {
      return [];
    }
  });
  const [media, setMedia] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [linkedCrm, setLinkedCrm] = useState(null);

  useEffect(() => {
    getContactMedia(contact.id).then((response) => setMedia(response.data));
    getTags().then((response) => setAvailableTags(response.data));
    getEquipments(contact.id).then((response) => setEquipments(response.data));
    api
      .get(`/contacts?search=${encodeURIComponent(contactPhone)}`)
      .then((response) => {
        const list = response.data.contacts || response.data || [];
        const crm = list.find((item) => item.id !== contact.id && item.whatsapp === contactPhone);
        setLinkedCrm(crm);
      })
      .catch(() => {});
  }, [contact.id, contactPhone]);

  async function saveContact() {
    await updateContact(contact.id, { notes, tags: JSON.stringify(tags), city, state });
    onUpdate();
  }

  async function handlePriorityChange(nextPriority) {
    setPriority(nextPriority);
    await updateTicket(ticket.id, { priority: nextPriority });
    onUpdate();
  }

  function addTag(tagName) {
    if (!tagName || tags.includes(tagName)) return;
    const updated = [...tags, tagName];
    setTags(updated);
    updateContact(contact.id, { tags: JSON.stringify(updated) }).then(onUpdate);
  }

  function removeTag(tagName) {
    const updated = tags.filter((item) => item !== tagName);
    setTags(updated);
    updateContact(contact.id, { tags: JSON.stringify(updated) }).then(onUpdate);
  }

  function buildContactSnapshot() {
    const location = [city, state].filter(Boolean).join(' - ');
    const equipmentsText = equipments
      .map((equipment) => {
        const manufacturer = getSafeText(equipment.manufacturer);
        const model = getSafeText(equipment.model, 'Equipamento');
        const serial = getSafeText(equipment.serialNumber, 'S/N');
        return `${manufacturer ? `${manufacturer} ` : ''}${model} | Serie: ${serial}`;
      })
      .join('\n');

    return [
      `Cliente: ${contactName}`,
      `Telefone: ${contactPhone}`,
      location ? `Localizacao: ${location}` : '',
      tags.length ? `Etiquetas: ${tags.join(', ')}` : '',
      notes ? `Notas:\n${notes}` : '',
      equipmentsText ? `Equipamentos:\n${equipmentsText}` : '',
    ].filter(Boolean).join('\n\n');
  }

  return (
    <div
      style={{
        ...styles.infoPanel,
        position: isMobile ? 'fixed' : 'relative',
        inset: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : '380px',
        zIndex: isMobile ? 2000 : 1,
        height: '100%',
      }}
    >
      <div style={styles.infoPanelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ficha do cliente</h3>
        </div>
        <button style={styles.infoClose} onClick={onClose}>
          x
        </button>
      </div>
        <div style={styles.infoScroll}>
        <div style={styles.infoProfile}>
          <button
            type="button"
            onClick={() => contact.avatarUrl && onImageClick(getMediaUrl(contact.avatarUrl))}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: contact.avatarUrl ? 'zoom-in' : 'default',
              borderRadius: '20px',
            }}
            title={contact.avatarUrl ? 'Ampliar foto do cliente' : contactName}
          >
            <Avatar name={contactName} src={contact.avatarUrl} size={80} />
          </button>
          <h4 style={styles.infoName}>{contactName}</h4>
          {linkedCrm ? (
            <div style={{ color: '#D4AF37', fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, padding: '6px 16px', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.2)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              CRM {linkedCrm.fantasyName || linkedCrm.name}
            </div>
          ) : contact.fantasyName ? (
            <div style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, padding: '4px 12px', background: 'rgba(212,175,55,0.1)', borderRadius: '8px', display: 'inline-block' }}>
              CRM {contact.fantasyName}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => copyText(contactPhone, 'Telefone copiado')}
            style={{ ...styles.infoPhone, ...styles.infoPhoneButton }}
            title="Copiar telefone"
          >
            {contactPhone}
          </button>
          <div style={styles.infoActionRow}>
            <button type="button" onClick={() => copyText(contactName, 'Nome copiado')} style={styles.infoActionBtn}>
              Copiar nome
            </button>
            <button type="button" onClick={() => copyText(buildContactSnapshot(), 'Ficha copiada')} style={styles.infoActionBtn}>
              Copiar ficha
            </button>
            <button onClick={onLinkCRM} style={{ ...styles.infoActionBtn, ...styles.infoActionBtnPrimary }}>
              Vincular CRM
            </button>
          </div>
        </div>
        <div style={styles.infoSection}>
          <h5 style={styles.infoLabel}>Etiquetas</h5>
          <div style={styles.tagContainer}>
            {tags.map((tag) => (
              <span key={tag} style={styles.tagItem}>
                {tag} <button onClick={() => removeTag(tag)} style={styles.tagDel}>x</button>
              </span>
            ))}
            <select style={styles.tagSelect} value="" onChange={(e) => addTag(e.target.value)}>
              <option value="">+ Tag</option>
              {availableTags.filter((tag) => !tags.includes(tag.name)).map((tag) => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={styles.infoSection}>
          <h5 style={styles.infoLabel}>Localizacao</h5>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input style={{ ...styles.modalInput, flex: 2, padding: '8px 12px', fontSize: '0.85rem', height: 'auto', minHeight: '38px' }} placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} onBlur={saveContact} />
            <input style={{ ...styles.modalInput, flex: 1, padding: '8px 12px', fontSize: '0.85rem', height: 'auto', minHeight: '38px' }} placeholder="UF" value={state} maxLength={2} onChange={(e) => setState(e.target.value.toUpperCase())} onBlur={saveContact} />
          </div>
        </div>
        <div style={styles.infoSection}>
          <h5 style={styles.infoLabel}>Prioridade do ticket</h5>
          <div style={styles.priorityGrid}>
            {[{ id: 'urgent', label: 'Urgente', color: '#e53e3e' }, { id: 'high', label: 'Alta', color: '#dd6b20' }, { id: 'medium', label: 'Normal', color: '#d4af37' }, { id: 'low', label: 'Baixa', color: '#3182ce' }].map((priorityOption) => (
              <button key={priorityOption.id} onClick={() => handlePriorityChange(priorityOption.id)} style={{ ...styles.priorityBtn, background: priority === priorityOption.id ? priorityOption.color : 'rgba(255,255,255,0.03)', color: priority === priorityOption.id ? '#000' : '#717171', borderColor: priority === priorityOption.id ? priorityOption.color : '#333' }}>
                {priorityOption.label}
              </button>
            ))}
          </div>
        </div>
        <div style={styles.infoSection}>
          <h5 style={styles.infoLabel}>Notas internas</h5>
          <textarea style={styles.notesArea} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveContact} placeholder="Adicione observacoes sobre este cliente..." />
        </div>
        <div style={styles.infoSection}>
          <h5 style={styles.infoLabel}>Equipamentos</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {equipments.map((equipment) => (
              <div key={equipment.id} style={{ background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, border: '1px solid #333' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {(() => {
                    const manufacturer = getSafeText(equipment.manufacturer);
                    const model = getSafeText(equipment.model, 'Equipamento');
                    return model.toLowerCase().startsWith(manufacturer.toLowerCase()) ? model : (manufacturer ? `${manufacturer} ${model}` : model);
                  })()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>{equipment.type || 'Equipamento'}</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>Serie: {equipment.serialNumber || 'S/N'}</div>
                {equipment.sector ? <div style={{ fontSize: '0.75rem', color: '#888' }}>Setor: {equipment.sector}</div> : null}
              </div>
            ))}
            {equipments.length === 0 ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Nenhum equipamento vinculado</div> : null}
          </div>
        </div>
        <div style={styles.infoSection}>
          <h5 style={styles.infoLabel}>Midias compartilhadas</h5>
          <div style={styles.mediaGrid}>
            {media.filter((item) => item.mediaType === 'image').slice(0, 9).map((item) => (
              <img key={item.id} src={item.mediaUrl} style={styles.mediaThumb} onClick={() => onImageClick(item.mediaUrl)} />
            ))}
            {media.length === 0 ? <div style={{ color: '#444', fontSize: '0.8rem' }}>Nenhuma midia enviada</div> : null}
          </div>
        </div>
        <div style={styles.infoSection}>
          <h5 style={styles.infoLabel}>Detalhes tecnicos</h5>
          <div style={styles.techInfo}>
            <div style={styles.techRow}><span>ID Ticket</span> <span>#{ticket.id}</span></div>
            <div style={styles.techRow}><span>Criado em</span> <span>{new Date(ticket.createdAt).toLocaleDateString()}</span></div>
            <div style={styles.techRow}><span>Atendente</span> <span>{ticket.agent?.name || 'Aguardando'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransferModal({ users, teams, onClose, onTransfer, styles }) {
  const [target, setTarget] = useState('users');
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}><h3>Transferir chat</h3><button onClick={onClose}>X</button></div>
        <div style={styles.tabs}><button onClick={() => setTarget('users')} style={{ ...styles.tab, ...(target === 'users' ? styles.tabActive : {}) }}>Agentes</button><button onClick={() => setTarget('teams')} style={{ ...styles.tab, ...(target === 'teams' ? styles.tabActive : {}) }}>Equipes</button></div>
        <div style={{ padding: '1rem', maxHeight: 300, overflowY: 'auto' }}>
          {target === 'users'
            ? users.map((user) => <div key={user.id} style={styles.transferRow} onClick={() => onTransfer(user.id, null)}><Avatar name={user.name} size={30} />{user.name}</div>)
            : teams.map((team) => <div key={team.id} style={styles.transferRow} onClick={() => onTransfer(null, team.id)}>Equipe: {team.name}</div>)}
        </div>
      </div>
    </div>
  );
}

export function ForwardModal({ onClose, onForward, styles }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getContacts(search).then((response) => {
        setContacts(response.data.contacts || response.data || []);
        setLoading(false);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0 }}>Encaminhar mensagem</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#717171', cursor: 'pointer', fontSize: '1.2rem' }}>x</button>
        </div>
        <div style={{ padding: '1rem' }}>
          <input style={{ ...styles.modalInput, marginBottom: '1rem' }} placeholder="Buscar contato..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {loading ? <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Carregando...</div> : (
              contacts.map((contact) => (
                <div key={contact.id} onClick={() => onForward(contact)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover-item">
                  <Avatar name={contact.name} src={contact.avatarUrl} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.phone}</div>
                  </div>
                  <div style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 800 }}>Selecionar</div>
                </div>
              ))
            )}
            {!loading && contacts.length === 0 ? <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Nenhum contato encontrado</div> : null}
          </div>
        </div>
        <style>{`
          .hover-item:hover { background: rgba(212,175,55,0.08) !important; }
        `}</style>
      </div>
    </div>
  );
}

export function TicketSidebar({
  counts,
  filters,
  isMobile,
  search,
  selectedId,
  selectTicket,
  setFilters,
  setSearch,
  setTab,
  styles,
  tab,
  tickets,
  users,
  teams,
  view,
}) {
  return (
    <aside
      style={{
        ...styles.sidebar,
        display: (isMobile && view === 'chat') ? 'none' : 'flex',
        width: isMobile ? '100%' : styles.sidebar.width,
        minWidth: isMobile ? '100%' : styles.sidebar.minWidth,
      }}
    >
      <div style={styles.tabsWrap}>
        <div style={styles.tabs}>
          {['mine', 'pending', 'all'].map((tabId) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              style={{ ...styles.tab, ...(tab === tabId ? styles.tabActive : {}) }}
            >
              {tabId === 'mine' ? 'Meus' : tabId === 'pending' ? 'Espera' : 'Contatos'}
              {counts[tabId] > 0 && <span style={styles.badge}>{counts[tabId]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.searchWrap}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            style={styles.search}
            placeholder="Pesquisar..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            onClick={() => setFilters({ priority: '', agentId: '', teamId: '' })}
            style={styles.clearBtn}
          >
            Limpar
          </button>
        </div>

        <div style={styles.filterBar}>
          <select
            style={styles.filterSelect}
            value={filters.priority}
            onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
          >
            <option value="">Prioridade</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Normal</option>
            <option value="low">Baixa</option>
          </select>

          <select
            style={styles.filterSelect}
            value={filters.agentId}
            onChange={(event) => setFilters({ ...filters, agentId: event.target.value })}
          >
            <option value="">Atendente</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>

          <select
            style={styles.filterSelect}
            value={filters.teamId}
            onChange={(event) => setFilters({ ...filters, teamId: event.target.value })}
          >
            <option value="">Equipe</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.list}>
        {tickets.filter((ticket) => {
          const query = getSafeLowerText(search);
          const name = getSafeLowerText(ticket.contact?.name);
          const phone = getSafeText(ticket.contact?.phone);
          return name.includes(query) || phone.includes(query);
        }).map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => selectTicket(ticket.id)}
            style={{ ...styles.row, ...(selectedId === ticket.id ? styles.rowActive : {}) }}
          >
            <Avatar
              name={getContactDisplayName(ticket.contact)}
              src={ticket.contact?.avatarUrl}
              size={36}
            />
            <div style={styles.rowInfo}>
              <div style={styles.rowTop}>
                <span style={styles.rowName}>{getContactDisplayName(ticket.contact)}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={styles.rowTime}>{fmt(ticket.updatedAt)}</span>
                </div>
              </div>
              <div style={styles.rowSub}>
                <span style={{ ...styles.dot, background: statusColor(ticket.status), color: statusColor(ticket.status) }} />
                <span style={styles.rowMsg}>
                  {getInstanceLabel(ticket)} - {statusLabel(ticket.status)}
                </span>
                {ticket.unreadCount > 0 && <div style={styles.unreadBadge}>{ticket.unreadCount}</div>}
              </div>

              {getSafeTags(ticket.contact?.tags).length > 0 && (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                  {getSafeTags(ticket.contact?.tags).slice(0, 2).map((tag, tagIndex) => {
                    const safeTag = getSafeText(tag, 'Tag');
                    return (
                    <span
                      key={`${safeTag}-${tagIndex}`}
                      style={{
                        fontSize: '0.5rem',
                        background: 'rgba(212,175,55,0.05)',
                        color: '#D4AF37',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 700,
                        border: '1px solid rgba(212,175,55,0.1)',
                      }}
                    >
                      {safeTag}
                    </span>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {tickets.length === 0 && <Empty>Nenhuma conversa encontrada</Empty>}
      </div>
    </aside>
  );
}

export function ChatHeader({
  botName,
  handleReopen,
  handleResolve,
  handleSummarize,
  isMobile,
  onImageClick,
  selectedTicket,
  setShowInfo,
  setShowOsModal,
  setTransferModal,
  setView,
  showInfo,
  styles,
  summarizing,
}) {
  const contactName = getContactDisplayName(selectedTicket.contact);
  const contactPhone = getContactPhone(selectedTicket.contact);

  return (
    <header style={{ ...styles.chatHeader, padding: isMobile ? '0.5rem 1rem' : '1rem 2rem' }}>
      {isMobile && <button style={styles.backBtn} onClick={() => setView('list')}>{'<'}</button>}
      <button
        type="button"
        onClick={() => selectedTicket.contact?.avatarUrl && onImageClick(getMediaUrl(selectedTicket.contact.avatarUrl))}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: selectedTicket.contact?.avatarUrl ? 'zoom-in' : 'default',
          borderRadius: '12px',
        }}
        title={selectedTicket.contact?.avatarUrl ? 'Ampliar foto do cliente' : contactName}
      >
        <Avatar
          name={contactName}
          src={selectedTicket.contact?.avatarUrl}
          size={isMobile ? 32 : 40}
        />
      </button>
      <div style={{ ...styles.rowInfo, overflow: 'hidden' }}>
        <div
          style={{
            ...styles.chatName,
            fontSize: isMobile ? '0.9rem' : '1.1rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {contactName}
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ ...styles.chatPhone, color: 'var(--accent)', fontWeight: 700 }}>
              {contactPhone}
            </div>
          </div>
        )}
      </div>
      <div style={{ ...styles.headerActions, gap: isMobile ? '4px' : '0.75rem' }}>
        <button
          style={{ ...styles.aiBtn, padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }}
          onClick={() => setShowOsModal(true)}
        >
          {isMobile ? 'OS' : 'Gerar O.S.'}
        </button>
        <button
          style={{ ...styles.aiBtn, padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }}
          onClick={handleSummarize}
          disabled={summarizing}
        >
          {isMobile ? 'IA' : 'Resumo IA'}
        </button>
        {selectedTicket.status !== 'resolved' ? (
          <>
            <button
              style={{ ...styles.transferBtn, padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }}
              onClick={() => setTransferModal(true)}
            >
              {isMobile ? '->' : 'Transferir'}
            </button>
            <button
              style={{ ...styles.resolveBtn, padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }}
              onClick={handleResolve}
            >
              {isMobile ? 'OK' : 'Encerrar'}
            </button>
          </>
        ) : (
          <button
            style={{ ...styles.resolveBtn, background: 'var(--text-muted)', padding: isMobile ? '4px 8px' : '0.5rem 1rem', fontSize: isMobile ? '0.65rem' : '0.75rem' }}
            onClick={handleReopen}
          >
            {isMobile ? 'Re' : 'Reabrir'}
          </button>
        )}
        <button style={styles.infoBtn} onClick={() => setShowInfo(!showInfo)}>
          i
        </button>
      </div>
    </header>
  );
}

export function MessageList({
  botName,
  handleCopyMessage,
  handleDeleteMessage,
  handleLoadMoreMessages,
  hasMoreMessages,
  historySearch,
  loading,
  loadingMoreMessages,
  messages,
  onImageClick,
  onHistorySearch,
  scrollRef,
  selectedTicket,
  setForwardingMessage,
  setReplyingTo,
  styles,
}) {
  const selectedContactName = getContactDisplayName(selectedTicket.contact, 'Cliente');
  const messageItems = Array.isArray(messages) ? messages : [];
  const [draftSearch, setDraftSearch] = useState(historySearch || '');
  const [openMenuId, setOpenMenuId] = useState(null);
  const trimmedHistorySearch = getSafeText(historySearch).trim();

  useEffect(() => {
    setDraftSearch(historySearch || '');
  }, [historySearch, selectedTicket.id]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [selectedTicket.id, messages.length]);

  useEffect(() => {
    function handleWindowClick(event) {
      if (!event.target.closest?.('[data-message-menu-root="true"]')) {
        setOpenMenuId(null);
      }
    }

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  return (
    <div style={styles.messages} ref={scrollRef}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onHistorySearch(draftSearch.trim());
        }}
        style={styles.historySearchWrap}
      >
        <input
          style={styles.historySearchInput}
          placeholder="Buscar no historico desta conversa..."
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
        />
        <button type="submit" style={styles.historySearchBtn}>
          Buscar
        </button>
        {trimmedHistorySearch ? (
          <button
            type="button"
            style={styles.historySearchClearBtn}
            onClick={() => {
              setDraftSearch('');
              onHistorySearch('');
            }}
          >
            Limpar
          </button>
        ) : null}
      </form>

      {trimmedHistorySearch ? (
        <div style={styles.historySearchMeta}>
          Resultados para "{trimmedHistorySearch}"
        </div>
      ) : null}

      {loading ? <Empty>Carregando historico...</Empty> : (
        <>
          {hasMoreMessages && (
            <div style={styles.loadMoreWrap}>
              <button
                onClick={handleLoadMoreMessages}
                disabled={loadingMoreMessages}
                style={{ ...styles.loadMoreBtn, opacity: loadingMoreMessages ? 0.7 : 1 }}
              >
                {loadingMoreMessages ? 'Carregando...' : trimmedHistorySearch ? 'Carregar mais resultados' : 'Carregar mais'}
              </button>
            </div>
          )}
          {messageItems.map((message, index) => {
            const messageKey = getSafeText(message?.id, `msg-${index}`);

            if (!message || typeof message !== 'object') {
              console.error('[inbox] item de historico invalido:', message);
              return (
                <MessageRenderErrorBoundary key={`invalid-${index}`} messageId={`invalid-${index}`}>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                    <div style={{ background: 'rgba(230, 126, 34, 0.08)', color: '#e67e22', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(230, 126, 34, 0.2)', fontWeight: 700 }}>
                      Uma entrada invalida do historico foi ignorada.
                    </div>
                  </div>
                </MessageRenderErrorBoundary>
              );
            }

            try {
              const quotedText = getSafeText(message.quotedMsgBody);
              const bodyText = getSafeText(message.body);
              const messageAgentName = getSafeText(message.agent?.name, 'Voce');
              const messageUserName = getSafeText(message.user?.name, 'Sistema');

              if (message._separator) {
                return (
                  <MessageRenderErrorBoundary key={`sep-${index}`} messageId={message.id || `sep-${index}`}>
                    <div style={styles.separator}>
                      <div style={styles.sepLine} />
                      <div style={{ ...styles.sepLabel, background: message.isCurrent ? '#D4AF37' : '#333' }}>
                        {message.isCurrent ? 'SESSAO ATUAL' : `SESSAO ANTERIOR (${new Date(message.date).toLocaleDateString()})`}
                      </div>
                      <div style={styles.sepLine} />
                    </div>
                  </MessageRenderErrorBoundary>
                );
              }

              if (message._type === 'event') {
                let payload = {};
                try {
                  if (typeof message.payload === 'string') {
                    payload = JSON.parse(message.payload || '{}');
                  } else if (typeof message.payload === 'object' && message.payload !== null) {
                    payload = message.payload;
                  }
                } catch (error) {
                  console.error('Erro ao processar payload do evento:', error);
                }

                const summaryText = getSafeText(payload?.summary);

                if (message.type === 'ia_summary' && summaryText) {
                  return (
                    <MessageRenderErrorBoundary key={messageKey} messageId={message.id}>
                      <div style={styles.summaryCard}>
                        <div style={styles.summaryHeader}>RESUMO DE CONTEXTO (IA)</div>
                        <div style={styles.summaryBody}>{summaryText}</div>
                      </div>
                    </MessageRenderErrorBoundary>
                  );
                }

                const eventLabel = {
                  assigned: 'Assumiu o atendimento',
                  transferred: `Transferiu para ${getSafeText(payload?.teamName, 'outra equipe')}`,
                  resolved: 'Encerrou o atendimento',
                  reopened: 'Reabriu o atendimento',
                  ooo_message: 'Aviso de Fora de Horario Enviado',
                }[message.type] || message.type;

                return (
                  <MessageRenderErrorBoundary key={messageKey} messageId={message.id}>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                      <div
                        style={{
                          background: message.type === 'resolved' ? 'rgba(39, 174, 96, 0.1)' : message.type === 'ooo_message' ? 'rgba(230, 126, 34, 0.1)' : 'rgba(212, 175, 55, 0.05)',
                          color: message.type === 'resolved' ? '#2ecc71' : message.type === 'ooo_message' ? '#e67e22' : '#D4AF37',
                          fontSize: '0.9rem',
                          padding: '12px 18px',
                          borderRadius: '16px',
                          border: `1px solid ${message.type === 'resolved' ? 'rgba(39, 174, 96, 0.2)' : message.type === 'ooo_message' ? 'rgba(230, 126, 34, 0.2)' : 'rgba(212, 175, 55, 0.15)'}`,
                          letterSpacing: '0.01em',
                          fontWeight: 800,
                          lineHeight: 1.45,
                          textAlign: 'center',
                          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                          maxWidth: 'min(92%, 760px)',
                        }}
                      >
                        {messageUserName} - {eventLabel} {message.createdAt ? `em ${new Date(message.createdAt).toLocaleDateString('pt-BR')} as ${new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </div>
                    </div>
                  </MessageRenderErrorBoundary>
                );
              }

              const senderName = message.fromMe ? (message.fromBot ? `BOT ${botName}` : messageAgentName) : selectedContactName;
              const hasCardMedia = Boolean(message.mediaUrl) && ['image', 'document', 'video'].includes(message.mediaType);
              const senderColor = message.fromMe
                ? (hasCardMedia ? '#1b2b49' : (message.fromBot ? 'var(--text-msg-ai)' : 'rgba(74,56,0,0.92)'))
                : (hasCardMedia ? '#1b2b49' : 'var(--text-main)');
              const messageTime = fmt(message.createdAt);
              const canDownload = Boolean(message.mediaUrl);
              const isMenuOpen = openMenuId === messageKey;

              return (
                <MessageRenderErrorBoundary key={messageKey} messageId={message.id}>
                  <div style={{ ...styles.bubbleWrap, justifyContent: message.fromMe ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        ...styles.bubble,
                        background: hasCardMedia ? 'rgba(255,255,255,0.98)' : (message.fromMe ? (message.fromBot ? 'var(--bg-msg-ai)' : 'var(--bg-msg-me)') : 'var(--bg-msg-contact)'),
                        color: hasCardMedia ? '#1b2b49' : (message.fromMe ? (message.fromBot ? 'var(--text-msg-ai)' : 'var(--text-msg-me)') : 'var(--text-msg-contact)'),
                        opacity: message.isDeleted ? 0.6 : 1,
                        textDecoration: message.isDeleted ? 'line-through' : 'none',
                        border: hasCardMedia ? '1px solid rgba(27,43,73,0.16)' : (message.fromMe ? (message.fromBot ? '1px solid var(--border-msg-ai)' : 'none') : '1px solid var(--border-color)'),
                        alignItems: 'flex-start',
                        borderBottomRightRadius: message.fromMe ? '4px' : '20px',
                        borderBottomLeftRadius: message.fromMe ? '20px' : '4px',
                      }}
                    >
                      <div style={styles.messageHeader}>
                        <div
                          style={{
                            ...styles.messageSender,
                            color: senderColor,
                            opacity: message.fromBot ? 0.8 : 1,
                          }}
                        >
                          {senderName}
                        </div>
                        <div style={styles.messageHeaderSide}>
                          <div style={styles.messageHeaderTime}>{messageTime}</div>
                          {!message.isDeleted && (
                            <div style={styles.messageMenuRoot} data-message-menu-root="true">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenMenuId((current) => current === messageKey ? null : messageKey);
                                }}
                                style={styles.messageMenuTrigger}
                                title="Mais acoes"
                              >
                                <MoreVertical size={15} strokeWidth={2.3} />
                              </button>

                              {isMenuOpen && (
                                <div style={styles.messageMenuPanel}>
                                  <button type="button" style={styles.messageMenuItem} onClick={() => { setReplyingTo(message); setOpenMenuId(null); }}>
                                    Responder
                                  </button>
                                  <button type="button" style={styles.messageMenuItem} onClick={() => { setForwardingMessage(message); setOpenMenuId(null); }}>
                                    Encaminhar mensagem
                                  </button>
                                  <button type="button" style={styles.messageMenuItem} onClick={() => { handleCopyMessage(message); setOpenMenuId(null); }}>
                                    Copiar texto
                                  </button>
                                  {canDownload && (
                                    <button type="button" style={styles.messageMenuItem} onClick={() => { triggerMediaDownload(getMediaUrl(message.mediaUrl)); setOpenMenuId(null); }}>
                                      Baixar
                                    </button>
                                  )}
                                  {message.fromMe && (
                                    <button type="button" style={{ ...styles.messageMenuItem, ...styles.messageMenuItemDanger }} onClick={() => { handleDeleteMessage(message.id); setOpenMenuId(null); }}>
                                      Apagar para o cliente
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {quotedText && (
                        <div
                          style={{
                            background: message.fromMe ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)',
                            borderLeft: `3px solid ${message.fromMe ? 'rgba(0,0,0,0.3)' : '#D4AF37'}`,
                            padding: '6px 10px',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            fontSize: '0.8rem',
                            color: message.fromMe ? 'rgba(0,0,0,0.6)' : '#A0A0A0',
                            fontStyle: 'italic',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {quotedText}
                        </div>
                      )}

                      <MediaContent message={message} onImageClick={onImageClick} styles={styles} />
                      {bodyText && <div style={{ ...styles.messageText, fontWeight: message.fromMe ? 500 : 400, marginTop: message.mediaUrl ? '8px' : 0 }}>{bodyText}</div>}
                    </div>
                  </div>
                </MessageRenderErrorBoundary>
              );
            } catch (error) {
              console.error('[inbox] erro ao montar item do historico:', messageKey, error, message);
              return (
                <MessageRenderErrorBoundary key={`failed-${messageKey}`} messageId={messageKey}>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                    <div
                      style={{
                        background: 'rgba(230, 126, 34, 0.08)',
                        color: '#e67e22',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(230, 126, 34, 0.2)',
                        fontWeight: 700,
                        maxWidth: 'min(92%, 640px)',
                        textAlign: 'center',
                      }}
                    >
                      Esta mensagem nao pode ser exibida, mas o restante do historico continua disponivel.
                    </div>
                  </div>
                </MessageRenderErrorBoundary>
              );
            }
          })}
          {!messageItems.length && <Empty>{trimmedHistorySearch ? 'Nenhum resultado encontrado nesta conversa' : 'Nenhuma mensagem encontrada'}</Empty>}
        </>
      )}
    </div>
  );
}

export function MessageComposer({
  files,
  filteredQuick,
  fmtTime,
  handleInput,
  handleSend,
  isMobile,
  isRecording,
  replyingTo,
  selectedTicket,
  setFiles,
  setFilteredQuick,
  setReplyingTo,
  setShowScheduling,
  startRecording,
  stopRecording,
  styles,
  setText,
  text,
  recordingTime,
}) {
  const fileInputRef = useRef(null);

  function appendFiles(incomingFiles, sourceLabel = 'anexos') {
    const normalizedFiles = incomingFiles
      .map((file, index) => ensureDraftFile(file, sourceLabel === 'colagem' ? `imagem-colada-${index + 1}` : 'anexo'))
      .filter(Boolean);

    if (!normalizedFiles.length) return;

    setFiles((previous) => [...previous, ...normalizedFiles]);
  }

  function handleFileSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);
    appendFiles(selectedFiles, 'arquivo');
    event.target.value = '';
  }

  function handlePaste(event) {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageFiles = clipboardItems
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (!imageFiles.length) return;

    event.preventDefault();
    appendFiles(imageFiles, 'colagem');
    toast.success(imageFiles.length === 1 ? 'Imagem colada no envio' : `${imageFiles.length} imagens coladas no envio`);
  }

  return (
    <>
      {filteredQuick.length > 0 && (
        <div style={styles.quickList}>
          {filteredQuick.map((response) => (
            <div key={response.id} style={styles.quickItem} onClick={() => { setText(response.message); setFilteredQuick([]); }}>
              <strong>{response.shortcut}</strong>: {response.message}
            </div>
          ))}
        </div>
      )}

      <div style={{ ...styles.inputArea, padding: isMobile ? '0.75rem' : '1rem', gap: isMobile ? '0.5rem' : '0.75rem', flexDirection: 'column', alignItems: 'stretch' }}>
        {replyingTo && (
          <div
            style={{
              background: 'rgba(212,175,55,0.1)',
              borderLeft: '4px solid #D4AF37',
              padding: '8px 12px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: '#D4AF37', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                Respondendo a {replyingTo.fromMe ? 'voce' : getContactDisplayName(selectedTicket.contact, 'cliente')}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getSafeText(replyingTo.body) || (replyingTo.mediaType ? `[${replyingTo.mediaType}]` : 'Midia')}
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#717171', cursor: 'pointer', fontSize: '1rem', padding: '0 8px' }}>X</button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
          {isRecording ? (
            <div style={styles.recordingWrap}>
              <div style={styles.recordingDot} />
              <span style={styles.recordingTime}>{fmtTime(recordingTime)}</span>
              <button style={styles.stopBtn} onClick={stopRecording}>Parar e Enviar</button>
            </div>
          ) : (
            <div style={styles.composerShell}>
              <div style={styles.composerToolbar}>
                <button type="button" style={styles.composerActionBtn} onClick={() => fileInputRef.current?.click()}>
                  <Paperclip size={15} strokeWidth={2.4} />
                  <span>Anexo</span>
                </button>
                <div style={styles.composerHint}>
                  <Image size={14} strokeWidth={2.2} />
                  <span>Ctrl+V cola imagem</span>
                </div>
                <input ref={fileInputRef} type="file" hidden multiple onChange={handleFileSelection} />
              </div>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {files.length > 0 && (
                  <div style={styles.draftAttachmentList}>
                    {files.map((file, index) => (
                      <DraftAttachmentPreview
                        key={`${getSafeText(file?.name, 'arquivo')}-${index}`}
                        file={file}
                        onRemove={() => setFiles((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                        styles={styles}
                      />
                    ))}
                  </div>
                )}

                <div style={styles.composerInputRow}>
                  <textarea
                    style={{ ...styles.textInput, height: 'auto', minHeight: '48px', maxHeight: '120px', fontSize: isMobile ? '0.85rem' : '1rem' }}
                    rows={1}
                    value={text}
                    onChange={(event) => {
                      handleInput(event.target.value);
                      event.target.style.height = 'auto';
                      event.target.style.height = `${event.target.scrollHeight}px`;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                        event.target.style.height = '48px';
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder={isMobile ? 'Mensagem...' : 'Digite sua mensagem...'}
                    spellCheck={false}
                  />

                  <button
                    style={{
                      ...styles.sendBtn,
                      width: isMobile ? '44px' : '48px',
                      height: isMobile ? '44px' : '48px',
                      background: (isRecording || (!text.trim() && files.length === 0)) ? '#1A1A1B' : '#D4AF37',
                      border: (isRecording || (!text.trim() && files.length === 0)) ? '1px solid #333' : 'none',
                      color: (isRecording || (!text.trim() && files.length === 0)) ? '#717171' : '#000',
                      fontSize: isMobile ? '1rem' : '1.1rem',
                    }}
                    onClick={(!text.trim() && files.length === 0) ? startRecording : handleSend}
                    onMouseDown={(!text.trim() && files.length === 0) ? startRecording : null}
                    onMouseUp={(!text.trim() && files.length === 0) ? stopRecording : null}
                  >
                    {(!text.trim() && files.length === 0) ? <Mic size={18} strokeWidth={2.4} /> : <SendHorizontal size={18} strokeWidth={2.4} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

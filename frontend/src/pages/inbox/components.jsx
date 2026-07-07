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
import {
  ArrowLeft,
  ArrowRightLeft,
  Bot,
  CheckCheck,
  ClipboardList,
  Download,
  FileText,
  Mic,
  MoreVertical,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Search,
  SendHorizontal,
  Sparkles,
  X,
  Lock,
  User,
  Users,
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { Empty, fmt, statusColor, statusLabel } from './helpers.jsx';
import ContactProfileModal from '../../components/ContactProfileModal';

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

function getEquipmentDisplayName(equipment) {
  const manufacturer = getSafeText(equipment?.manufacturer);
  const model = getSafeText(equipment?.model, 'Equipamento');
  return manufacturer && model.toLowerCase().startsWith(manufacturer.toLowerCase())
    ? model
    : manufacturer
      ? `${manufacturer} ${model}`
      : model;
}

function formatTicketTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();
  return isSameDay
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getPriorityMeta(priority) {
  const priorityMap = {
    urgent: {
      label: 'Urgente',
      background: 'var(--danger-light)',
      color: 'var(--danger)',
      border: '1px solid var(--danger-light)',
    },
    high: {
      label: 'Alta',
      background: 'var(--warning-light)',
      color: 'var(--warning)',
      border: '1px solid var(--warning-light)',
    },
    medium: {
      label: 'Normal',
      background: 'var(--accent-light)',
      color: 'var(--accent)',
      border: '1px solid var(--accent-border)',
    },
    low: {
      label: 'Baixa',
      background: 'var(--info-light)',
      color: 'var(--info)',
      border: '1px solid var(--info-border)',
    },
  };

  return priorityMap[priority] || null;
}

function getStatusMeta(status) {
  const statusMap = {
    pending: {
      label: 'Aguardando',
      color: 'var(--warning)',
      background: 'var(--warning-light)',
      border: '1px solid var(--warning-light)',
    },
    open: {
      label: 'Atendimento',
      color: 'var(--success)',
      background: 'var(--success-light)',
      border: '1px solid var(--success-border)',
    },
    resolved: {
      label: 'Resolvido',
      color: 'var(--text-dim)',
      background: 'var(--border-light)',
      border: '1px solid var(--border-color)',
    },
  };
  return statusMap[status] || {
    label: status,
    color: 'var(--text-dim)',
    background: 'var(--border-light)',
    border: '1px solid var(--border-color)',
  };
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
              background: 'var(--warning-light)',
              color: 'var(--warning)',
              fontSize: '0.85rem',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--warning-light)',
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
            color: fromMe ? 'rgba(0,0,0,0.6)' : 'var(--text-muted)',
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
          background: 'var(--danger-light)',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--danger)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: 'var(--danger)',
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '320px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={20} strokeWidth={2.1} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{isPdf ? 'Documento PDF' : 'Arquivo'}</div>
        </div>
        <button type="button" onClick={() => triggerMediaDownload(url)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Baixar">
          <Download size={16} strokeWidth={2.2} />
        </button>
      </div>
    );
  }
  return null;
}

export function ContactPanel({ ticket, onClose, onUpdate, onImageClick, isMobile, onLinkCRM, onUnlinkCRM, styles }) {
  const contact = ticket.contact;
  const contactName = getContactDisplayName(contact);
  const contactPhone = getContactPhone(contact);
  const [notes, setNotes] = useState(contact.notes || '');
  const [city, setCity] = useState(contact.city || '');
  const [state, setState] = useState(contact.state || '');
  const [enableWhatsAppBilling, setEnableWhatsAppBilling] = useState(contact.enableWhatsAppBilling || false);
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
  const [panelTab, setPanelTab] = useState('overview');
  const [profileModal, setProfileModal] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(contact.name || '');
  const statusMeta = getStatusMeta(ticket.status);
  const priorityMeta = getPriorityMeta(priority);

  async function loadPanelContext() {
    try {
      const [mediaResponse, tagsResponse, equipmentResponse] = await Promise.all([
        getContactMedia(contact.id),
        getTags(),
        getEquipments(contact.id),
      ]);

      setMedia(mediaResponse.data || []);
      setAvailableTags(tagsResponse.data || []);
      setEquipments(equipmentResponse.data || []);
    } catch {
      // noop
    }

    setLinkedCrm(contact.crmCustomer || null);
  }

  useEffect(() => {
    loadPanelContext();
  }, [contact.id, contactPhone, contact.crmCustomer]);

  useEffect(() => {
    setPanelTab('overview');
    setIsEditingName(false);
    setNewName(contact.name || '');
    setEnableWhatsAppBilling(contact.enableWhatsAppBilling || false);
  }, [contact.id, contact.name, contact.enableWhatsAppBilling]);

  async function saveContact() {
    await updateContact(contact.id, { notes, tags: JSON.stringify(tags), city, state });
    onUpdate();
  }

  async function handleToggleBilling(val) {
    setEnableWhatsAppBilling(val);
    await updateContact(contact.id, { enableWhatsAppBilling: val });
    onUpdate();
  }

  async function handleSaveName() {
    if (!newName.trim()) {
      setIsEditingName(false);
      return;
    }
    await updateContact(contact.id, { name: newName });
    setIsEditingName(false);
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

  function openProfileModal(targetContact, initialTab = 'dados', initialEquipment = null) {
    if (!targetContact?.id) {
      toast.info('Nenhum cadastro vinculado para abrir');
      return;
    }

    setProfileModal({ contact: targetContact, initialTab, initialEquipment });
  }

  const equipmentOwner = contact;

  const overviewTab = (
    <>
      <div style={{ ...styles.infoSnapshotGrid, gridTemplateColumns: isMobile ? '1fr' : styles.infoSnapshotGrid.gridTemplateColumns }}>
        <div style={styles.infoSnapshotCard}>
          <span style={styles.infoSnapshotLabel}>Responsavel</span>
          <strong style={styles.infoSnapshotValue}>{ticket.agent?.name || ticket.team?.name || 'Aguardando'}</strong>
        </div>
        <div style={styles.infoSnapshotCard}>
          <span style={styles.infoSnapshotLabel}>Canal</span>
          <strong style={styles.infoSnapshotValue}>{getInstanceLabel(ticket)}</strong>
        </div>
        <div style={styles.infoSnapshotCard}>
          <span style={styles.infoSnapshotLabel}>Cidade</span>
          <strong style={styles.infoSnapshotValue}>{city || 'Nao informada'}</strong>
        </div>
        <div style={styles.infoSnapshotCard}>
          <span style={styles.infoSnapshotLabel}>UF</span>
          <strong style={styles.infoSnapshotValue}>{state || '--'}</strong>
        </div>
      </div>

      <div style={{ ...styles.infoSection, marginTop: '1rem', marginBottom: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.01)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
          <input 
            type="checkbox" 
            checked={enableWhatsAppBilling} 
            onChange={(e) => handleToggleBilling(e.target.checked)} 
            style={{ width: '16px', height: '16px', accentColor: '#D4AF37', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700 }}>
            Enviar Faturas no WhatsApp
          </span>
        </label>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '26px', lineHeight: '1.25' }}>
          Habilita o envio automático de boletos e cobranças para este contato via WhatsApp.
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
        <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
          <input style={{ ...styles.modalInput, flex: 2, padding: '8px 12px', fontSize: '0.85rem', height: 'auto', minHeight: '42px' }} placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} onBlur={saveContact} />
          <input style={{ ...styles.modalInput, flex: 1, padding: '8px 12px', fontSize: '0.85rem', height: 'auto', minHeight: '42px' }} placeholder="UF" value={state} maxLength={2} onChange={(e) => setState(e.target.value.toUpperCase())} onBlur={saveContact} />
        </div>
      </div>

      <div style={styles.infoSection}>
        <h5 style={styles.infoLabel}>Prioridade do ticket</h5>
        <div style={styles.priorityGrid}>
          {[
            { id: 'urgent', label: 'Urgente', color: 'var(--danger)' },
            { id: 'high', label: 'Alta', color: 'var(--warning)' },
            { id: 'medium', label: 'Normal', color: 'var(--accent)' },
            { id: 'low', label: 'Baixa', color: 'var(--info)' }
          ].map((priorityOption) => (
            <button key={priorityOption.id} onClick={() => handlePriorityChange(priorityOption.id)} style={{ ...styles.priorityBtn, background: priority === priorityOption.id ? priorityOption.color : 'var(--bg-panel)', color: priority === priorityOption.id ? 'var(--text-inverse)' : 'var(--text-muted)', borderColor: priority === priorityOption.id ? priorityOption.color : 'var(--border-color)' }}>
              {priorityOption.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.infoSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <h5 style={{ ...styles.infoLabel, marginBottom: 0 }}>Equipamentos</h5>
          <button
            type="button"
            onClick={() => openProfileModal(equipmentOwner, 'equipamentos')}
            style={{
              ...styles.infoActionBtn,
              minHeight: '34px',
              padding: '0 0.8rem',
              fontSize: '0.7rem',
            }}
          >
            Adicionar
          </button>
        </div>
        <div style={styles.infoCardList}>
          {equipments.map((equipment) => (
            <div key={equipment.id} style={styles.infoListCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.infoListTitle}>{getEquipmentDisplayName(equipment)}</div>
                  <div style={styles.infoListMeta}>{equipment.type || 'Equipamento'}</div>
                  <div style={styles.infoListSubtle}>Serie: {equipment.serialNumber || 'S/N'}</div>
                  {equipment.sector ? <div style={styles.infoListSubtle}>Setor: {equipment.sector}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={() => openProfileModal(equipmentOwner, 'equipamentos', equipment)}
                  style={{
                    ...styles.infoActionBtn,
                    minHeight: '32px',
                    padding: '0 0.7rem',
                    fontSize: '0.68rem',
                    flexShrink: 0,
                  }}
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
          {equipments.length === 0 ? <div style={styles.infoEmpty}>Nenhum equipamento vinculado</div> : null}
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
    </>
  );

  const notesTab = (
    <>
      <div style={styles.infoSection}>
        <h5 style={styles.infoLabel}>Notas internas</h5>
        <textarea style={{ ...styles.notesArea, minHeight: isMobile ? '200px' : '240px' }} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveContact} placeholder="Adicione observacoes sobre este cliente..." />
      </div>

      <div style={styles.infoSection}>
        <h5 style={styles.infoLabel}>Resumo rapido</h5>
        <div style={styles.infoCardList}>
          <div style={styles.infoListCard}>
            <div style={styles.infoListTitle}>Ficha resumida</div>
            <div style={styles.infoListSubtle}>{buildContactSnapshot() || 'Nenhuma informacao adicional.'}</div>
          </div>
        </div>
      </div>
    </>
  );

  const mediaTab = (
    <>
      <div style={styles.infoSection}>
        <h5 style={styles.infoLabel}>Fotos e Videos</h5>
        <div style={{ ...styles.mediaGrid, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : styles.mediaGrid.gridTemplateColumns }}>
          {media.filter((item) => item.mediaType === 'image' || item.mediaType === 'video').slice(0, 12).map((item) => (
            item.mediaType === 'image' ? (
              <img key={item.id} src={getMediaUrl(item.mediaUrl)} style={styles.mediaThumb} onClick={() => onImageClick(getMediaUrl(item.mediaUrl))} />
            ) : (
              <video key={item.id} src={getMediaUrl(item.mediaUrl)} style={{...styles.mediaThumb, background: '#000'}} controls={false} onClick={() => triggerMediaDownload(getMediaUrl(item.mediaUrl))} />
            )
          ))}
        </div>
        {media.filter((item) => item.mediaType === 'image' || item.mediaType === 'video').length === 0 ? <div style={styles.infoEmpty}>Nenhuma imagem ou video</div> : null}
      </div>

      <div style={styles.infoSection}>
        <h5 style={styles.infoLabel}>Documentos e Arquivos</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {media.filter((item) => item.mediaType === 'document' || item.mediaType === 'audio').map((item) => {
            const docName = getSafeText(item.body || item.mediaUrl.split('/').pop(), item.mediaType === 'audio' ? 'Áudio' : 'Documento');
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
                  {item.mediaType === 'audio' ? <Mic size={16} /> : <FileText size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docName}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <button type="button" onClick={() => triggerMediaDownload(getMediaUrl(item.mediaUrl))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Download size={16} />
                </button>
              </div>
            );
          })}
        </div>
        {media.filter((item) => item.mediaType === 'document' || item.mediaType === 'audio').length === 0 ? <div style={styles.infoEmpty}>Nenhum documento enviado</div> : null}
      </div>

      <div style={styles.infoSection}>
        <h5 style={styles.infoLabel}>Arquivos e contexto</h5>
        <div style={styles.infoCardList}>
          <div style={styles.infoListCard}>
            <div style={styles.infoListTitle}>Contato</div>
            <div style={styles.infoListSubtle}>{contactName}</div>
          </div>
          <div style={styles.infoListCard}>
            <div style={styles.infoListTitle}>Telefone</div>
            <div style={styles.infoListSubtle}>{contactPhone || 'Nao informado'}</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      className="animate-slide-in-right"
      style={{
        ...styles.infoPanel,
        position: isMobile ? 'fixed' : 'relative',
        inset: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : styles.infoPanel.width,
        zIndex: isMobile ? 2000 : profileModal ? 2500 : 1,
        height: '100%',
      }}
    >
      <div style={styles.infoPanelHeader}>
        <div style={styles.infoPanelHeaderMain}>
          <div style={styles.infoPanelEyebrow}>Cliente</div>
          <h3 style={styles.infoPanelTitle}>Ficha do contato</h3>
        </div>
        <button style={styles.infoClose} onClick={onClose}>
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>

      <div style={styles.infoPanelTabs}>
        {[
          { id: 'overview', label: 'Resumo' },
          { id: 'notes', label: 'Notas' },
          { id: 'media', label: 'Midias' },
        ].map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setPanelTab(tabItem.id)}
            style={{
              ...styles.infoPanelTab,
              ...(panelTab === tabItem.id ? styles.infoPanelTabActive : {}),
            }}
          >
            {tabItem.label}
          </button>
        ))}
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
          {isEditingName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, width: '100%', padding: '0 10px' }}>
              <input 
                style={{ ...styles.modalInput, flex: 1, margin: 0, padding: '8px', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                placeholder="Nome do cliente"
              />
              <button 
                onClick={handleSaveName} 
                style={{ ...styles.infoActionBtn, padding: '8px 16px', minHeight: 0, height: 'auto', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', fontWeight: 700 }}
              >
                Salvar
              </button>
            </div>
          ) : (
            <h4 style={{ ...styles.infoName, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => { setIsEditingName(true); setNewName(contact.name || ''); }} title="Clique para editar o nome">
              {contactName}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </h4>
          )}
          {linkedCrm ? (
            <button
              type="button"
              onClick={() => window.location.assign('/crm')}
              style={{ color: '#D4AF37', fontSize: '0.9rem', fontWeight: 800, marginBottom: 12, padding: '6px 16px', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.2)', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              title="Abrir aba CRM"
            >
              CRM {linkedCrm.fantasyName || linkedCrm.name}
            </button>
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
          <div style={styles.infoBadgeRow}>
            <span
              style={{
                ...styles.infoBadge,
                background: statusMeta.background,
                color: statusMeta.color,
                border: statusMeta.border,
              }}
            >
              {statusMeta.label}
            </span>
            {priorityMeta ? (
              <span
                style={{
                  ...styles.infoBadge,
                  background: priorityMeta.background,
                  color: priorityMeta.color,
                  border: priorityMeta.border,
                }}
              >
                {priorityMeta.label}
              </span>
            ) : null}
          </div>
          <div style={styles.infoActionRow}>
            <button type="button" onClick={() => copyText(contactName, 'Nome copiado')} style={styles.infoActionBtn}>
              Copiar nome
            </button>
            <button type="button" onClick={() => copyText(buildContactSnapshot(), 'Ficha copiada')} style={styles.infoActionBtn}>
              Copiar ficha
            </button>
            {linkedCrm ? (
              <button type="button" onClick={onUnlinkCRM} style={{ ...styles.infoActionBtn, backgroundColor: 'var(--danger)', color: '#ffffff', border: '1px solid var(--danger)' }}>
                Desvincular CRM
              </button>
            ) : (
              <button type="button" onClick={onLinkCRM} style={{ ...styles.infoActionBtn, ...styles.infoActionBtnPrimary }}>
                Vincular CRM
              </button>
            )}
          </div>
        </div>

        {panelTab === 'overview' ? overviewTab : null}
        {panelTab === 'notes' ? notesTab : null}
        {panelTab === 'media' ? mediaTab : null}
      </div>

      {profileModal ? (
        <ContactProfileModal
          key={`${profileModal.contact.id}-${profileModal.initialTab}-${profileModal.initialEquipment?.id || 'new'}`}
          contact={profileModal.contact}
          initialTab={profileModal.initialTab}
          initialEquipment={profileModal.initialEquipment || null}
          onClose={() => setProfileModal(null)}
          onUpdated={() => {
            loadPanelContext();
          }}
        />
      ) : null}
    </div>
  );
}

export function TransferModal({ users, teams, onClose, onTransfer, styles }) {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [note, setNote] = useState('');

  const handleSave = () => {
    if (!selectedTeam && !selectedAgent) {
      alert('Selecione um departamento ou atendente para transferir.');
      return;
    }
    // onTransfer receives (agentId, teamId, note)
    onTransfer(selectedAgent || null, selectedTeam || null, note);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, width: '480px', maxWidth: '90%', borderRadius: 'var(--radius-md)', padding: '0', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '24px 24px 16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 600 }}>Transferir chamado</h3>
        </div>
        
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Transferir para departamento</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
              <Users size={18} style={{ color: 'var(--text-muted)' }} />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '12px', fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="">Selecione o departamento</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Transferir para atendente (opcional)</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
              <User size={18} style={{ color: 'var(--text-muted)' }} />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '12px', fontSize: '0.95rem', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="">Selecione o atendente</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Adicionar comentário</label>
            <textarea
              placeholder="Digite o comentário aqui..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'none',
                height: '80px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ padding: '16px 24px 24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--bg-panel)',
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            Salvar
          </button>
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>x</button>
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
  const filteredTickets = tickets.filter((ticket) => {
    const query = getSafeLowerText(search);
    const name = getSafeLowerText(ticket.contact?.name);
    const fantasyName = getSafeLowerText(ticket.contact?.fantasyName);
    const phone = getSafeLowerText(ticket.contact?.phone);
    return name.includes(query) || fantasyName.includes(query) || phone.includes(query);
  });

  const activeTabLabel = {
    mine: 'Minhas conversas',
    pending: 'Fila de espera',
    all: 'Todos os contatos',
  }[tab] || 'Inbox';

  return (
    <aside
      style={{
        ...styles.sidebar,
        display: (isMobile && view === 'chat') ? 'none' : 'flex',
        width: isMobile ? '100%' : styles.sidebar.width,
        minWidth: isMobile ? '100%' : styles.sidebar.minWidth,
        borderRight: isMobile ? 'none' : styles.sidebar.borderRight,
      }}
    >
      <div style={styles.sidebarHeader}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.sidebarEyebrow}>Operacao</div>
          <div style={styles.sidebarTitle}>Inbox</div>
          <div style={styles.sidebarSubtitle}>{activeTabLabel}</div>
        </div>
        <div style={styles.sidebarCounter}>{filteredTickets.length}</div>
      </div>

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
        <div style={{ ...styles.searchRow, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={styles.searchShell}>
            <Search size={15} strokeWidth={2.2} style={styles.searchIcon} />
            <input
              style={styles.search}
              placeholder="Buscar cliente ou telefone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setSearch('');
              setFilters({ priority: '', agentId: '', teamId: '' });
            }}
            style={styles.clearBtn}
          >
            Limpar
          </button>
        </div>

        <div style={{ ...styles.filterBar, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <select
            style={{ ...styles.filterSelect, minWidth: isMobile ? 'calc(50% - 3px)' : undefined }}
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
            style={{ ...styles.filterSelect, minWidth: isMobile ? 'calc(50% - 3px)' : undefined }}
            value={filters.agentId}
            onChange={(event) => setFilters({ ...filters, agentId: event.target.value })}
          >
            <option value="">Atendente</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>

          <select
            style={{ ...styles.filterSelect, minWidth: isMobile ? '100%' : undefined }}
            value={filters.teamId}
            onChange={(event) => setFilters({ ...filters, teamId: event.target.value })}
          >
            <option value="">Equipe</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.list}>
        {filteredTickets.map((ticket) => {
          const priorityMeta = getPriorityMeta(ticket.priority);
          const statusMeta = getStatusMeta(ticket.status);
          const phoneLabel = getContactPhone(ticket.contact, 'Sem telefone');
          const ownerLabel = ticket.agent?.name || ticket.team?.name || 'Sem responsavel';
          const tags = getSafeTags(ticket.contact?.tags).slice(0, 2);

          return (
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
                <span style={styles.rowTime}>{formatTicketTimestamp(ticket.updatedAt)}</span>
              </div>

              <div style={styles.rowPreview}>{phoneLabel}</div>

              <div style={styles.rowSub}>
                <span
                  style={{
                    ...styles.rowStatusPill,
                    background: statusMeta.background,
                    color: statusMeta.color,
                    border: statusMeta.border,
                  }}
                >
                  <span style={{ ...styles.dot, background: statusMeta.color, color: statusMeta.color, boxShadow: 'none' }} />
                  {getInstanceLabel(ticket)} - {statusMeta.label}
                </span>
                {priorityMeta ? (
                  <span
                    style={{
                      ...styles.priorityPill,
                      background: priorityMeta.background,
                      color: priorityMeta.color,
                      border: priorityMeta.border,
                    }}
                  >
                    {priorityMeta.label}
                  </span>
                ) : null}
                {ticket.unreadCount > 0 ? <div style={styles.unreadBadge}>{ticket.unreadCount}</div> : null}
              </div>

              <div style={styles.rowMetaLine}>
                <span style={styles.rowOwner}>{ownerLabel}</span>
                {tags.length > 0 ? (
                  <div style={styles.rowTags}>
                    {tags.map((tag, tagIndex) => {
                      const safeTag = getSafeText(tag, 'Tag');
                      return (
                        <span key={`${safeTag}-${tagIndex}`} style={styles.rowTag}>
                          {safeTag}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span style={styles.rowMetaSpacer} />
                )}
              </div>
            </div>
          </div>
        );
        })}
        {filteredTickets.length === 0 && <Empty>Nenhuma conversa encontrada</Empty>}
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const statusMeta = getStatusMeta(selectedTicket.status);
  const ownerLabel = selectedTicket.agent?.name
    ? `Com ${selectedTicket.agent.name}`
    : selectedTicket.team?.name
      ? `Fila ${selectedTicket.team.name}`
      : `Bot ${botName}`;

  useEffect(() => {
    setActionsOpen(false);
  }, [selectedTicket.id]);

  useEffect(() => {
    function handleWindowClick(event) {
      if (!event.target.closest?.('[data-header-menu-root="true"]')) {
        setActionsOpen(false);
      }
    }

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  return (
    <header style={{ ...styles.chatHeader, padding: isMobile ? '0.85rem 1rem' : '1rem 1.5rem' }}>
      {isMobile ? (
        <button style={styles.backBtn} onClick={() => setView('list')} aria-label="Voltar para lista">
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
      ) : null}
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
          size={isMobile ? 38 : 46}
        />
      </button>

      <div style={styles.chatIdentity}>
        <div style={styles.chatTitleRow}>
          <div
            style={{
              ...styles.chatName,
              fontSize: isMobile ? '0.95rem' : '1.05rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {contactName}
          </div>
          <span
            style={{
              ...styles.chatStatusPill,
              background: statusMeta.background,
              color: statusMeta.color,
              border: statusMeta.border,
            }}
          >
            {statusMeta.label}
          </span>
        </div>

        <div style={styles.chatMetaRow}>
          {contactPhone ? <span style={styles.chatMetaText}>{contactPhone}</span> : null}
          <span style={styles.chatMetaText}>{getInstanceLabel(selectedTicket)}</span>
          {!isMobile ? <span style={styles.chatMetaText}>{ownerLabel}</span> : null}
        </div>
      </div>

      <div style={styles.headerActions}>
        <button
          type="button"
          style={isMobile ? styles.headerGhostIconBtn : styles.headerGhostBtn}
          onClick={() => setShowOsModal(true)}
          title="Gerar ordem de servico"
        >
          <ClipboardList size={16} strokeWidth={2.2} />
          {isMobile ? null : 'Gerar O.S.'}
        </button>

        <div style={styles.messageMenuRoot} data-header-menu-root="true">
          <button
            type="button"
            style={isMobile ? styles.headerGhostIconBtn : styles.headerGhostBtn}
            onClick={(event) => {
              event.stopPropagation();
              setActionsOpen((current) => !current);
            }}
            title="Mais acoes"
          >
            <MoreVertical size={16} strokeWidth={2.3} />
            {isMobile ? null : 'Acoes'}
          </button>

          {actionsOpen ? (
            <div style={styles.headerMenuPanel}>
              <button type="button" style={styles.headerMenuItem} onClick={() => { handleSummarize(); setActionsOpen(false); }} disabled={summarizing}>
                <Sparkles size={15} strokeWidth={2.2} />
                {summarizing ? 'Gerando resumo...' : 'Resumo IA'}
              </button>
              {selectedTicket.status !== 'resolved' ? (
                <button type="button" style={styles.headerMenuItem} onClick={() => { setTransferModal(true); setActionsOpen(false); }}>
                  <ArrowRightLeft size={15} strokeWidth={2.2} />
                  Transferir conversa
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {selectedTicket.status !== 'resolved' ? (
          <button style={styles.resolveBtn} onClick={handleResolve}>
            <CheckCheck size={16} strokeWidth={2.2} />
            {isMobile ? 'Fim' : 'Encerrar'}
          </button>
        ) : (
          <button
            style={{ ...styles.resolveBtn, background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
            onClick={handleReopen}
          >
            {isMobile ? 'Abrir' : 'Reabrir'}
          </button>
        )}

        {!isMobile ? (
          <button
            type="button"
            style={styles.headerGhostBtn}
            onClick={() => setShowInfo(!showInfo)}
            title={showInfo ? 'Fechar ficha do cliente' : 'Abrir ficha do cliente'}
          >
            {showInfo ? <PanelRightClose size={16} strokeWidth={2.2} /> : <PanelRightOpen size={16} strokeWidth={2.2} />}
            Cliente
          </button>
        ) : (
          <button
            type="button"
            style={styles.headerGhostIconBtn}
            onClick={() => setShowInfo(!showInfo)}
            title={showInfo ? 'Fechar ficha do cliente' : 'Abrir ficha do cliente'}
          >
            {showInfo ? <PanelRightClose size={16} strokeWidth={2.2} /> : <PanelRightOpen size={16} strokeWidth={2.2} />}
          </button>
        )}
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
  isMobile,
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
    <div style={{ ...styles.messages, padding: isMobile ? '0.85rem 0.85rem 1rem' : styles.messages.padding }} ref={scrollRef}>
      <div style={{ ...styles.historySearchSticky, top: isMobile ? '-0.85rem' : styles.historySearchSticky.top, paddingTop: isMobile ? '0.85rem' : styles.historySearchSticky.paddingTop }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onHistorySearch(draftSearch.trim());
          }}
          style={{ ...styles.historySearchWrap, padding: isMobile ? '0.55rem' : styles.historySearchWrap.padding }}
        >
          <div style={styles.historySearchField}>
            <Search size={15} strokeWidth={2.2} style={styles.searchIcon} />
            <input
              style={styles.historySearchInput}
              placeholder="Buscar neste historico"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
            />
          </div>
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
      </div>

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
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', color: 'var(--warning)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.2)', fontWeight: 700 }}>
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
                      <div style={styles.sepLabel}>
                        {message.isCurrent ? 'Sessao atual' : `Sessao anterior - ${new Date(message.date).toLocaleDateString('pt-BR')}`}
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
                        <div style={styles.summaryHeader}>
                          <span>Resumo de contexto</span>
                          <Sparkles size={14} strokeWidth={2.2} />
                        </div>
                        <div style={styles.summaryBody}>{summaryText}</div>
                      </div>
                    </MessageRenderErrorBoundary>
                  );
                }

                if (message.type === 'note') {
                  const noteText = payload?.note || payload?.text || message.payload || '';
                  return (
                    <MessageRenderErrorBoundary key={messageKey} messageId={message.id}>
                      <div style={styles.noteWrap}>
                        <div style={styles.noteCard}>
                          <div style={styles.noteHeader}>
                            <Lock size={12} style={{ color: '#d4af37', marginRight: 6 }} />
                            <span>Nota Interna • {messageUserName}</span>
                          </div>
                          <div style={styles.noteBody}>{noteText}</div>
                          <div style={styles.noteTime}>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                        </div>
                      </div>
                    </MessageRenderErrorBoundary>
                  );
                }

                const eventLabel = {
                  assigned: 'Assumiu o atendimento',
                  transferred: `Transferiu para ${getSafeText(payload?.teamName, 'outra equipe')}`,
                  resolved: 'Encerrou o atendimento',
                  reopened: 'Reabriu o atendimento',
                  ooo_message: 'Aviso de fora de horario enviado',
                }[message.type] || message.type;

                return (
                  <MessageRenderErrorBoundary key={messageKey} messageId={message.id}>
                    <div style={styles.eventWrap}>
                      <div style={styles.eventBadge}>
                        {messageUserName} - {eventLabel} {message.createdAt ? `em ${new Date(message.createdAt).toLocaleDateString('pt-BR')} as ${new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </div>
                    </div>
                  </MessageRenderErrorBoundary>
                );
              }

              const senderName = message.fromMe ? (message.fromBot ? `BOT ${botName}` : messageAgentName) : selectedContactName;
              const hasCardMedia = Boolean(message.mediaUrl) && ['image', 'document', 'video'].includes(message.mediaType);
              const senderColor = message.fromMe
                ? (hasCardMedia ? '#1b2b49' : (message.fromBot ? 'var(--text-msg-ai)' : 'var(--text-msg-me)'))
                : (hasCardMedia ? '#1b2b49' : 'var(--text-main)');
              const messageTime = fmt(message.createdAt);
              const canDownload = Boolean(message.mediaUrl);
              const isMenuOpen = openMenuId === messageKey;

              return (
                <MessageRenderErrorBoundary key={messageKey} messageId={message.id}>
                  <div className="animate-fade-in-up" style={{ ...styles.bubbleWrap, justifyContent: message.fromMe ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        ...styles.bubble,
                        maxWidth: isMobile ? '88%' : styles.bubble.maxWidth,
                        background: hasCardMedia ? 'var(--bg-surface)' : (message.fromMe ? (message.fromBot ? 'var(--bg-msg-ai)' : 'var(--bg-msg-me)') : 'var(--bg-msg-contact)'),
                        color: hasCardMedia ? 'var(--text-main)' : (message.fromMe ? (message.fromBot ? 'var(--text-msg-ai)' : 'var(--text-msg-me)') : 'var(--text-msg-contact)'),
                        opacity: message.isDeleted ? 0.6 : 1,
                        textDecoration: message.isDeleted ? 'line-through' : 'none',
                        border: hasCardMedia ? '1px solid var(--border-color)' : (message.fromMe ? (message.fromBot ? '1px solid var(--border-msg-ai)' : '1px solid transparent') : '1px solid var(--border-color)'),
                        alignItems: 'flex-start',
                        borderBottomRightRadius: message.fromMe ? 'var(--radius-sm)' : 'var(--radius-md)',
                        borderBottomLeftRadius: message.fromMe ? 'var(--radius-md)' : 'var(--radius-sm)',
                      }}
                    >
                      <div style={styles.messageHeader}>
                        <div
                          style={{
                            ...styles.messageSender,
                            color: senderColor,
                            opacity: message.fromBot ? 0.88 : 1,
                          }}
                        >
                          {message.fromBot ? <Bot size={13} strokeWidth={2.2} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> : null}
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

                      {quotedText ? (
                        <div
                          style={{
                            ...styles.quotedBlock,
                            background: message.fromMe ? 'rgba(255,255,255,0.18)' : 'rgba(15, 23, 42, 0.04)',
                            borderLeft: `2px solid ${message.fromMe ? 'rgba(255,255,255,0.58)' : 'var(--info-border)'}`,
                            color: message.fromMe ? 'rgba(255,255,255,0.78)' : 'var(--text-muted)',
                          }}
                        >
                          {quotedText}
                        </div>
                      ) : null}

                      <MediaContent message={message} onImageClick={onImageClick} styles={styles} />
                      {bodyText ? <div style={{ ...styles.messageText, fontWeight: message.fromMe ? 500 : 400, marginTop: message.mediaUrl ? '10px' : 0 }}>{bodyText}</div> : null}
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
                        background: 'rgba(245, 158, 11, 0.08)',
                        color: 'var(--warning)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
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
  isNote,
  setIsNote,
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

      <div style={{ ...styles.inputArea, padding: isMobile ? '0.75rem' : '1rem 1.5rem' }}>
        {/* Toggle between Message and Note */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          <button
            type="button"
            onClick={() => setIsNote(false)}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: !isNote ? 'var(--accent)' : 'transparent',
              color: !isNote ? 'var(--text-inverse)' : 'var(--text-muted)',
              transition: 'all 0.15s'
            }}
          >
            Mensagem (WhatsApp)
          </button>
          <button
            type="button"
            onClick={() => setIsNote(true)}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: isNote ? 'rgba(212, 175, 55, 0.14)' : 'transparent',
              color: isNote ? '#d4af37' : 'var(--text-muted)',
              borderColor: isNote ? 'rgba(212, 175, 55, 0.3)' : 'var(--border-color)',
              transition: 'all 0.15s'
            }}
          >
            Nota Interna (Privado)
          </button>
        </div>

        {replyingTo ? (
          <div style={styles.replyBanner}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.replyLabel}>
                Respondendo a {replyingTo.fromMe ? 'voce' : getContactDisplayName(selectedTicket.contact, 'cliente')}
              </div>
              <div style={styles.replyPreview}>
                {getSafeText(replyingTo.body) || (replyingTo.mediaType ? `[${replyingTo.mediaType}]` : 'Midia')}
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} style={styles.replyDismiss} aria-label="Cancelar resposta">
              <X size={14} strokeWidth={2.4} />
            </button>
          </div>
        ) : null}

        {isRecording ? (
          <div style={styles.recordingWrap}>
            <div style={styles.recordingDot} />
            <span style={styles.recordingTime}>{fmtTime(recordingTime)}</span>
            <button style={styles.stopBtn} onClick={stopRecording}>Parar e enviar</button>
          </div>
        ) : (
          <>
            <div style={{ ...styles.composerShell, gap: isMobile ? '0.55rem' : styles.composerShell.gap, padding: isMobile ? '0.55rem' : styles.composerShell.padding }}>
              {!isNote && (
                <button type="button" style={{ ...styles.attachBtn, width: isMobile ? '42px' : styles.attachBtn.width, height: isMobile ? '42px' : styles.attachBtn.height }} onClick={() => fileInputRef.current?.click()} title="Adicionar anexo">
                  <Paperclip size={18} strokeWidth={2.4} />
                </button>
              )}

              <div style={styles.composerCenter}>
                {files.length > 0 && !isNote ? (
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
                ) : null}

                <textarea
                  style={{ ...styles.textInput, minHeight: isMobile ? '46px' : '52px', fontSize: isMobile ? '0.88rem' : '0.97rem' }}
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
                      event.target.style.height = isMobile ? '46px' : '52px';
                    }
                  }}
                  onPaste={isNote ? undefined : handlePaste}
                  placeholder={isNote ? 'Escrever nota interna privada (invisível para o cliente)...' : (isMobile ? 'Mensagem...' : 'Digite sua mensagem...')}
                  spellCheck={false}
                />
              </div>

              <button
                style={{
                  ...styles.sendBtn,
                  width: isMobile ? '44px' : '48px',
                  height: isMobile ? '44px' : '48px',
                  background: (!text.trim() && files.length === 0 && !isNote) ? 'var(--bg-panel)' : 'var(--accent)',
                  border: (!text.trim() && files.length === 0 && !isNote) ? '1px solid var(--border-color)' : 'none',
                  color: (!text.trim() && files.length === 0 && !isNote) ? 'var(--text-muted)' : 'var(--text-inverse)',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                }}
                onClick={(!text.trim() && files.length === 0 && !isNote) ? startRecording : handleSend}
                disabled={isNote && !text.trim()}
              >
                {(!text.trim() && files.length === 0 && !isNote) ? <Mic size={18} strokeWidth={2.4} /> : <SendHorizontal size={18} strokeWidth={2.4} />}
              </button>

              <input ref={fileInputRef} type="file" hidden multiple onChange={handleFileSelection} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

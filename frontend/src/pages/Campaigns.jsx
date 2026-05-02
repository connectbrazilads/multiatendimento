import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { getContactTags, getContacts, sendCampaign } from '../services/api';

export default function Campaigns() {
  const [tag, setTag] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [message, setMessage] = useState('');
  const [delay, setDelay] = useState(5);
  const [status, setStatus] = useState('idle'); // idle, processing, finished
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
    const socket = io({ auth: { token } });

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
      setAvailableTags(data.map(t => t.name));
    } catch { /* erro silencioso */ }
  }

  async function loadTemplates() {
    try {
      const { data } = await axios.get('/api/quick-responses');
      setTemplates(data);
    } catch { /* erro silencioso */ }
  }

  async function searchContacts(q) {
    setSearch(q);
    if (q.length < 2) return setSearchResults([]);
    const { data } = await getContacts(q);
    setSearchResults(data);
  }

  function addContact(c) {
    if (selectedContacts.find(sc => sc.id === c.id)) return;
    setSelectedContacts([...selectedContacts, c]);
    setSearch('');
    setSearchResults([]);
  }

  async function handleSaveTag() {
    if (!newTagName) return alert('Dê um nome para a tag');
    try {
      // 1. Garantir que a tag existe na lista oficial (Master List)
      const { data: officialTags } = await getTags();
      let tagExists = officialTags.find(t => t.name.toLowerCase() === newTagName.toLowerCase());
      
      if (!tagExists) {
        const { data: createdTag } = await createTag({ name: newTagName, color: '#D4AF37' });
        tagExists = createdTag;
      }

      // 2. Para cada contato selecionado, adiciona a tag oficial
      await Promise.all(selectedContacts.map(c => {
        let currentTags = [];
        try {
          currentTags = JSON.parse(c.tags || '[]');
        } catch { currentTags = []; }
        
        if (!currentTags.includes(tagExists.name)) {
          return updateContact(c.id, { tags: [...currentTags, tagExists.name] });
        }
        return Promise.resolve();
      }));

      alert('Grupo salvo com sucesso! A etiqueta "' + tagExists.name + '" foi adicionada à sua lista oficial.');
      setShowSaveTag(false);
      setNewTagName('');
      loadTags();
      setTag(tagExists.name);
      setSelectedContacts([]);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar grupo');
    }
  }

  async function handleStart() {
    if (!tag && selectedContacts.length === 0) return alert('Selecione uma tag ou adicione contatos');
    if (!message) return alert('Escreva uma mensagem');
    
    setLoading(true);
    try {
      await sendCampaign({ 
        tag: tag || null, 
        contactIds: selectedContacts.length > 0 ? selectedContacts.map(c => c.id) : null,
        message, 
        delay: delay * 1000 
      });
      setStatus('processing');
      setProgress({ sent: 0, errors: 0, total: 0 });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao iniciar disparo');
    } finally {
      setLoading(false);
    }
  }

  const s = {
    container: { padding: '24px', maxWidth: '800px', margin: '0 auto', color: '#fff', width: '100%', display: 'block' },
    card: { background: '#1A1A1A', padding: '32px', borderRadius: '24px', border: '1px solid rgba(212,175,55,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' },
    title: { fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(45deg, #FFF, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    subtitle: { color: '#717171', marginBottom: '32px', fontSize: '0.95rem' },
    label: { display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px' },
    input: { width: '100%', background: '#252525', border: '1px solid #333', borderRadius: '12px', padding: '14px', color: '#fff', marginBottom: '20px', fontSize: '1rem', outline: 'none', transition: 'border 0.2s' },
    textarea: { width: '100%', background: '#252525', border: '1px solid #333', borderRadius: '12px', padding: '14px', color: '#fff', marginBottom: '20px', fontSize: '1rem', outline: 'none', minHeight: '150px', resize: 'vertical' },
    hint: { fontSize: '0.75rem', color: '#555', marginTop: '-15px', marginBottom: '20px', fontStyle: 'italic' },
    btn: { width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(45deg, #D4AF37, #F2D06B)', color: '#000', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
    progressBox: { marginTop: '32px', padding: '24px', background: 'rgba(212,175,55,0.05)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.1)' },
    progressBar: { height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden', marginTop: '16px' },
    progressFill: { height: '100%', background: '#D4AF37', transition: 'width 0.3s' },
    stats: { display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.9rem', fontWeight: 600 },
    searchBox: { position: 'relative', marginBottom: '20px' },
    results: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#252525', border: '1px solid #333', borderRadius: '12px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' },
    resultItem: { padding: '12px', borderBottom: '1px solid #333', cursor: 'pointer', transition: 'background 0.2s' },
    selectedChip: { display: 'inline-flex', alignItems: 'center', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', margin: '4px', color: '#D4AF37' },
    removeChip: { marginLeft: '8px', cursor: 'pointer', fontWeight: 900 },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h1 style={s.title}>🚀 Disparo em Massa</h1>
        <p style={s.subtitle}>Envie mensagens personalizadas para grupos de clientes.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={s.label}>Público por Tag</label>
            <select 
              style={{ ...s.input, height: '50px', boxSizing: 'border-box' }} 
              value={tag} 
              onChange={e => { setTag(e.target.value); setSelectedContacts([]); }} 
              disabled={status === 'processing'}
            >
              <option value="">Selecione uma tag...</option>
              {availableTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={s.label}>Adicionar Individualmente</label>
            <div style={s.searchBox}>
              <input 
                style={{ ...s.input, marginBottom: 0, height: '50px', boxSizing: 'border-box' }} 
                placeholder="Buscar por nome ou número..." 
                value={search} 
                onChange={e => { searchContacts(e.target.value); setTag(''); }}
                disabled={status === 'processing'}
              />
              {searchResults.length > 0 && (
                <div style={s.results}>
                  {searchResults.map(c => (
                    <div key={c.id} style={s.resultItem} onClick={() => addContact(c)}>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedContacts.length > 0 && (
          <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px dashed #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
               <label style={{ ...s.label, marginBottom: 0 }}>Selecionados ({selectedContacts.length})</label>
               <button 
                 onClick={() => setShowSaveTag(true)}
                 style={{ background: 'transparent', border: '1px solid #D4AF37', color: '#D4AF37', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
               >
                 💾 Salvar como Novo Grupo
               </button>
            </div>
            {selectedContacts.map(c => (
              <span key={c.id} style={s.selectedChip}>
                {c.name || c.phone}
                <span style={s.removeChip} onClick={() => setSelectedContacts(selectedContacts.filter(sc => sc.id !== c.id))}>✕</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={s.label}>Modelo de Mensagem (Opcional)</label>
          <select 
            style={{ ...s.input, height: '50px', boxSizing: 'border-box' }} 
            onChange={e => setMessage(e.target.value)}
            disabled={status === 'processing'}
          >
            <option value="">Selecione um modelo pronto...</option>
            {templates.map(t => (
              <option key={t.id} value={t.body}>{t.shortcut} - {t.body.slice(0, 30)}...</option>
            ))}
          </select>
        </div>

        <label style={s.label}>Mensagem</label>
        <textarea 
          style={s.textarea} 
          placeholder="Escreva sua mensagem aqui..." 
          value={message} 
          onChange={e => setMessage(e.target.value)}
          disabled={status === 'processing'}
        />
        <p style={s.hint}>Use <b>[nome]</b> para inserir o nome do cliente automaticamente.</p>

        <label style={s.label}>Intervalo entre envios (segundos)</label>
        <input 
          type="number" 
          style={{ ...s.input, height: '50px', boxSizing: 'border-box' }} 
          value={delay} 
          onChange={e => setDelay(e.target.value)}
          min="3"
          disabled={status === 'processing'}
        />

        <button 
          style={{ ...s.btn, opacity: (status === 'processing' || loading) ? 0.6 : 1 }} 
          onClick={handleStart}
          disabled={status === 'processing' || loading}
        >
          {status === 'processing' ? '⏳ Processando Disparo...' : '🔥 Iniciar Disparo Agora'}
        </button>

        {status !== 'idle' && (
          <div style={s.progressBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: status === 'finished' ? '#4CAF50' : '#D4AF37' }}>
                {status === 'finished' ? '✅ Disparo Concluído!' : '📡 Enviando Mensagens...'}
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{progress.sent + progress.errors} de {progress.total}</span>
            </div>
            
            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${((progress.sent + progress.errors) / progress.total) * 100}%` }} />
            </div>

            <div style={s.stats}>
              <span style={{ color: '#4CAF50' }}>✓ {progress.sent} Enviados</span>
              <span style={{ color: '#F44336' }}>✕ {progress.errors} Falhas</span>
            </div>
          </div>
        )}
      </div>

      {showSaveTag && (
        <div style={s.overlay}>
          <div style={{ ...s.card, width: '400px' }}>
            <h2 style={{ ...s.title, fontSize: '1.4rem' }}>💾 Salvar Novo Grupo</h2>
            <p style={s.subtitle}>Dê um nome para este grupo de {selectedContacts.length} contatos.</p>
            
            <label style={s.label}>Nome da Tag</label>
            <input 
              style={s.input} 
              placeholder="Ex: [CLIENTES_JUNHO]" 
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
            />
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={{ ...s.btn, background: '#333', color: '#fff' }} 
                onClick={() => setShowSaveTag(false)}
              >
                Cancelar
              </button>
              <button style={s.btn} onClick={handleSaveTag}>
                Salvar Grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

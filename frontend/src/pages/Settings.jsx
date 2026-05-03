import React, { useEffect, useState } from 'react';
import { 
  getSettings, saveSettings, updateProfile, getMe, getQuickResponses, 
  createQuickResponse, deleteQuickResponse, getBusinessHours, saveBusinessHours,
  getTags, createTag, deleteTag
} from '../services/api';

const TABS = ['Robô IA', 'Atendimento', 'Respostas Rápidas', 'Etiquetas', 'Minha Conta'];

export default function Settings() {
  const isMobile = window.innerWidth <= 768;
  const isAdmin = localStorage.getItem('role') === 'admin' || localStorage.getItem('role') === 'superadmin';
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ 
    botEnabled: false, 
    geminiKey: '', 
    webhookUrl: '',
    systemPrompt: '',
    transferKeyword: 'atendente',
    outOfOfficeMessage: '',
    ratingEnabled: false,
    ratingMessage: '',
    notificationPhone: ''
  });
  const [hours, setHours] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [profile, setProfile] = useState({ name: '', email: '', password: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [quickResponses, setQuickResponses] = useState([]);
  const [newQuick, setNewQuick] = useState({ shortcut: '', message: '' });
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState({ name: '', color: '#D4AF37' });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await getSettings();
      setForm(f => ({ ...f, ...data }));
    } catch { /* sem settings ainda */ }
    try {
      const { data } = await getMe();
      setProfile({ name: data.name, email: data.email, password: '' });
    } catch { /* erro ao carregar perfil */ }
    try {
      const { data } = await getQuickResponses();
      setQuickResponses(data);
    } catch { /* erro */ }
    try {
      const { data } = await getTags();
      setTags(data);
    } catch { /* erro */ }
    try {
      const { data } = await getBusinessHours();
      if (data && data.length > 0) setHours(data);
      else setHours([0,1,2,3,4,5,6].map(d => ({ dayOfWeek: d, start: '08:00', end: '18:00', active: true })));
    } catch { /* erro */ }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await saveSettings(form);
      if (tab === 1) {
        await saveBusinessHours({ hours });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError('✗ Erro ao salvar: ' + (err.response?.data?.error || err.message || 'Backend indisponível'));
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      alert('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddQuick(e) {
    e.preventDefault();
    try {
      const { data } = await createQuickResponse(newQuick);
      setQuickResponses([...quickResponses, data]);
      setNewQuick({ shortcut: '', message: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao adicionar');
    }
  }

  async function handleDeleteQuick(id) {
    if (!window.confirm('Deseja excluir esta resposta rápida?')) return;
    try {
      await deleteQuickResponse(id);
      setQuickResponses(quickResponses.filter(q => q.id !== id));
    } catch {
      alert('Erro ao excluir');
    }
  }

  async function handleAddTag(e) {
    e.preventDefault();
    if (!newTag.name) return;
    try {
      const { data } = await createTag(newTag);
      setTags([...tags, data]);
      setNewTag({ name: '', color: '#D4AF37' });
    } catch (err) {
      alert('Erro ao adicionar etiqueta');
    }
  }

  async function handleDeleteTag(id) {
    if (!window.confirm('Excluir esta etiqueta?')) return;
    try {
      await deleteTag(id);
      setTags(tags.filter(t => t.id !== id));
    } catch {
      alert('Erro ao excluir');
    }
  }

  return (
    <div className="settings-container" style={s.container}>
      <div className="settings-header" style={s.header}>
        <h2 className="settings-title" style={s.title}>⚙️ Configurações</h2>
        <div className="settings-subtitle" style={s.subtitle}>Gerencie o comportamento do seu robô e preferências da conta.</div>
      </div>

      <div style={{ 
        ...s.tabs, 
        overflowX: isMobile ? 'auto' : 'visible',
        whiteSpace: isMobile ? 'nowrap' : 'normal',
        paddingBottom: isMobile ? '10px' : '0'
      }}>
        {TABS.map((t, i) => (
          <button key={t} style={{ ...s.tab, ...(tab === i ? s.tabActive : {}) }} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div style={s.sections}>
          <div style={s.card}>
            <h2 style={s.cardTitle}>⚙️ Configurações Gerais</h2>
            <form onSubmit={handleSave} style={s.form}>
              {isAdmin && (
                <>
                  <div style={s.field}>
                    <label style={s.label}>URL da API (Evolution)</label>
                    <input style={s.input} value={form.evolutionUrl} onChange={e => setForm({ ...form, evolutionUrl: e.target.value })} placeholder="https://api.sua-instancia.com" />
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>Chave Global da API (Evolution)</label>
                    <input style={s.input} type="password" value={form.evolutionKey} onChange={e => setForm({ ...form, evolutionKey: e.target.value })} placeholder="42-caracteres..." />
                  </div>
                </>
              )}

              <div style={s.field}>
                <label style={s.label}>Habilitar Robô de IA</label>
                <div style={s.toggleCard}>
                  <div style={s.toggleInfo}>
                    <span style={{ fontWeight: 700, color: form.botEnabled ? '#D4AF37' : '#717171' }}>
                      {form.botEnabled ? '🟢 ROBÔ ATIVO' : '⚪ ROBÔ DESLIGADO'}
                    </span>
                    <p style={{ fontSize: '0.8rem', color: '#555', margin: 0 }}>O robô responderá automaticamente tickets sem atendente.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    style={s.switch} 
                    checked={form.botEnabled} 
                    onChange={e => setForm({ ...form, botEnabled: e.target.checked })} 
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Nome do Robô</label>
                <input 
                  style={s.input} 
                  value={form.botName} 
                  onChange={e => setForm({ ...form, botName: e.target.value })} 
                  placeholder="Ex: LCD Bot" 
                />
                <p style={s.hint}>Este nome aparecerá para você no chat interno.</p>
              </div>
              
              <div style={s.field}>
                <label style={s.label}>Chave Gemini (IA)</label>
                <input style={s.input} type="password" value={form.geminiKey} onChange={e => setForm({ ...form, geminiKey: e.target.value })} placeholder="AIza..." />
              </div>

              <div style={s.field}>
                <label style={s.label}>URL do Webhook Externo</label>
                <input style={s.input} value={form.webhookUrl} onChange={e => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://seu-crm.com/api/webhook" />
                <p style={s.hint}>Disparado quando um atendimento é encerrado.</p>
              </div>

              <button style={s.saveBtn} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Alterações'}</button>
            </form>
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>🧠 Comportamento da IA</h2>
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Instruções do Sistema (System Prompt)</label>
                <textarea 
                  style={{ ...s.input, minHeight: '120px', resize: 'vertical' }} 
                  value={form.systemPrompt} 
                  onChange={e => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder="Ex: Você é um atendente cordial da clínica X. Seu objetivo é agendar consultas..."
                />
                <p style={s.hint}>Dê personalidade e contexto ao seu robô.</p>
              </div>

              <div style={s.field}>
                <label style={s.label}>Palavra-chave de Transferência</label>
                <input 
                  style={s.input} 
                  value={form.transferKeyword} 
                  onChange={e => setForm({ ...form, transferKeyword: e.target.value })}
                  placeholder="Ex: atendente"
                />
                <p style={s.hint}>Quando o cliente digitar isso, a IA parará de responder e enviará para "Aguardando".</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div style={s.sections}>
          <div style={s.card}>
            <h2 style={s.cardTitle}>🕒 Horário de Atendimento</h2>
            <div style={s.form}>
               {hours.map((h, i) => (
                 <div key={h.dayOfWeek} style={{ ...s.hourRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
                    <div style={{ width: '100px', fontWeight: 800, marginBottom: isMobile ? '8px' : '0' }}>
                       {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][h.dayOfWeek]}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                      <input type="checkbox" checked={h.active} onChange={e => {
                        const newH = [...hours];
                        newH[i].active = e.target.checked;
                        setHours(newH);
                      }} />
                      <input type="time" style={s.hourInput} value={h.start} disabled={!h.active} onChange={e => {
                        const newH = [...hours];
                        newH[i].start = e.target.value;
                        setHours(newH);
                      }} />
                      <span>até</span>
                      <input type="time" style={s.hourInput} value={h.end} disabled={!h.active} onChange={e => {
                        const newH = [...hours];
                        newH[i].end = e.target.value;
                        setHours(newH);
                      }} />
                    </div>
                 </div>
               ))}
               <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Horários'}</button>
            </div>
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>😴 Mensagem de Ausência</h2>
            <div style={s.form}>
               <div style={s.field}>
                  <label style={s.label}>Texto Automático</label>
                  <textarea 
                    style={{ ...s.input, minHeight: '120px' }} 
                    value={form.outOfOfficeMessage} 
                    onChange={e => setForm({ ...form, outOfOfficeMessage: e.target.value })}
                    placeholder="Olá! No momento nossa equipe está descansando. Deixe sua dúvida que responderemos em breve..."
                  />
                  <p style={s.hint}>Enviada automaticamente fora do horário comercial.</p>
               </div>

               <div style={s.field}>
                  <label style={s.label}>WhatsApp para Alertas do Sistema</label>
                  <input 
                    style={s.input} 
                    value={form.notificationPhone} 
                    onChange={e => setForm({ ...form, notificationPhone: e.target.value })}
                    placeholder="5511999999999"
                  />
                  <p style={s.hint}>Você receberá avisos técnicos neste número.</p>
               </div>

               <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações de Ausência'}</button>
            </div>
          </div>

          <div style={s.card}>
            <h2 style={s.cardTitle}>⭐ Pesquisa de Satisfação (CSAT)</h2>
            <div style={s.form}>
               <div style={s.field}>
                  <label style={s.label}>Habilitar Avaliação ao Encerrar</label>
                  <div style={s.toggleCard}>
                    <div style={s.toggleInfo}>
                      <span style={{ fontWeight: 700, color: form.ratingEnabled ? '#D4AF37' : '#717171' }}>
                        {form.ratingEnabled ? '🟢 ATIVA' : '⚪ DESATIVADA'}
                      </span>
                      <p style={{ fontSize: '0.8rem', color: '#555', margin: 0 }}>O cliente receberá uma pergunta de 1 a 5 após o encerramento.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      style={s.switch} 
                      checked={form.ratingEnabled} 
                      onChange={e => setForm({ ...form, ratingEnabled: e.target.checked })} 
                    />
                  </div>
               </div>

               <div style={s.field}>
                  <label style={s.label}>Mensagem de Avaliação</label>
                  <textarea 
                    style={{ ...s.input, minHeight: '80px' }} 
                    value={form.ratingMessage} 
                    onChange={e => setForm({ ...form, ratingMessage: e.target.value })}
                    placeholder="Como você avalia nosso atendimento de 1 a 5?"
                  />
                  <p style={s.hint}>Use números de 1 a 5 para que o sistema identifique a nota.</p>
               </div>

               <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações CSAT'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 2 && (
        <section style={s.card}>
          <div style={{ marginBottom: '2rem' }}>
            <h3>⚡ Respostas Rápidas</h3>
            <p style={s.hint}>Use "/" no chat para acessar mensagens pré-definidas.</p>
          </div>
          
          <div style={{ ...s.quickAddBox, flexDirection: isMobile ? 'column' : 'row' }}>
            <input style={s.input} value={newQuick.shortcut} onChange={e => setNewQuick({ ...newQuick, shortcut: e.target.value })} placeholder="/atalho" />
            <input style={{ ...s.input, flex: 2 }} value={newQuick.message} onChange={e => setNewQuick({ ...newQuick, message: e.target.value })} placeholder="Mensagem automática..." />
            <button type="button" onClick={handleAddQuick} style={s.saveBtn}>Adicionar</button>
          </div>

          <div style={s.quickList}>
            {quickResponses.map(q => (
              <div key={q.id} style={s.quickItem}>
                <div>
                  <strong style={{ color: '#D4AF37' }}>{q.shortcut}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>{q.message}</div>
                </div>
                <button type="button" onClick={() => handleDeleteQuick(q.id)} style={s.delBtn}>🗑️</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 3 && (
        <section style={s.card}>
          <div style={{ marginBottom: '2rem' }}>
            <h3>🏷️ Gestão de Etiquetas</h3>
            <p style={s.hint}>Defina as etiquetas oficiais que serão usadas para organizar seus contatos.</p>
          </div>
          
          <form onSubmit={handleAddTag} style={{ ...s.quickAddBox, flexDirection: isMobile ? 'column' : 'row' }}>
            <input 
              style={s.input} 
              value={newTag.name} 
              onChange={e => setNewTag({ ...newTag, name: e.target.value })} 
              placeholder="Nome da Etiqueta (ex: Financeiro)" 
            />
            <input 
              type="color" 
              style={{ ...s.input, width: isMobile ? '100%' : '60px', padding: '2px' }} 
              value={newTag.color} 
              onChange={e => setNewTag({ ...newTag, color: e.target.value })} 
            />
            <button type="submit" style={s.saveBtn}>Adicionar</button>
          </form>

          <div style={s.quickList}>
            {tags.map(t => (
              <div key={t.id} style={s.quickItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.color }} />
                  <strong style={{ color: t.color }}>{t.name}</strong>
                </div>
                <button type="button" onClick={() => handleDeleteTag(t.id)} style={s.delBtn}>🗑️</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 4 && (
        <section style={s.card}>
          <div style={{ marginBottom: '2rem' }}>
            <h3>👤 Minha Conta</h3>
          </div>
          
          <div style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Seu Nome</label>
              <input style={s.input} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
            </div>
            
            <div style={s.field}>
              <label style={s.label}>E-mail</label>
              <input style={s.input} type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
            </div>

            <div style={s.field}>
              <label style={s.label}>Nova Senha (opcional)</label>
              <input style={s.input} type="password" value={profile.password} onChange={e => setProfile({ ...profile, password: e.target.value })} placeholder="******" />
            </div>

            <div style={s.saveRow}>
              {profileSaved && <span style={s.savedMsg}>✓ Perfil atualizado</span>}
              <button style={s.saveBtn} type="button" onClick={handleProfileSave} disabled={saving}>Salvar Perfil</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const s = {
  container: { padding: '2.5rem', flex: 1, overflowY: 'auto', background: '#0F0F0F', color: '#fff' },
  header: { marginBottom: '3rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' },
  subtitle: { fontSize: '0.95rem', color: '#717171' },
  tabs: { display: 'flex', gap: '1rem', borderBottom: '1px solid #333', marginBottom: '2.5rem' },
  tab: { padding: '0.75rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', color: '#717171', borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  tabActive: { color: '#D4AF37', borderBottomColor: '#D4AF37', fontWeight: 800 },
  
  sections: { display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' },
  card: { background: '#1A1A1B', padding: window.innerWidth <= 768 ? '1.5rem' : '2rem', borderRadius: '24px', border: '1px solid #2A2A2A' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', color: '#D4AF37', borderBottom: '1px solid #222', paddingBottom: '1rem' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  toggleCard: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    background: '#0F0F0F', 
    padding: '1.25rem', 
    borderRadius: '16px', 
    border: '1px solid #333' 
  },
  toggleInfo: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  switch: { 
    width: '40px', 
    height: '20px', 
    cursor: 'pointer', 
    accentColor: '#D4AF37' 
  },
  toggleRow: { display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#A0A0A0' },
  label: { fontSize: '0.75rem', fontWeight: 800, color: '#717171', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { background: '#0F0F0F', border: '1px solid #333', borderRadius: '12px', padding: '0.85rem 1rem', color: '#fff', outline: 'none', fontSize: '0.9rem' },
  hint: { fontSize: '0.75rem', color: '#555', marginTop: '2px' },
  saveBtn: { background: '#D4AF37', color: '#000', border: 'none', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, marginTop: '1rem' },
  
  saveRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.5rem', marginTop: '2rem' },
  savedMsg: { color: '#48bb78', fontSize: '0.9rem', fontWeight: 700 },
  quickAddBox: { display: 'flex', gap: '1rem', background: '#0F0F0F', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' },
  quickList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  quickItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: '#131314', borderRadius: '12px', border: '1px solid #2A2A2A' },
  delBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' },
  hourRow: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #222' },
  hourInput: { background: '#0F0F0F', border: '1px solid #333', borderRadius: '8px', padding: '4px 8px', color: '#fff', outline: 'none' }
};

import React, { useEffect, useMemo, useState } from 'react';

const categories = ['all', 'restaurant', 'fitness', 'finance', 'beauty', 'education', 'travel', 'services', 'other'];
const pollTypes = ['single', 'multiple', 'text', 'rating'];
const emptyPartner = {
    name: '', description: '', category: 'other', discount: '', discount_conditions: '',
    address: '', website: '', phone: '', logo_url: '', cover_url: '', is_exclusive: false,
    is_published: true, sort_order: 0,
};
const emptyPoll = {
    question: '', description: '', type: 'single', poll_options: [], is_active: true,
    is_published: true, starts_at: '', ends_at: '', sort_order: 0,
};
const panel = { background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '20px' };
const input = { width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none' };
const button = { border: 'none', borderRadius: '100px', padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' };

async function adminApi(resource, { method = 'GET', body, query = '' } = {}) {
    const token = localStorage.getItem('admin_api_token');
    if (!token) throw new Error('Сначала укажите Admin API Token');
    const response = await fetch(`/api/admin-data?resource=${resource}${query}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Ошибка API ${response.status}`);
    return data;
}

const downloadCsv = (rows, filename) => {
    const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [columns.map(escape).join(','), ...rows.map(row => columns.map(column => escape(
        typeof row[column] === 'object' ? JSON.stringify(row[column]) : row[column]
    )).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const Field = ({ label, ...props }) => <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px' }}>{label}<input style={input} {...props} /></label>;
const Check = ({ label, ...props }) => <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#bbb', fontSize: '13px' }}><input type="checkbox" {...props} />{label}</label>;
const Modal = ({ title, children, onClose }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,.88)', display: 'grid', placeItems: 'center', padding: '20px' }}>
        <div style={{ ...panel, width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
                <h2 style={{ margin: 0 }}>{title}</h2>
                <button onClick={onClose} style={{ ...button, background: '#222', color: '#fff' }}>ЗАКРЫТЬ</button>
            </div>
            {children}
        </div>
    </div>
);

const TokenConfig = ({ onSaved }) => {
    const [token, setToken] = useState(localStorage.getItem('admin_api_token') || '');
    return <div style={{ ...panel, maxWidth: '560px' }}>
        <h3 style={{ marginTop: 0 }}>Admin API Token</h3>
        <p style={{ color: '#888', fontSize: '13px' }}>Введите значение переменной <code>ADMIN_API_TOKEN</code> из Vercel.</p>
        <input type="password" value={token} onChange={event => setToken(event.target.value)} style={input} />
        <button onClick={() => { localStorage.setItem('admin_api_token', token); onSaved(); }} style={{ ...button, background: '#fff', marginTop: '12px' }}>СОХРАНИТЬ</button>
    </div>;
};

const PartnerForm = ({ initialValue, onSave, onClose }) => {
    const [form, setForm] = useState(initialValue);
    const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
    return <Modal title={form.id ? 'Редактирование партнера' : 'Новый партнер'} onClose={onClose}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Field label="Название" value={form.name} onChange={event => set('name', event.target.value)} />
            <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px' }}>Категория<select style={input} value={form.category} onChange={event => set('category', event.target.value)}>{categories.filter(value => value !== 'all').map(value => <option key={value}>{value}</option>)}</select></label>
            <Field label="Скидка" value={form.discount || ''} onChange={event => set('discount', event.target.value)} />
            <Field label="Телефон" value={form.phone || ''} onChange={event => set('phone', event.target.value)} />
            <Field label="Адрес" value={form.address || ''} onChange={event => set('address', event.target.value)} />
            <Field label="Сайт" value={form.website || ''} onChange={event => set('website', event.target.value)} />
            <Field label="Логотип URL" value={form.logo_url || ''} onChange={event => set('logo_url', event.target.value)} />
            <Field label="Обложка URL" value={form.cover_url || ''} onChange={event => set('cover_url', event.target.value)} />
            <Field label="Порядок" type="number" value={form.sort_order ?? 0} onChange={event => set('sort_order', Number(event.target.value))} />
        </div>
        <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px', marginTop: '12px' }}>Описание<textarea style={{ ...input, minHeight: '74px' }} value={form.description || ''} onChange={event => set('description', event.target.value)} /></label>
        <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px', marginTop: '12px' }}>Условия скидки<textarea style={{ ...input, minHeight: '74px' }} value={form.discount_conditions || ''} onChange={event => set('discount_conditions', event.target.value)} /></label>
        <div style={{ display: 'flex', gap: '18px', margin: '16px 0' }}><Check label="Опубликован" checked={form.is_published} onChange={event => set('is_published', event.target.checked)} /><Check label="Эксклюзивный" checked={form.is_exclusive} onChange={event => set('is_exclusive', event.target.checked)} /></div>
        <button disabled={!form.name.trim()} onClick={() => onSave(form)} style={{ ...button, background: '#fff' }}>СОХРАНИТЬ</button>
    </Modal>;
};

const PartnersAdmin = () => {
    const [partners, setPartners] = useState([]);
    const [category, setCategory] = useState('all');
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const load = () => adminApi('partners').then(setPartners).catch(reason => setError(reason.message));
    useEffect(() => { adminApi('partners').then(setPartners).catch(reason => setError(reason.message)); }, []);
    const save = async record => { const method = record.id ? 'PATCH' : 'POST'; await adminApi('partners', { method, body: record }); setEditing(null); load(); };
    const remove = async id => { if (window.confirm('Удалить партнера?')) { await adminApi('partners', { method: 'DELETE', body: { id } }); load(); } };
    const toggle = async partner => { await adminApi('partners', { method: 'PATCH', body: { id: partner.id, is_published: !partner.is_published } }); load(); };
    if (error) return <TokenConfig onSaved={() => { setError(''); load(); }} />;
    const visible = category === 'all' ? partners : partners.filter(partner => partner.category === category);
    return <>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', marginBottom: '22px' }}>
            <button onClick={() => setEditing({ ...emptyPartner })} style={{ ...button, background: '#fff' }}>+ ДОБАВИТЬ ПАРТНЕРА</button>
            <select value={category} onChange={event => setCategory(event.target.value)} style={{ ...input, width: '180px' }}>{categories.map(value => <option key={value} value={value}>{value === 'all' ? 'Все категории' : value}</option>)}</select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>{visible.map(partner => <article key={partner.id} style={panel}>
            <p style={{ margin: '0 0 8px', color: '#777', fontSize: '11px', textTransform: 'uppercase' }}>{partner.category} / #{partner.sort_order ?? 0}</p><h3 style={{ margin: '0 0 10px' }}>{partner.name}</h3><p style={{ color: '#aaa', minHeight: '36px' }}>{partner.description || 'Без описания'}</p><strong style={{ display: 'block', marginBottom: '14px' }}>{partner.discount || 'Без скидки'}</strong>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><button onClick={() => setEditing(partner)} style={{ ...button, background: '#fff' }}>ИЗМЕНИТЬ</button><button onClick={() => toggle(partner)} style={{ ...button, background: partner.is_published ? '#29472f' : '#4a2929', color: '#fff' }}>{partner.is_published ? 'ОПУБЛИКОВАН' : 'СКРЫТ'}</button><button onClick={() => remove(partner.id)} style={{ ...button, background: '#222', color: '#f77' }}>УДАЛИТЬ</button></div>
        </article>)}</div>
        {editing && <PartnerForm initialValue={editing} onSave={save} onClose={() => setEditing(null)} />}
    </>;
};

const PollForm = ({ initialValue, onSave, onClose }) => {
    const [form, setForm] = useState({ ...initialValue, optionsText: (initialValue.poll_options || []).map(option => option.label).join('\n') });
    const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
    const submit = () => { const { optionsText, ...values } = form; onSave({ ...values, poll_options: optionsText.split('\n').map(label => label.trim()).filter(Boolean).map((label, sort_order) => ({ label, sort_order })) }); };
    return <Modal title={form.id ? 'Редактирование опроса' : 'Новый опрос'} onClose={onClose}>
        <Field label="Вопрос" value={form.question} onChange={event => set('question', event.target.value)} />
        <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px', marginTop: '12px' }}>Описание<textarea style={{ ...input, minHeight: '64px' }} value={form.description || ''} onChange={event => set('description', event.target.value)} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginTop: '12px' }}>
            <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px' }}>Тип<select style={input} value={form.type} onChange={event => set('type', event.target.value)}>{pollTypes.map(type => <option key={type}>{type}</option>)}</select></label>
            <Field label="Начать в" type="datetime-local" value={form.starts_at ? form.starts_at.slice(0, 16) : ''} onChange={event => set('starts_at', event.target.value)} />
            <Field label="Завершить в" type="datetime-local" value={form.ends_at ? form.ends_at.slice(0, 16) : ''} onChange={event => set('ends_at', event.target.value)} />
            <Field label="Порядок" type="number" value={form.sort_order ?? 0} onChange={event => set('sort_order', Number(event.target.value))} />
        </div>
        {!['text', 'rating'].includes(form.type) && <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px', marginTop: '12px' }}>Варианты ответа, по одному в строке<textarea style={{ ...input, minHeight: '130px' }} value={form.optionsText} onChange={event => set('optionsText', event.target.value)} /></label>}
        <div style={{ display: 'flex', gap: '18px', margin: '16px 0' }}><Check label="Активен" checked={form.is_active} onChange={event => set('is_active', event.target.checked)} /><Check label="Опубликован" checked={form.is_published} onChange={event => set('is_published', event.target.checked)} /></div>
        <button disabled={!form.question.trim()} onClick={submit} style={{ ...button, background: '#fff' }}>СОХРАНИТЬ</button>
    </Modal>;
};

const Answers = ({ poll, onClose }) => {
    const [answers, setAnswers] = useState([]);
    const [error, setError] = useState('');
    useEffect(() => { adminApi('poll-answers', { query: `&poll_id=${encodeURIComponent(poll.id)}` }).then(setAnswers).catch(reason => setError(reason.message)); }, [poll.id]);
    const distribution = useMemo(() => {
        const optionLabels = Object.fromEntries((poll.poll_options || []).map(option => [option.id, option.label]));
        return answers.reduce((result, answer) => { const value = optionLabels[answer.option_id] ?? answer.rating_value ?? answer.text_answer ?? answer.answer ?? 'Без значения'; const key = typeof value === 'object' ? JSON.stringify(value) : String(value); result[key] = (result[key] || 0) + 1; return result; }, {});
    }, [answers, poll.poll_options]);
    return <Modal title={`Ответы: ${poll.question}`} onClose={onClose}><p style={{ color: '#aaa' }}>Всего ответов: <strong style={{ color: '#fff' }}>{answers.length}</strong></p>{error && <p style={{ color: '#f77' }}>{error}</p>}<button disabled={!answers.length} onClick={() => downloadCsv(answers, `poll-${poll.id}-answers.csv`)} style={{ ...button, background: '#fff', marginBottom: '16px' }}>ЭКСПОРТ CSV</button><div style={{ ...panel, marginBottom: '14px' }}><strong>Распределение</strong>{Object.entries(distribution).map(([value, count]) => <p key={value} style={{ color: '#aaa' }}>{value}: <strong style={{ color: '#fff' }}>{count}</strong></p>)}</div>{answers.map(answer => <pre key={answer.id} style={{ ...panel, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#aaa', fontSize: '11px' }}>{JSON.stringify(answer, null, 2)}</pre>)}</Modal>;
};

const PollsAdmin = () => {
    const [polls, setPolls] = useState([]);
    const [editing, setEditing] = useState(null);
    const [answersFor, setAnswersFor] = useState(null);
    const [error, setError] = useState('');
    const load = () => adminApi('polls').then(setPolls).catch(reason => setError(reason.message));
    useEffect(() => { adminApi('polls').then(setPolls).catch(reason => setError(reason.message)); }, []);
    const save = async record => { await adminApi('polls', { method: record.id ? 'PATCH' : 'POST', body: record }); setEditing(null); load(); };
    const remove = async id => { if (window.confirm('Удалить опрос? Ответы могут быть удалены вместе с ним.')) { await adminApi('polls', { method: 'DELETE', body: { id } }); load(); } };
    const toggle = async (poll, field) => { await adminApi('polls', { method: 'PATCH', body: { ...poll, [field]: !poll[field] } }); load(); };
    const duplicate = poll => save({ ...poll, id: undefined, question: `${poll.question} (копия)`, is_active: false });
    if (error) return <TokenConfig onSaved={() => { setError(''); load(); }} />;
    return <><button onClick={() => setEditing({ ...emptyPoll })} style={{ ...button, background: '#fff', marginBottom: '22px' }}>+ ДОБАВИТЬ ОПРОС</button><div style={{ display: 'grid', gap: '16px' }}>{polls.map(poll => <article key={poll.id} style={panel}><p style={{ margin: '0 0 8px', color: '#777', fontSize: '11px', textTransform: 'uppercase' }}>{poll.type} / #{poll.sort_order ?? 0}</p><h3 style={{ margin: '0 0 10px' }}>{poll.question}</h3><p style={{ color: '#aaa' }}>{poll.description || 'Без описания'}</p>{!!poll.poll_options?.length && <p style={{ color: '#777', fontSize: '13px' }}>Варианты: {poll.poll_options.map(option => option.label).join(' / ')}</p>}<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><button onClick={() => setEditing(poll)} style={{ ...button, background: '#fff' }}>ИЗМЕНИТЬ</button><button onClick={() => toggle(poll, 'is_active')} style={{ ...button, background: poll.is_active ? '#29472f' : '#4a2929', color: '#fff' }}>{poll.is_active ? 'АКТИВЕН' : 'ВЫКЛЮЧЕН'}</button><button onClick={() => toggle(poll, 'is_published')} style={{ ...button, background: poll.is_published ? '#29472f' : '#4a2929', color: '#fff' }}>{poll.is_published ? 'ОПУБЛИКОВАН' : 'СКРЫТ'}</button><button onClick={() => setAnswersFor(poll)} style={{ ...button, background: '#283b59', color: '#fff' }}>ОТВЕТЫ</button><button onClick={() => duplicate(poll)} style={{ ...button, background: '#222', color: '#fff' }}>ДУБЛИРОВАТЬ</button><button onClick={() => remove(poll.id)} style={{ ...button, background: '#222', color: '#f77' }}>УДАЛИТЬ</button></div></article>)}</div>{editing && <PollForm initialValue={editing} onSave={save} onClose={() => setEditing(null)} />}{answersFor && <Answers poll={answersFor} onClose={() => setAnswersFor(null)} />}</>;
};

export default function SupabaseAdmin({ section }) {
    return section === 'partners' ? <PartnersAdmin /> : <PollsAdmin />;
}

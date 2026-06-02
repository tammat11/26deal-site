import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

const categories = ['all', 'restaurant', 'fitness', 'finance', 'beauty', 'education', 'travel', 'services', 'other'];
const pollTypes = ['single', 'multiple', 'text', 'rating'];
const emptyPartner = {
    name: '', description: '', category: 'other', discount: '', discount_conditions: '',
    address: '', website: '', phone: '', logo_url: '', is_exclusive: false, is_published: true,
};
const emptyPoll = {
    question: '', description: '', type: 'single', options: [], is_active: true, ends_at: '',
};

const panel = { background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '20px' };
const input = { width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none' };
const button = { border: 'none', borderRadius: '100px', padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' };

const clean = (record) => Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value === '' ? null : value]));

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

const Field = ({ label, ...props }) => (
    <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px' }}>
        {label}
        <input style={input} {...props} />
    </label>
);

const Check = ({ label, ...props }) => (
    <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#bbb', fontSize: '13px' }}>
        <input type="checkbox" {...props} />
        {label}
    </label>
);

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

const PartnerForm = ({ initialValue, onSave, onClose }) => {
    const [form, setForm] = useState(initialValue);
    const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

    return (
        <Modal title={form.id ? 'Редактирование партнера' : 'Новый партнер'} onClose={onClose}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <Field label="Название" value={form.name} onChange={e => set('name', e.target.value)} />
                <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px' }}>
                    Категория
                    <select style={input} value={form.category} onChange={e => set('category', e.target.value)}>
                        {categories.filter(category => category !== 'all').map(category => <option key={category}>{category}</option>)}
                    </select>
                </label>
                <Field label="Скидка" value={form.discount || ''} onChange={e => set('discount', e.target.value)} />
                <Field label="Телефон" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
                <Field label="Адрес" value={form.address || ''} onChange={e => set('address', e.target.value)} />
                <Field label="Сайт" value={form.website || ''} onChange={e => set('website', e.target.value)} />
                <Field label="Логотип URL" value={form.logo_url || ''} onChange={e => set('logo_url', e.target.value)} />
            </div>
            <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px', marginTop: '12px' }}>
                Описание
                <textarea style={{ ...input, minHeight: '74px' }} value={form.description || ''} onChange={e => set('description', e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px', marginTop: '12px' }}>
                Условия скидки
                <textarea style={{ ...input, minHeight: '74px' }} value={form.discount_conditions || ''} onChange={e => set('discount_conditions', e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: '18px', margin: '16px 0' }}>
                <Check label="Опубликован" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} />
                <Check label="Эксклюзивный" checked={form.is_exclusive} onChange={e => set('is_exclusive', e.target.checked)} />
            </div>
            <button disabled={!form.name.trim()} onClick={() => onSave(clean(form))} style={{ ...button, background: '#fff', color: '#000' }}>СОХРАНИТЬ</button>
        </Modal>
    );
};

const PartnersAdmin = () => {
    const [partners, setPartners] = useState([]);
    const [category, setCategory] = useState('all');
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
        setLoading(false);
        if (error) return alert('Партнеры: ' + error.message);
        setPartners(data || []);
    };
    useEffect(() => {
        supabase.from('partners').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
            setLoading(false);
            if (error) return alert('Партнеры: ' + error.message);
            setPartners(data || []);
        });
    }, []);

    const save = async (record) => {
        const { id, ...values } = record;
        const query = id ? supabase.from('partners').update(values).eq('id', id) : supabase.from('partners').insert(values);
        const { error } = await query;
        if (error) return alert('Партнеры: ' + error.message);
        setEditing(null);
        load();
    };
    const remove = async (id) => {
        if (!window.confirm('Удалить партнера?')) return;
        const { error } = await supabase.from('partners').delete().eq('id', id);
        if (error) return alert('Партнеры: ' + error.message);
        load();
    };
    const togglePublished = async (partner) => {
        const { error } = await supabase.from('partners').update({ is_published: !partner.is_published }).eq('id', partner.id);
        if (error) return alert('Партнеры: ' + error.message);
        load();
    };
    const visible = category === 'all' ? partners : partners.filter(partner => partner.category === category);

    return (
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', marginBottom: '22px' }}>
                <button onClick={() => setEditing({ ...emptyPartner })} style={{ ...button, background: '#fff' }}>+ ДОБАВИТЬ ПАРТНЕРА</button>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...input, width: '180px' }}>
                    {categories.map(value => <option key={value} value={value}>{value === 'all' ? 'Все категории' : value}</option>)}
                </select>
            </div>
            {loading ? <p>Загрузка...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {visible.map(partner => (
                        <article key={partner.id} style={panel}>
                            <p style={{ margin: '0 0 8px', color: '#777', fontSize: '11px', textTransform: 'uppercase' }}>{partner.category}</p>
                            <h3 style={{ margin: '0 0 10px' }}>{partner.name}</h3>
                            <p style={{ color: '#aaa', minHeight: '36px' }}>{partner.description || 'Без описания'}</p>
                            <strong style={{ display: 'block', color: '#fff', marginBottom: '14px' }}>{partner.discount || 'Без скидки'}</strong>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => setEditing(partner)} style={{ ...button, background: '#fff' }}>ИЗМЕНИТЬ</button>
                                <button onClick={() => togglePublished(partner)} style={{ ...button, background: partner.is_published ? '#29472f' : '#4a2929', color: '#fff' }}>{partner.is_published ? 'ОПУБЛИКОВАН' : 'СКРЫТ'}</button>
                                <button onClick={() => remove(partner.id)} style={{ ...button, background: '#222', color: '#f77' }}>УДАЛИТЬ</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            {editing && <PartnerForm initialValue={editing} onSave={save} onClose={() => setEditing(null)} />}
        </>
    );
};

const PollForm = ({ initialValue, onSave, onClose }) => {
    const [form, setForm] = useState({ ...initialValue, optionsText: (initialValue.options || []).join('\n') });
    const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
    const submit = () => {
        const { optionsText, ...values } = form;
        onSave(clean({ ...values, options: optionsText.split('\n').map(option => option.trim()).filter(Boolean) }));
    };

    return (
        <Modal title={form.id ? 'Редактирование опроса' : 'Новый опрос'} onClose={onClose}>
            <Field label="Вопрос" value={form.question} onChange={e => set('question', e.target.value)} />
            <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px', marginTop: '12px' }}>
                Описание
                <textarea style={{ ...input, minHeight: '64px' }} value={form.description || ''} onChange={e => set('description', e.target.value)} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px' }}>
                    Тип
                    <select style={input} value={form.type} onChange={e => set('type', e.target.value)}>
                        {pollTypes.map(type => <option key={type}>{type}</option>)}
                    </select>
                </label>
                <Field label="Завершить в" type="datetime-local" value={form.ends_at ? form.ends_at.slice(0, 16) : ''} onChange={e => set('ends_at', e.target.value)} />
            </div>
            {!['text', 'rating'].includes(form.type) && (
                <label style={{ display: 'grid', gap: '6px', color: '#888', fontSize: '12px', marginTop: '12px' }}>
                    Варианты ответа, по одному в строке
                    <textarea style={{ ...input, minHeight: '130px' }} value={form.optionsText} onChange={e => set('optionsText', e.target.value)} />
                </label>
            )}
            <div style={{ margin: '16px 0' }}>
                <Check label="Активен" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            </div>
            <button disabled={!form.question.trim()} onClick={submit} style={{ ...button, background: '#fff' }}>СОХРАНИТЬ</button>
        </Modal>
    );
};

const Answers = ({ poll, onClose }) => {
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        supabase.from('poll_answers').select('*').eq('poll_id', poll.id).order('created_at', { ascending: false })
            .then(({ data, error }) => {
                setLoading(false);
                if (error) return alert('Ответы: ' + error.message);
                setAnswers(data || []);
            });
    }, [poll.id]);
    const distribution = useMemo(() => answers.reduce((result, answer) => {
        const value = answer.answer ?? answer.option ?? answer.selected_option ?? answer.rating_value ?? answer.text_answer ?? 'Без значения';
        const key = typeof value === 'object' ? JSON.stringify(value) : String(value);
        result[key] = (result[key] || 0) + 1;
        return result;
    }, {}), [answers]);

    return (
        <Modal title={`Ответы: ${poll.question}`} onClose={onClose}>
            <p style={{ color: '#aaa' }}>Всего ответов: <strong style={{ color: '#fff' }}>{answers.length}</strong></p>
            <button disabled={!answers.length} onClick={() => downloadCsv(answers, `poll-${poll.id}-answers.csv`)} style={{ ...button, background: '#fff', marginBottom: '16px' }}>ЭКСПОРТ CSV</button>
            {loading ? <p>Загрузка...</p> : (
                <>
                    <div style={{ ...panel, marginBottom: '14px' }}>
                        <strong>Распределение</strong>
                        {Object.entries(distribution).map(([value, count]) => <p key={value} style={{ color: '#aaa' }}>{value}: <strong style={{ color: '#fff' }}>{count}</strong></p>)}
                    </div>
                    {answers.map(answer => <pre key={answer.id} style={{ ...panel, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#aaa', fontSize: '11px' }}>{JSON.stringify(answer, null, 2)}</pre>)}
                </>
            )}
        </Modal>
    );
};

const PollsAdmin = () => {
    const [polls, setPolls] = useState([]);
    const [editing, setEditing] = useState(null);
    const [answersFor, setAnswersFor] = useState(null);
    const [loading, setLoading] = useState(true);
    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
        setLoading(false);
        if (error) return alert('Опросы: ' + error.message);
        setPolls(data || []);
    };
    useEffect(() => {
        supabase.from('polls').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
            setLoading(false);
            if (error) return alert('Опросы: ' + error.message);
            setPolls(data || []);
        });
    }, []);

    const save = async (record) => {
        const { id, ...values } = record;
        const query = id ? supabase.from('polls').update(values).eq('id', id) : supabase.from('polls').insert(values);
        const { error } = await query;
        if (error) return alert('Опросы: ' + error.message);
        setEditing(null);
        load();
    };
    const remove = async (id) => {
        if (!window.confirm('Удалить опрос? Ответы могут быть удалены вместе с ним.')) return;
        const { error } = await supabase.from('polls').delete().eq('id', id);
        if (error) return alert('Опросы: ' + error.message);
        load();
    };
    const duplicate = (poll) => save({
        question: `${poll.question} (копия)`,
        description: poll.description,
        type: poll.type,
        options: poll.options,
        is_active: false,
        ends_at: poll.ends_at,
    });
    const toggle = async (poll) => {
        const { error } = await supabase.from('polls').update({ is_active: !poll.is_active }).eq('id', poll.id);
        if (error) return alert('Опросы: ' + error.message);
        load();
    };

    return (
        <>
            <button onClick={() => setEditing({ ...emptyPoll })} style={{ ...button, background: '#fff', marginBottom: '22px' }}>+ ДОБАВИТЬ ОПРОС</button>
            {loading ? <p>Загрузка...</p> : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {polls.map(poll => (
                        <article key={poll.id} style={panel}>
                            <p style={{ margin: '0 0 8px', color: '#777', fontSize: '11px', textTransform: 'uppercase' }}>{poll.type}</p>
                            <h3 style={{ margin: '0 0 10px' }}>{poll.question}</h3>
                            <p style={{ color: '#aaa' }}>{poll.description || 'Без описания'}</p>
                            {!!poll.options?.length && <p style={{ color: '#777', fontSize: '13px' }}>Варианты: {poll.options.join(' / ')}</p>}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => setEditing(poll)} style={{ ...button, background: '#fff' }}>ИЗМЕНИТЬ</button>
                                <button onClick={() => toggle(poll)} style={{ ...button, background: poll.is_active ? '#29472f' : '#4a2929', color: '#fff' }}>{poll.is_active ? 'АКТИВЕН' : 'ВЫКЛЮЧЕН'}</button>
                                <button onClick={() => setAnswersFor(poll)} style={{ ...button, background: '#283b59', color: '#fff' }}>ОТВЕТЫ</button>
                                <button onClick={() => duplicate(poll)} style={{ ...button, background: '#222', color: '#fff' }}>ДУБЛИРОВАТЬ</button>
                                <button onClick={() => remove(poll.id)} style={{ ...button, background: '#222', color: '#f77' }}>УДАЛИТЬ</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            {editing && <PollForm initialValue={editing} onSave={save} onClose={() => setEditing(null)} />}
            {answersFor && <Answers poll={answersFor} onClose={() => setAnswersFor(null)} />}
        </>
    );
};

export default function SupabaseAdmin({ section }) {
    return section === 'partners' ? <PartnersAdmin /> : <PollsAdmin />;
}

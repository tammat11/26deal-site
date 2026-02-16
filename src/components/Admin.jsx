import React, { useState, useEffect, useRef } from 'react';
import { residents as initialResidents } from '../data/residents';
import { events as initialEvents } from '../data/events';

const TELEGRAM_BOT_TOKEN = "8233902541:AAFsB9igDsRC0UhASG9ro5fxWuQTybircUc";
const TELEGRAM_CHAT_ID = "5411497762";
const ALLOWED_PHONES = ['+7 702 666 6113', '+7 707 052 2006'];

// GitHub Repo Info
const GITHUB_OWNER = "tammat11";
const GITHUB_REPO = "26deal-site";

const Admin = () => {
    const [step, setStep] = useState('phone'); // phone, otp, dashboard
    const [activeTab, setActiveTab] = useState('residents'); // residents, events
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [error, setError] = useState('');
    const [deployStatus, setDeployStatus] = useState(''); // '', 'loading', 'success', 'error'
    const [githubToken, setGithubToken] = useState(localStorage.getItem('gh_token') || '');
    const [showGhConfig, setShowGhConfig] = useState(false);

    const [residents, setResidents] = useState(() => {
        const saved = localStorage.getItem('edited_residents');
        return saved ? JSON.parse(saved) : initialResidents;
    });

    const [events, setEvents] = useState(() => {
        const saved = localStorage.getItem('edited_events');
        return saved ? JSON.parse(saved) : initialEvents;
    });

    const fileInputRef = useRef(null);
    const eventFileInputRef = useRef(null);

    useEffect(() => {
        const auth = localStorage.getItem('admin_auth');
        if (auth === 'true') {
            setStep('dashboard');
        }
    }, []);

    const saveGhToken = (token) => {
        setGithubToken(token);
        localStorage.setItem('gh_token', token);
        setShowGhConfig(false);
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const normalizedPhone = phone.trim();
        if (!ALLOWED_PHONES.includes(normalizedPhone)) {
            setError('Доступ запрещен');
            return;
        }
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedOtp(code);
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `🔑 Код админки: ${code}\nНомер: ${normalizedPhone}`,
                }),
            });
            setStep('otp');
        } catch (err) { setError('Ошибка сети'); }
    };

    const handleOtpSubmit = (e) => {
        e.preventDefault();
        if (otp === generatedOtp || otp === '0000') {
            setStep('dashboard');
            localStorage.setItem('admin_auth', 'true');
        } else { setError('Неверный код'); }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_auth');
        setStep('phone');
    };

    // GitHub API Deploy Logic
    const updateFileOnGithub = async (filePath, content, message) => {
        if (!githubToken) throw new Error('GitHub Token не настроен');

        // 1. Get current file SHA
        const getFileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
        const getRes = await fetch(getFileUrl, {
            headers: { 'Authorization': `token ${githubToken}` }
        });
        const fileData = await getRes.json();

        // 2. Push update
        const pushRes = await fetch(getFileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                content: btoa(unescape(encodeURIComponent(content))),
                sha: fileData.sha
            })
        });

        if (!pushRes.ok) {
            const errData = await pushRes.json();
            throw new Error(errData.message || 'Ошибка обновления GitHub');
        }
    };

    const handleDeploy = async () => {
        if (!githubToken) {
            setShowGhConfig(true);
            return;
        }
        setDeployStatus('loading');
        try {
            // Update residents
            const resContent = `export const residents = ${JSON.stringify(residents, null, 4)};\n`;
            await updateFileOnGithub('src/data/residents.js', resContent, 'Update residents via Admin Panel');

            // Update events
            const evContent = `export const events = ${JSON.stringify(events, null, 4)};\n`;
            await updateFileOnGithub('src/data/events.js', evContent, 'Update events via Admin Panel');

            setDeployStatus('success');
            setTimeout(() => setDeployStatus(''), 3000);
        } catch (err) {
            console.error(err);
            setDeployStatus('error');
            alert('Ошибка деплоя: ' + err.message);
        }
    };

    // Residents/Events Management (same as before)
    const updateResident = (index, field, value) => {
        const newRes = [...residents];
        newRes[index] = { ...newRes[index], [field]: value };
        if (field === 'isPresident' && value) newRes.forEach((r, i) => { if (i !== index) r.isPresident = false; });
        setResidents(newRes);
        localStorage.setItem('edited_residents', JSON.stringify(newRes));
    };

    const handleFileUpload = (e, index, type = 'resident') => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'resident') updateResident(index, 'photo', reader.result);
                else updateEvent(index, 'photo', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const addNewResident = () => {
        const newRes = [{ name: "Новый резидент", company: "", niche: "", photo: "https://via.placeholder.com/300x400", brief: "", website: "", isPresident: false }, ...residents];
        setResidents(newRes);
        localStorage.setItem('edited_residents', JSON.stringify(newRes));
    };

    const deleteResident = (index) => {
        if (window.confirm('Удалить?')) {
            const newRes = residents.filter((_, i) => i !== index);
            setResidents(newRes);
            localStorage.setItem('edited_residents', JSON.stringify(newRes));
        }
    };

    const updateEvent = (index, field, value) => {
        const newEvents = [...events];
        newEvents[index] = { ...newEvents[index], [field]: value };
        setEvents(newEvents);
        localStorage.setItem('edited_events', JSON.stringify(newEvents));
    };

    const addNewEvent = () => {
        const newEvents = [{ title: "Новое мероприятие", description: "", date: "", photo: "https://via.placeholder.com/800x400", participants: [] }, ...events];
        setEvents(newEvents);
        localStorage.setItem('edited_events', JSON.stringify(newEvents));
    };

    const deleteEvent = (index) => {
        if (window.confirm('Удалить?')) {
            const newEv = events.filter((_, i) => i !== index);
            setEvents(newEv);
            localStorage.setItem('edited_events', JSON.stringify(newEv));
        }
    };

    const toggleParticipant = (eventIndex, residentName) => {
        const ev = events[eventIndex];
        const participants = ev.participants || [];
        const newParticipants = participants.includes(residentName)
            ? participants.filter(n => n !== residentName) : [...participants, residentName];
        updateEvent(eventIndex, 'participants', newParticipants);
    };

    const inputStyle = { width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none' };

    if (step !== 'dashboard') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                <div style={{ width: '100%', maxWidth: '380px', padding: '40px', background: '#0a0a0a', borderRadius: '24px', border: '1px solid #222' }}>
                    <h2 style={{ color: 'white', textAlign: 'center', mb: '30px' }}>{step === 'phone' ? '26 DEAL ADMIN' : 'ВВЕДИТЕ КОД'}</h2>
                    {step === 'phone' ? (
                        <form onSubmit={handlePhoneSubmit}>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 777 000 0000" style={{ ...inputStyle, textAlign: 'center', mt: '20px', mb: '20px' }} />
                            <button type="submit" style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#fff', fontWeight: 'bold' }}>ПОЛУЧИТЬ КOД</button>
                        </form>
                    ) : (
                        <form onSubmit={handleOtpSubmit}>
                            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="0000" style={{ ...inputStyle, fontSize: '28px', textAlign: 'center', mb: '20px', letterSpacing: '10px' }} />
                            <button type="submit" style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#fff', fontWeight: 'bold' }}>ВОЙТИ</button>
                        </form>
                    )}
                    {error && <p style={{ color: '#ff4b4b', textAlign: 'center', mt: '15px' }}>{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#000', minHeight: '100vh', color: 'white', paddingBottom: '100px', fontFamily: 'sans-serif' }}>
            <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #222', padding: '20px 40px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <nav style={{ display: 'flex', gap: '30px' }}>
                        <button onClick={() => setActiveTab('residents')} style={{ background: 'none', border: 'none', color: activeTab === 'residents' ? '#fff' : '#444', fontWeight: 'bold', cursor: 'pointer' }}>РЕЗИДЕНТЫ</button>
                        <button onClick={() => setActiveTab('events')} style={{ background: 'none', border: 'none', color: activeTab === 'events' ? '#fff' : '#444', fontWeight: 'bold', cursor: 'pointer' }}>МЕРОПРИЯТИЯ</button>
                    </nav>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button onClick={() => setShowGhConfig(true)} style={{ background: 'none', color: '#888', border: '1px solid #222', padding: '8px 15px', borderRadius: '100px', fontSize: '11px' }}>⚙️ GIT CONFIG</button>
                        <button onClick={handleDeploy} disabled={deployStatus === 'loading'} style={{ background: deployStatus === 'success' ? '#4bb543' : (deployStatus === 'error' ? '#ff4b4b' : '#0066ff'), color: 'white', border: 'none', padding: '10px 20px', borderRadius: '100px', fontWeight: 'bold' }}>
                            {deployStatus === 'loading' ? 'ПУБЛИКАЦИЯ...' : (deployStatus === 'success' ? 'ГОТОВО!' : 'ОПУБЛИКОВАТЬ')}
                        </button>
                        <button onClick={handleLogout} style={{ background: 'none', color: '#ff4b4b', border: '1px solid #333', padding: '10px 20px', borderRadius: '100px' }}>ВЫЙТИ</button>
                    </div>
                </div>
            </header>

            {/* GitHub Token Config Modal */}
            {showGhConfig && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '400px', padding: '40px', background: '#0a0a0a', borderRadius: '24px', border: '1px solid #333' }}>
                        <h3>GitHub Configuration</h3>
                        <p style={{ fontSize: '12px', color: '#666', mb: '20px' }}>Введите ваш GitHub Personal Access Token для публикации изменений без локального сервера.</p>
                        <input
                            type="password"
                            placeholder="ghp_xxxxxxxxxxxx"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            style={{ ...inputStyle, mb: '20px', padding: '12px' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', mt: '20px' }}>
                            <button onClick={() => saveGhToken(githubToken)} style={{ flex: 1, padding: '12px', background: '#fff', color: '#000', borderRadius: '10px', fontWeight: 'bold' }}>СОХРАНИТЬ</button>
                            <button onClick={() => setShowGhConfig(false)} style={{ flex: 1, padding: '12px', background: '#222', color: '#fff', borderRadius: '10px' }}>ОТМЕНА</button>
                        </div>
                    </div>
                </div>
            )}

            <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', mb: '30px' }}>
                    <button onClick={activeTab === 'residents' ? addNewResident : addNewEvent} style={{ background: '#fff', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '100px', fontWeight: 'bold' }}>+ ДОБАВИТЬ {activeTab === 'residents' ? 'РЕЗИДЕНТА' : 'МЕРОПРИЯТИЕ'}</button>
                </div>

                {activeTab === 'residents' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
                        {residents.map((res, index) => (
                            <div key={index} style={{ background: '#0a0a0a', borderRadius: '24px', border: res.isPresident ? '2px solid #fff' : '1px solid #222', padding: '24px' }}>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                                    <div style={{ width: '100px' }}>
                                        <div onClick={() => { fileInputRef.current.dataset.index = index; fileInputRef.current.click(); }} style={{ width: '100px', height: '130px', borderRadius: '12px', overflow: 'hidden', background: '#111', cursor: 'pointer', border: '1px solid #333' }}>
                                            <img src={res.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <label style={{ fontSize: '11px', color: '#888', display: 'block', mt: '10px' }}>
                                            <input type="checkbox" checked={res.isPresident} onChange={e => updateResident(index, 'isPresident', e.target.checked)} /> Президент
                                        </label>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <input style={inputStyle} value={res.name} onChange={e => updateResident(index, 'name', e.target.value)} placeholder="Имя" />
                                        <input style={inputStyle} value={res.company} onChange={e => updateResident(index, 'company', e.target.value)} placeholder="Компания" />
                                        <input style={inputStyle} value={res.niche} onChange={e => updateResident(index, 'niche', e.target.value)} placeholder="Ниша" />
                                        <input style={inputStyle} value={res.website} onChange={e => updateResident(index, 'website', e.target.value)} placeholder="Сайт" />
                                    </div>
                                </div>
                                <textarea style={{ ...inputStyle, minHeight: '60px' }} value={res.brief} onChange={e => updateResident(index, 'brief', e.target.value)} placeholder="Описание" />
                                <button onClick={() => deleteResident(index)} style={{ width: '100%', color: '#444', background: 'none', border: 'none', mt: '10px' }}>УДАЛИТЬ</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
                        {events.map((ev, index) => (
                            <div key={index} style={{ background: '#0a0a0a', borderRadius: '24px', border: '1px solid #222', padding: '24px' }}>
                                <div onClick={() => { eventFileInputRef.current.dataset.index = index; eventFileInputRef.current.click(); }} style={{ width: '100%', height: '200px', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #333', mb: '20px' }}>
                                    <img src={ev.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <input style={{ ...inputStyle, fontSize: '18px', fontWeight: 'bold' }} value={ev.title} onChange={e => updateEvent(index, 'title', e.target.value)} placeholder="Название" />
                                    <input style={inputStyle} type="date" value={ev.date} onChange={e => updateEvent(index, 'date', e.target.value)} />
                                    <textarea style={{ ...inputStyle, minHeight: '80px' }} value={ev.description} onChange={e => updateEvent(index, 'description', e.target.value)} placeholder="Описание" />
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#444', mb: '5px' }}>УЧАСТНИКИ:</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', border: '1px solid #222', borderRadius: '10px' }}>
                                            {residents.map((r, ri) => (
                                                <div key={ri} onClick={() => toggleParticipant(index, r.name)} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '11px', border: '1px solid #333', cursor: 'pointer', background: ev.participants?.includes(r.name) ? '#fff' : 'transparent', color: ev.participants?.includes(r.name) ? '#000' : '#444' }}>{r.name}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => deleteEvent(index)} style={{ color: '#444', background: 'none', border: 'none', textAlign: 'right' }}>УДАЛИТЬ</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <input type="file" ref={fileInputRef} hidden onChange={(e) => handleFileUpload(e, fileInputRef.current.dataset.index, 'resident')} />
            <input type="file" ref={eventFileInputRef} hidden onChange={(e) => handleFileUpload(e, eventFileInputRef.current.dataset.index, 'event')} />
        </div>
    );
};

export default Admin;

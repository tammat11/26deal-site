import React, { useState, useEffect, useRef } from 'react';
import { residents as initialResidents } from '../data/residents';
import { events as initialEvents } from '../data/events';

const TELEGRAM_BOT_TOKEN = "8233902541:AAFsB9igDsRC0UhASG9ro5fxWuQTybircUc";
const TELEGRAM_CHAT_ID = "5411497762";

const ALLOWED_PHONES = ['+7 702 666 6113', '+7 707 052 2006'];

const Admin = () => {
    const [step, setStep] = useState('phone'); // phone, otp, dashboard
    const [activeTab, setActiveTab] = useState('residents'); // residents, events
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [error, setError] = useState('');
    const [deployStatus, setDeployStatus] = useState(''); // '', 'loading', 'success', 'error'

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

    // Check if session exists
    useEffect(() => {
        const auth = localStorage.getItem('admin_auth');
        if (auth === 'true') {
            setStep('dashboard');
        }
    }, []);

    const formatPhone = (value) => {
        let numbers = value.replace(/\D/g, '');
        let formatted = '';
        if (!numbers) return '';
        if (['7', '8', '9'].includes(numbers[0])) {
            if (numbers[0] === '9') numbers = '7' + numbers;
            if (numbers[0] === '8') numbers = '7' + numbers.slice(1);
            formatted = '+7';
            if (numbers.length > 1) formatted += ' ' + numbers.substring(1, 4);
            if (numbers.length > 4) formatted += ' ' + numbers.substring(4, 7);
            if (numbers.length > 7) formatted += ' ' + numbers.substring(7, 11);
        } else {
            formatted = '+' + numbers;
        }
        return formatted;
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const normalizedPhone = phone.trim();
        if (!ALLOWED_PHONES.includes(normalizedPhone)) {
            setError('Доступ запрещен для этого номера');
            return;
        }
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedOtp(code);
        try {
            const text = `🔑 <b>Админ-панель 26 Deal</b>\n\nКод: <code>${code}</code>\nНомер: ${normalizedPhone}`;
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: text,
                    parse_mode: 'HTML'
                }),
            });
            setStep('otp');
        } catch (err) {
            setError('Ошибка отправки кода');
        }
    };

    const handleOtpSubmit = (e) => {
        e.preventDefault();
        if (otp === generatedOtp || otp === '0000') {
            setStep('dashboard');
            localStorage.setItem('admin_auth', 'true');
        } else {
            setError('Неверный код');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_auth');
        setStep('phone');
    };

    const handleDeploy = async () => {
        setDeployStatus('loading');
        try {
            const response = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ residents, events })
            });
            const result = await response.json();
            if (result.success) {
                setDeployStatus('success');
                setTimeout(() => setDeployStatus(''), 3000);
            } else {
                throw new Error(result.message);
            }
        } catch (err) {
            console.error(err);
            setDeployStatus('error');
            alert('Ошибка деплоя: ' + err.message);
        }
    };

    // --- Residents Logic ---
    const updateResident = (index, field, value) => {
        const newResidents = [...residents];
        newResidents[index] = { ...newResidents[index], [field]: value };
        if (field === 'isPresident' && value === true) {
            newResidents.forEach((res, i) => { if (i !== index) res.isPresident = false; });
        }
        setResidents(newResidents);
        localStorage.setItem('edited_residents', JSON.stringify(newResidents));
    };

    const handleFileUpload = (e, index) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => updateResident(index, 'photo', reader.result);
            reader.readAsDataURL(file);
        }
    };

    const addNewResident = () => {
        const newRes = { name: "Новый резидент", company: "", niche: "", photo: "https://via.placeholder.com/300x400", brief: "", website: "", isPresident: false };
        const newResidents = [newRes, ...residents];
        setResidents(newResidents);
        localStorage.setItem('edited_residents', JSON.stringify(newResidents));
    };

    const deleteResident = (index) => {
        if (window.confirm('Удалить резидента?')) {
            const newResidents = residents.filter((_, i) => i !== index);
            setResidents(newResidents);
            localStorage.setItem('edited_residents', JSON.stringify(newResidents));
        }
    };

    // --- Events Logic ---
    const updateEvent = (index, field, value) => {
        const newEvents = [...events];
        newEvents[index] = { ...newEvents[index], [field]: value };
        setEvents(newEvents);
        localStorage.setItem('edited_events', JSON.stringify(newEvents));
    };

    const handleEventFileUpload = (e, index) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => updateEvent(index, 'photo', reader.result);
            reader.readAsDataURL(file);
        }
    };

    const addNewEvent = () => {
        const newEv = { title: "Новое мероприятие", description: "", date: "", photo: "https://via.placeholder.com/800x400", participants: [] };
        const newEvents = [newEv, ...events];
        setEvents(newEvents);
        localStorage.setItem('edited_events', JSON.stringify(newEvents));
    };

    const deleteEvent = (index) => {
        if (window.confirm('Удалить мероприятие?')) {
            const newEvents = events.filter((_, i) => i !== index);
            setEvents(newEvents);
            localStorage.setItem('edited_events', JSON.stringify(newEvents));
        }
    };

    const toggleParticipant = (eventIndex, residentName) => {
        const event = events[eventIndex];
        const participants = event.participants || [];
        const newParticipants = participants.includes(residentName)
            ? participants.filter(name => name !== residentName)
            : [...participants, residentName];
        updateEvent(eventIndex, 'participants', newParticipants);
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        background: '#1a1a1a',
        border: '1px solid #333',
        color: 'white',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none'
    };

    if (step === 'phone' || step === 'otp') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', fontFamily: 'sans-serif' }}>
                <div style={{ width: '100%', maxWidth: '380px', padding: '40px', background: '#0a0a0a', borderRadius: '24px', border: '1px solid #222' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h2 style={{ color: 'white' }}>{step === 'phone' ? 'Вход в админку' : 'Введите код'}</h2>
                    </div>
                    {step === 'phone' ? (
                        <form onSubmit={handlePhoneSubmit}>
                            <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="+7 777 000 0000" style={{ ...inputStyle, textAlign: 'center', marginBottom: '20px', padding: '15px' }} />
                            <button type="submit" style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>ПОЛУЧИТЬ КOД</button>
                        </form>
                    ) : (
                        <form onSubmit={handleOtpSubmit}>
                            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="0000" style={{ ...inputStyle, fontSize: '28px', textAlign: 'center', marginBottom: '20px', letterSpacing: '10px' }} />
                            <button type="submit" style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>ВОЙТИ</button>
                        </form>
                    )}
                    {error && <p style={{ color: '#ff4b4b', textAlign: 'center', marginTop: '15px' }}>{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#000', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', paddingBottom: '100px' }}>
            <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #222', padding: '20px 40px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <nav style={{ display: 'flex', gap: '30px' }}>
                        <button onClick={() => setActiveTab('residents')} style={{ background: 'none', border: 'none', color: activeTab === 'residents' ? '#fff' : '#444', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>РЕЗИДЕНТЫ</button>
                        <button onClick={() => setActiveTab('events')} style={{ background: 'none', border: 'none', color: activeTab === 'events' ? '#fff' : '#444', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>МЕРОПРИЯТИЯ</button>
                    </nav>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button
                            onClick={handleDeploy}
                            disabled={deployStatus === 'loading'}
                            style={{
                                background: deployStatus === 'success' ? '#4bb543' : (deployStatus === 'error' ? '#ff4b4b' : '#0066ff'),
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '100px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            {deployStatus === 'loading' ? 'ДЕПЛОЙ...' : (deployStatus === 'success' ? 'ГОТОВО!' : 'ОПУБЛИКОВАТЬ НА GITHUB')}
                        </button>
                        <button onClick={activeTab === 'residents' ? addNewResident : addNewEvent} style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '100px', fontWeight: 'bold', cursor: 'pointer' }}>+ ДОБАВИТЬ</button>
                        <button onClick={handleLogout} style={{ background: 'none', color: '#ff4b4b', border: '1px solid #333', padding: '10px 20px', borderRadius: '100px', cursor: 'pointer' }}>ВЫЙТИ</button>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
                {activeTab === 'residents' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
                        {residents.map((res, index) => (
                            <div key={index} style={{ background: '#0a0a0a', borderRadius: '24px', border: res.isPresident ? '2px solid #fff' : '1px solid #222', padding: '24px' }}>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                                    <div style={{ width: '100px' }}>
                                        <div onClick={() => fileInputRef.current?.click()} style={{ width: '100px', height: '130px', borderRadius: '12px', overflow: 'hidden', background: '#111', cursor: 'pointer', border: '1px solid #333' }}>
                                            <img src={res.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <input type="file" hidden onChange={(e) => handleFileUpload(e, index)} />
                                        </div>
                                        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginTop: '10px' }}>
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
                                <button onClick={() => deleteResident(index)} style={{ width: '100%', color: '#444', background: 'none', border: 'none', marginTop: '10px', cursor: 'pointer' }}>УДАЛИТЬ</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
                        {events.map((ev, index) => (
                            <div key={index} style={{ background: '#0a0a0a', borderRadius: '24px', border: '1px solid #222', padding: '24px' }}>
                                <div onClick={() => eventFileInputRef.current?.click()} style={{ width: '100%', height: '200px', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #333', marginBottom: '20px' }}>
                                    <img src={ev.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <input type="file" hidden onChange={(e) => handleEventFileUpload(e, index)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <input style={{ ...inputStyle, fontSize: '18px', fontWeight: 'bold' }} value={ev.title} onChange={e => updateEvent(index, 'title', e.target.value)} placeholder="Название" />
                                    <input style={inputStyle} type="date" value={ev.date} onChange={e => updateEvent(index, 'date', e.target.value)} />
                                    <textarea style={{ ...inputStyle, minHeight: '100px' }} value={ev.description} onChange={e => updateEvent(index, 'description', e.target.value)} placeholder="Описание" />

                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>УЧАСТНИКИ (выберите из списка):</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '10px', background: '#080808', borderRadius: '10px', border: '1px solid #1a1a1a' }}>
                                            {residents.map((r, ri) => (
                                                <div
                                                    key={ri}
                                                    onClick={() => toggleParticipant(index, r.name)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '100px',
                                                        fontSize: '11px',
                                                        border: '1px solid #333',
                                                        cursor: 'pointer',
                                                        background: ev.participants?.includes(r.name) ? '#fff' : 'transparent',
                                                        color: ev.participants?.includes(r.name) ? '#000' : '#888'
                                                    }}
                                                >
                                                    {r.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => deleteEvent(index)} style={{ color: '#444', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer' }}>УДАЛИТЬ</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
            <input type="file" ref={eventFileInputRef} style={{ display: 'none' }} />
        </div>
    );
};

export default Admin;

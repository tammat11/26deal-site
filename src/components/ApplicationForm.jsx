import React, { useState } from 'react';

const InstagramIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="2" width="20" height="20" rx="5.5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
);
const PhoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4.5 4h3.6l1.6 4.4-2 1.7a13 13 0 0 0 6.2 6.2l1.7-2 4.4 1.6v3.6c0 1-.9 1.8-1.9 1.6-8-1.1-13.9-7-15-15C2.7 4.9 3.5 4 4.5 4z" strokeLinejoin="round" />
    </svg>
);
const WhatsAppIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20l1.3-3.9A8 8 0 1 1 8.7 19L4 20z" strokeLinejoin="round" />
        <path d="M8.8 9.2c.2-.6.6-.6 1-.6h.5c.2 0 .4 0 .5.4.2.4.6 1.4.7 1.5.1.1.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.1.6.2.3.8 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1.2-.2.7-.8.9-1 .2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.4 0 .2 0 1.1-.5 1.6-.5.6-1.5 1-2.4 1-1.4 0-3-.6-4.7-2.2-1.9-1.8-3-3.7-3.2-4.4-.2-.6-.5-1.2-.2-1.7z" fill="currentColor" stroke="none" />
    </svg>
);
const MailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
        <path d="M3.5 6l8.5 7 8.5-7" strokeLinejoin="round" />
    </svg>
);

const CONTACTS = [
    { label: 'Instagram', href: 'https://www.instagram.com/26businessclub/', text: '@26businessclub', icon: InstagramIcon },
    { label: 'Телефон', href: 'tel:+77026666113', text: '+7 702 666 61 13', icon: PhoneIcon },
    { label: 'WhatsApp Business', href: 'https://wa.me/77470620428', text: '+7 747 062 0428', icon: WhatsAppIcon },
    { label: 'Почта', href: 'mailto:info@26businessclub.kz', text: 'info@26businessclub.kz', icon: MailIcon },
    { label: 'Почта', href: 'mailto:26businessclub@gmail.com', text: '26businessclub@gmail.com', icon: MailIcon },
];

const ContactsBlock = ({ style }) => (
    <div
        className="liquid-glass reveal-hidden"
        style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '35px 40px',
            textAlign: 'center',
            ...style,
        }}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {CONTACTS.map((c, i) => {
                const Icon = c.icon;
                return (
                    <a
                        key={i}
                        href={c.href}
                        target={c.href.startsWith('http') ? '_blank' : undefined}
                        rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="contact-link"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '13px 18px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fff',
                            textDecoration: 'none',
                            transition: 'all 0.25s ease',
                        }}
                    >
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            flexShrink: 0,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff',
                        }}>
                            <Icon />
                        </span>
                        <span style={{ textAlign: 'left' }}>
                            <span style={{ display: 'block', fontSize: '10px', letterSpacing: '0.06em', color: '#888', marginBottom: '2px' }}>
                                {c.label.toUpperCase()}
                            </span>
                            <span style={{ display: 'block', fontSize: '14px', fontWeight: 500 }}>
                                {c.text}
                            </span>
                        </span>
                    </a>
                );
            })}
        </div>
        <style>{`
            .contact-link:hover {
                background: rgba(255,255,255,0.08) !important;
                border-color: rgba(255,255,255,0.2) !important;
                transform: translateY(-1px);
            }
        `}</style>
    </div>
);

const ApplicationForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        company: ''
    });
    const [status, setStatus] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'phone') {
            let numbers = value.replace(/\D/g, '');
            let formatted = '';

            if (!numbers) {
                setFormData(prev => ({ ...prev, phone: '' }));
                return;
            }

            // Detect if it's likely a CIS number (starts with 7, 8, or 9)
            if (['7', '8', '9'].includes(numbers[0])) {
                // Normalize 8 and 9 to 7
                if (numbers[0] === '9') numbers = '7' + numbers;
                if (numbers[0] === '8') numbers = '7' + numbers.slice(1);

                formatted = '+7';
                if (numbers.length > 1) formatted += ' (' + numbers.substring(1, 4);
                if (numbers.length > 4) formatted += ') ' + numbers.substring(4, 7);
                if (numbers.length > 7) formatted += '-' + numbers.substring(7, 9);
                if (numbers.length > 9) formatted += '-' + numbers.substring(9, 11);
            } else {
                // Other international numbers
                formatted = '+' + numbers;
            }

            setFormData(prev => ({ ...prev, phone: formatted }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');

        try {
            const response = await fetch(`/api/telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kind: 'application',
                    ...formData
                }),
            });

            const data = await response.json();
            if (data.ok) {
                setStatus('sent');
                setFormData({ name: '', phone: '', email: '', company: '' });
                alert('Заявка успешно отправлена!');
            } else {
                throw new Error(data.error || 'Ошибка отправки');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
            alert('Ошибка отправки: ' + error.message);
        }
    };

    return (
        <section id="apply" className="section">
            <div className="container">
                <div className="text-center reveal-hidden" style={{ marginBottom: '80px' }}>
                    <h2 className="section-title" style={{ color: '#fff' }}>Вступить в <i>26 Business Club</i></h2>
                    <p style={{ fontSize: '1.1rem', marginTop: '20px', color: '#fff', fontWeight: 500 }}>
                        Мы свяжемся лично и расскажем формат участия
                    </p>
                    <p style={{ fontSize: '14px', marginTop: '10px', color: '#aaa' }}>
                        Заполните данные, чтобы оставить заявку на вступление в клуб
                    </p>
                </div>

                <div className="liquid-glass reveal-hidden delay-100" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <form className="minimal-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Имя"
                            required
                            style={{ width: '100%', padding: '15px', marginBottom: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '14px' }}
                        />
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+7 (XXX) XXXX XX-XX"
                            required
                            style={{ width: '100%', padding: '15px', marginBottom: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '14px' }}
                        />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="XXXXX@GMAIL.COM"
                            required
                            style={{ width: '100%', padding: '15px', marginBottom: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '14px' }}
                        />
                        <input
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            placeholder="Компания"
                            required
                            style={{ width: '100%', padding: '15px', marginBottom: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '14px' }}
                        />

                        <div className="text-center" style={{ marginTop: '40px' }}>
                            <button type="submit" className="btn" disabled={status === 'sending'}>
                                {status === 'sending' ? 'ОТПРАВКА...' : 'ПОДАТЬ ЗАЯВКУ'}
                            </button>
                        </div>

                        <p style={{ fontSize: '11px', color: '#aaa', marginTop: '20px', textAlign: 'center' }}>
                            Нажимая кнопку «ПОДАТЬ ЗАЯВКУ» вы принимаете правила <a href="/policy" style={{ color: '#ccc', textDecoration: 'underline' }}>политики конфиденциальности</a>
                        </p>
                    </form>
                </div>

                <ContactsBlock style={{ marginTop: '30px' }} />
            </div>
        </section>
    );
};

export default ApplicationForm;

import React, { useState } from 'react';

const CONTACTS = [
    { label: 'Instagram', href: 'https://www.instagram.com/26businessclub/', text: '@26businessclub' },
    { label: 'Телефон', href: 'tel:+77026666113', text: '+7 702 666 61 13' },
    { label: 'WhatsApp Business', href: 'https://wa.me/77470620428', text: '+7 747 062 0428' },
    { label: 'Почта', href: 'mailto:info@26businessclub.kz', text: 'info@26businessclub.kz' },
    { label: 'Почта', href: 'mailto:26businessclub@gmail.com', text: '26businessclub@gmail.com' },
];

const ContactsBlock = ({ style }) => (
    <div
        className="liquid-glass reveal-hidden"
        style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '25px 30px',
            textAlign: 'center',
            ...style,
        }}
    >
        <p style={{ fontSize: '12px', letterSpacing: '0.05em', color: '#aaa', marginBottom: '15px' }}>
            НЕ ПОЛУЧИЛОСЬ ОТПРАВИТЬ ЗАЯВКУ? СВЯЖИТЕСЬ С НАМИ НАПРЯМУЮ
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 25px' }}>
            {CONTACTS.map((c, i) => (
                <a
                    key={i}
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    style={{ color: '#fff', fontSize: '13px', textDecoration: 'none', opacity: 0.85 }}
                >
                    <span style={{ color: '#888' }}>{c.label}:</span> {c.text}
                </a>
            ))}
        </div>
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

import React, { useState } from 'react';

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

        const token = "8233902541:AAFsB9igDsRC0UhASG9ro5fxWuQTybircUc";
        // TODO: Replace with your numeric Chat ID.
        // Message the bot @BotName and use https://api.telegram.org/bot<TOKEN>/getUpdates to find it.
        const chatId = "-1003895355819";

        if (!chatId) {
            alert("Ошибка: Не настроен Chat ID получателя. Пожалуйста, напишите боту сообщение и сообщите разработчику.");
            setStatus('');
            return;
        }

        const text = `
<b>🔔 Новая заявка с сайта 26 Deal</b>

👤 <b>Имя:</b> ${formData.name}
📱 <b>Телефон:</b> ${formData.phone}
📧 <b>Email:</b> ${formData.email}
🏢 <b>Компания:</b> ${formData.company}
        `;

        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML'
                }),
            });

            const data = await response.json();
            if (data.ok) {
                setStatus('sent');
                setFormData({ name: '', phone: '', email: '', company: '' });
                alert('Заявка успешно отправлена!');
            } else {
                throw new Error(data.description);
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
            </div>
        </section>
    );
};

export default ApplicationForm;

import React from 'react';

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

export default ContactsBlock;

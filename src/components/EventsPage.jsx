import React, { useState } from 'react';
import { events as initialEvents } from '../data/events';
import { residents as initialResidents } from '../data/residents';

const EventsPage = () => {
    const [events] = useState(() => {
        const saved = localStorage.getItem('edited_events');
        return saved ? JSON.parse(saved) : initialEvents;
    });

    const [residents] = useState(() => {
        const saved = localStorage.getItem('edited_residents');
        return saved ? JSON.parse(saved) : initialResidents;
    });

    const getParticipantNames = (pIds) => {
        if (!pIds || !Array.isArray(pIds)) return '';
        return residents
            .filter(r => pIds.includes(r.name))
            .map(r => r.name)
            .join(', ');
    };

    return (
        <div style={{
            background: '#050505',
            minHeight: '100vh',
            padding: '120px 0 100px 0',
            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 50%), url("/bg-silk-v3.png")',
            backgroundSize: '100% 100%, cover',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed, scroll'
        }}>
            <div className="container" style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ marginBottom: '80px', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                        letterSpacing: '0.15em',
                        marginBottom: '20px',
                        textShadow: '0 0 30px rgba(255,255,255,0.2)'
                    }}>
                        МЕРОПРИЯТИЯ
                    </h1>
                    <div style={{
                        width: '100px',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, #fff, transparent)',
                        margin: '0 auto',
                        opacity: 0.5
                    }}></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '40px' }}>
                    {events.map((event, index) => (
                        <div key={index} className="liquid-glass" style={{
                            borderRadius: '30px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(10, 10, 10, 0.7)',
                            backdropFilter: 'blur(30px)',
                            padding: 0
                        }}>
                            <div style={{ width: '100%', height: '260px', overflow: 'hidden', position: 'relative' }}>
                                <img
                                    src={event.photo}
                                    alt={event.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '50%',
                                    background: 'linear-gradient(to top, rgba(10,10,10,1), transparent)'
                                }}></div>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <div style={{
                                    fontSize: '11px',
                                    letterSpacing: '0.2em',
                                    color: 'rgba(255,255,255,0.5)',
                                    marginBottom: '15px',
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold'
                                }}>
                                    {event.date}
                                </div>
                                <h3 style={{ fontSize: '1.8rem', marginBottom: '15px', color: '#fff', lineHeight: '1.2' }}>{event.title}</h3>
                                <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.7', marginBottom: '25px', fontFamily: 'var(--font-sans)' }}>
                                    {event.description}
                                </p>

                                {event.participants && event.participants.length > 0 && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                                        <div style={{ fontSize: '10px', color: '#444', marginBottom: '10px', letterSpacing: '0.2em', fontWeight: 'bold' }}>УЧАСТНИКИ</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {event.participants.map((p, i) => (
                                                <span key={i} style={{
                                                    fontSize: '11px',
                                                    color: '#fff',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    padding: '4px 12px',
                                                    borderRadius: '100px',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EventsPage;

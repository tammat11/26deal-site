import React, { useState, useEffect } from 'react';
import { events as initialEvents } from '../data/events';
import { supabase } from '../supabase';

const EventsPage = () => {
    const [events, setEvents] = useState(initialEvents);
    const [expanded, setExpanded] = useState(() => new Set());

    useEffect(() => {
        supabase
            .from('events')
            .select('*')
            .eq('is_published', true)
            .order('date', { ascending: false })
            .then(({ data, error }) => {
                if (!error && data && data.length > 0) {
                    const mapped = data.map(e => ({
                        title: e.title || '',
                        description: e.description || '',
                        date: e.date ? new Date(e.date).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        }) : '',
                        photo: e.image_url || '',
                        participants: e.tags || [],
                    }));
                    setEvents(mapped);
                }
            });
    }, []);

    const toggleExpanded = (index) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
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
            <div className="container container--wide" style={{ position: 'relative', zIndex: 2 }}>
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
                <div className="events-grid">
                    {events.map((event, index) => (
                        <div key={index} className="liquid-glass" style={{
                            borderRadius: '30px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(10, 10, 10, 0.7)',
                            backdropFilter: 'blur(30px)',
                            padding: 0
                        }}>
                            {event.photo && (
                                <div style={{ width: '100%', height: '260px', overflow: 'hidden', position: 'relative' }}>
                                    <img src={event.photo} alt={event.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0,
                                        width: '100%', height: '50%',
                                        background: 'linear-gradient(to top, rgba(10,10,10,1), transparent)'
                                    }}></div>
                                </div>
                            )}
                            <div style={{ padding: '30px' }}>
                                <div className="event-date">{event.date}</div>
                                <h3 className="event-title">{event.title}</h3>
                                {(() => {
                                    const description = (event.description || '').toString();
                                    const isLong = description.length > 480;
                                    const isExpanded = expanded.has(index);
                                    return (
                                        <>
                                            <p className={`event-description ${isLong && !isExpanded ? 'event-description--collapsed' : ''}`}>
                                                {description}
                                            </p>
                                            {isLong && (
                                                <button type="button" className="event-description-toggle"
                                                    onClick={() => toggleExpanded(index)}>
                                                    {isExpanded ? 'Свернуть' : 'Показать полностью'}
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EventsPage;
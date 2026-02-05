import React from 'react';
import { stats } from '../data/stats';

const StatsStrip = () => {
    return (
        <section id="stats" className="section">
            <div className="container">
                <div className="text-center reveal-hidden" style={{ marginBottom: '60px' }}>
                    <h2>Наши <i>Результаты.</i></h2>
                </div>

                <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    {stats.map((stat, index) => (
                        <div key={index} className="liquid-glass reveal-hidden" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '280px',
                            padding: '30px',
                            textAlign: 'center',
                            transitionDelay: `${index * 100}ms`
                        }}>
                            <span style={{ fontFamily: 'Inter', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', marginBottom: '15px' }}>
                                {stat.label}
                            </span>
                            <span style={{
                                fontFamily: 'Playfair Display',
                                fontSize: '5.5rem',
                                lineHeight: 1,
                                color: 'white',
                                textShadow: '0 0 40px rgba(255,255,255,0.3)',
                                marginBottom: '15px'
                            }}>
                                {stat.value}
                            </span>
                            <span style={{
                                fontFamily: 'Inter',
                                fontSize: '0.85rem',
                                color: '#aaa',
                                maxWidth: '180px',
                                lineHeight: '1.4'
                            }}>
                                {stat.subtext}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default StatsStrip;

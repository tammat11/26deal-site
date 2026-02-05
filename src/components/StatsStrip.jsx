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
                            justifyContent: 'space-between',
                            height: '220px',
                            padding: '30px',
                            transitionDelay: `${index * 100}ms`
                        }}>
                            <span style={{ fontFamily: 'Inter', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>
                                {stat.label}
                            </span>
                            <span style={{ fontFamily: 'Playfair Display', fontSize: '3.5rem', lineHeight: 1, color: 'white' }}>
                                {stat.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default StatsStrip;

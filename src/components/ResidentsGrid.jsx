import React, { useState } from 'react';
import { residents } from '../data/residents';
import KineticTitle from './KineticTitle';

const ResidentsGrid = () => {
    const president = residents.find(r => r.isPresident);
    const otherResidents = residents.filter(r => !r.isPresident);

    const [visibleCount, setVisibleCount] = useState(5);

    const visibleResidents = otherResidents.slice(0, visibleCount);
    const hasMore = visibleCount < otherResidents.length;

    const handleShowMore = () => {
        setVisibleCount(prev => prev + 10);
    };

    return (
        <section id="members" className="section">
            <div className="container">
                <div style={{ marginBottom: '80px', textAlign: 'center' }}>
                    <h2 className="section-title">
                        <KineticTitle>РЕЗИДЕНТЫ</KineticTitle>
                    </h2>
                </div>

                {/* President Block */}
                {president && (
                    <a
                        href={president.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="liquid-glass reveal-hidden"
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '40px',
                            padding: '40px',
                            marginBottom: '80px',
                            borderRadius: '30px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            textDecoration: 'none',
                            cursor: president.website ? 'pointer' : 'default',
                            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
                            <img
                                src={president.photo}
                                alt={president.name}
                                style={{
                                    width: '100%',
                                    aspectRatio: '3/4',
                                    objectFit: 'cover',
                                    borderRadius: '20px',
                                    transition: 'transform 0.5s ease'
                                }}
                            />
                        </div>
                        <div style={{ flex: '1 1 300px', textAlign: 'left' }}>
                            <div style={{
                                display: 'inline-block',
                                padding: '8px 16px',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '50px',
                                marginBottom: '20px',
                                fontSize: '0.8rem',
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                color: '#ccc'
                            }}>
                                PRESIDENT 2026
                            </div>
                            <h2 style={{ fontSize: '3.5rem', marginBottom: '10px', lineHeight: '1.1', color: 'white' }}>{president.name}</h2>
                            <p style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '10px', fontWeight: 600 }}>
                                {president.niche}
                            </p>
                            <p style={{ fontSize: '1rem', color: '#aaa', marginBottom: '30px', fontFamily: 'Trajan Pro 3, serif' }}>
                                Основатель <span style={{ color: 'white' }}>{president.company}</span>
                            </p>
                            <p style={{ fontFamily: 'Trajan Pro 3, serif', lineHeight: '1.6', color: '#ccc', maxWidth: '500px' }}>
                                Лидер сообщества, объединяющий сильных предпринимателей для создания масштабных изменений.
                            </p>
                        </div>
                    </a>
                )}

                <div className="residents-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '15px'
                }}>
                    {visibleResidents.map((resident, index) => {
                        const CardContent = (
                            <div className="resident-card-portrait" style={{ cursor: resident.website ? 'pointer' : 'default' }}>
                                <img
                                    src={resident.photo}
                                    alt={resident.name}
                                    className="resident-placeholder"
                                    style={{
                                        objectFit: 'cover',
                                        transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                />
                                <div className="card-overlay">
                                    <p style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', opacity: 0.9 }}>{resident.niche}</p>
                                    <h3 style={{ marginBottom: '8px' }}>{resident.name}</h3>
                                    <p style={{ fontSize: '0.65rem', opacity: 0.75, marginBottom: '6px' }}>{resident.company}</p>
                                    {resident.brief && <p style={{ fontSize: '0.6rem', opacity: 0.65, lineHeight: '1.3', marginTop: '8px' }}>{resident.brief}</p>}
                                </div>
                            </div>
                        );

                        return resident.website ? (
                            <a
                                key={index}
                                href={resident.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none' }}
                            >
                                {CardContent}
                            </a>
                        ) : (
                            <div key={index}>{CardContent}</div>
                        );
                    })}
                </div>

                {hasMore && (
                    <div className="flex justify-center" style={{ marginTop: '60px' }}>
                        <button onClick={handleShowMore} className="btn">
                            ПОКАЗАТЬ ЕЩЕ
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ResidentsGrid;

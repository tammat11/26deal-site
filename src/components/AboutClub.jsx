import React from 'react';
import KineticTitle from './KineticTitle';

const AboutClub = () => {
    return (
        <section id="about" className="section">
            <div className="container text-center">
                <div className="liquid-glass reveal-hidden" style={{ padding: '60px', maxWidth: '800px', margin: '0 auto' }}>
                    <h2 className="section-title" style={{ marginBottom: '40px' }}>
                        <span style={{ marginRight: '10px' }}>О</span>
                        <KineticTitle>КЛУБЕ</KineticTitle>
                    </h2>
                    <p style={{ fontSize: '0.8rem', lineHeight: '1.6', marginBottom: '20px', color: '#ccc' }}>
                        <span style={{ fontFamily: 'Trajan Pro 3, serif', fontWeight: 400 }}> 26 Business Club</span> — это сообщество равных, где каждый предприниматель несёт ответственность за развитие среды и вносит свой вклад.
                    </p>
                    <p style={{ fontSize: '0.8rem', lineHeight: '1.6', color: '#ccc' }}>
                        Мы объединяем тех, кто делится опытом, поддерживает других и усиливает сообщество через вклад и активное участие.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default AboutClub;

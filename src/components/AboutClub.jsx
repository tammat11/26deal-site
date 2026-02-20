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
                    <p style={{ fontSize: '1rem', lineHeight: '1.7', color: '#ccc', textAlign: 'center' }}>
                        Отличительной чертой 26 Business Club является строгий отбор участников, который осуществляется после подачи заявки и заполнения вступительной анкеты.
                    </p>
                    <p style={{ fontSize: '1rem', lineHeight: '1.7', color: '#ccc', marginTop: '20px', textAlign: 'center' }}>
                        В мире всего 4% high-impact предпринимателей. 26 Business Club — это клуб предпринимателей для предпринимателей, и поэтому окончательное решение по отбору принимают действующие резиденты.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default AboutClub;

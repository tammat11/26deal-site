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
                </div>
            </div>
        </section>
    );
};

export default AboutClub;

import React from 'react';

const BackgroundShowcase = () => {
    const backgrounds = [
        { name: 'Starry (Original)', path: '/bg-scroll.png' },
        { name: 'Silk v1', path: '/bg-silk.png' },
        { name: 'Silk v2', path: '/bg-silk-v2.png' },
        { name: 'Silk v3 (Latest)', path: '/bg-silk-v3.png' },
        { name: 'Nebula (Blue Smoke)', path: '/bg-nebula.png' },
        { name: 'Geometric (Obsidian)', path: '/bg-geo.png' },
    ];

    return (
        <div style={{ padding: '100px 20px', background: '#000', minHeight: '100vh', color: 'white' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '50px' }}>Background Gallery</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                {backgrounds.map((bg, index) => (
                    <div key={index} style={{ textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '15px' }}>{bg.name}</h3>
                        <div style={{
                            width: '100%',
                            aspectRatio: '1',
                            backgroundImage: `url(${bg.path})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '15px',
                            border: '1px solid #333',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }} />
                        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>{bg.path}</p>
                    </div>
                ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <a href="/" style={{ color: 'white', textDecoration: 'underline' }}>Back to Home</a>
            </div>
        </div>
    );
};

export default BackgroundShowcase;

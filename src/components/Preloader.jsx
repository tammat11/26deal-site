import React, { useEffect, useState } from 'react';

const Preloader = ({ onFinish }) => {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => {
                onFinish && onFinish();
            }, 800); // Time for slide up animation
        }, 2000); // Minimum show time

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#050505',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)',
            transform: exiting ? 'translateY(-100%)' : 'translateY(0)'
        }}>
            <div style={{
                overflow: 'hidden'
            }}>
                <img
                    src="/logo_26_business_club_silver_invert.png"
                    alt="Loading..."
                    style={{
                        height: '100px',
                        animation: 'revealUp 1s cubic-bezier(0.76, 0, 0.24, 1) forwards',
                        opacity: 0,
                        transform: 'translateY(100%)'
                    }}
                />
            </div>
            <style>{`
                @keyframes revealUp {
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Preloader;

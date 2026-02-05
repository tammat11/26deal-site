import React, { useEffect, useRef, useState } from 'react';

const KineticTitle = ({ children }) => {
    const [skew, setSkew] = useState(0);

    useEffect(() => {
        let lastScrollY = window.scrollY;
        let ticking = false;
        let timeout;

        const update = () => {
            const currentScrollY = window.scrollY;
            const speed = currentScrollY - lastScrollY;

            // Calculate skew based on speed
            const newSkew = Math.max(Math.min(speed * 0.1, 15), -15);

            setSkew(newSkew);
            lastScrollY = currentScrollY;
            ticking = false;

            // Reset skew when stopped
            clearTimeout(timeout);
            timeout = setTimeout(() => setSkew(0), 100);
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <span style={{
            display: 'inline-block',
            transform: `skewX(${-skew}deg)`,
            transition: 'transform 0.1s cubic-bezier(0.2, 0, 0.2, 1)',
            willChange: 'transform',
            whiteSpace: 'nowrap'
        }}>
            {children}
        </span>
    );
};

export default KineticTitle;

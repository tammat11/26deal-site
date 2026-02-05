import React, { useEffect, useRef, useState } from 'react';

const KineticTitle = ({ children }) => {
    const [skew, setSkew] = useState(0);

    useEffect(() => {
        let lastScrollY = window.scrollY;
        let ticking = false;
        let timeout;

        const update = () => {
            const currentScrollY = window.scrollY;
            const diff = currentScrollY - lastScrollY;

            // Ignore extreme jumps (like clicking an anchor link)
            if (Math.abs(diff) > 300) {
                lastScrollY = currentScrollY;
                setSkew(0);
                ticking = false;
                return;
            }

            const speed = diff;
            const targetSkew = Math.max(Math.min(speed * 0.08, 12), -12);

            setSkew(targetSkew);
            lastScrollY = currentScrollY;
            ticking = false;

            // Reset skew when stopped
            clearTimeout(timeout);
            timeout = setTimeout(() => setSkew(0), 150);
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <span style={{
            display: 'inline-block',
            transform: `skewX(${-skew}deg)`,
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
            whiteSpace: 'nowrap'
        }}>
            {children}
        </span>
    );
};

export default KineticTitle;

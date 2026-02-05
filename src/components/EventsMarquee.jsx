import React, { useEffect, useRef, useState } from 'react';

const EventsMarquee = () => {
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect(); // Ensure it only runs once
            }
        }, { threshold: 0.2 });

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={sectionRef}
            className={`marquee-container ${isVisible ? 'active' : ''}`}
            style={{ position: 'relative', overflow: 'hidden', padding: '20px 0', minHeight: '60px' }}
        >
            <div className={`scroll-mask ${isVisible ? 'start-unroll' : ''}`}>
                <div className={`marquee-content ${isVisible ? 'start-scroll' : ''}`}>
                    <div className="marquee-item">Private <span>Dinners</span></div>
                    <div className="marquee-item">Business <span>Breakfasts</span></div>
                    <div className="marquee-item">Global <span>Retreats</span></div>
                    <div className="marquee-item">Investment <span>Forums</span></div>
                    <div className="marquee-item">Exclusive <span>Workshops</span></div>
                    <div className="marquee-item">Family <span>Events</span></div>
                    <div className="marquee-item">Sports <span>Activities</span></div>

                    {/* Duplicate for seamless loop */}
                    <div className="marquee-item">Private <span>Dinners</span></div>
                    <div className="marquee-item">Business <span>Breakfasts</span></div>
                    <div className="marquee-item">Global <span>Retreats</span></div>
                    <div className="marquee-item">Investment <span>Forums</span></div>
                    <div className="marquee-item">Exclusive <span>Workshops</span></div>
                    <div className="marquee-item">Family <span>Events</span></div>
                    <div className="marquee-item">Sports <span>Activities</span></div>
                </div>
            </div>
            <style>{`
                .scroll-mask {
                    width: 0;
                    overflow: hidden;
                    white-space: nowrap;
                    border-right: 2px solid #fff; /* Scroll edge */
                    position: relative;
                }

                .scroll-mask.start-unroll {
                    animation: unrollMask 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                }

                @keyframes unrollMask {
                    0% { width: 0; border-right-color: #fff; }
                    99% { border-right-color: #fff; }
                    100% { width: 100%; border-right-color: transparent; }
                }

                .marquee-content {
                    display: inline-flex;
                    gap: 40px;
                    opacity: 0; /* Initially hidden inside the zero-width mask? No, mask hides it. But for safety. */
                    opacity: 1; /* Reset */
                }
                
                .marquee-content.start-scroll {
                    /* Start scrolling immediately upon trigger */
                    animation: continuousScroll 40s linear infinite;
                }

                @keyframes continuousScroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); } 
                }

                .marquee-item {
                    font-size: 1.2rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: rgba(255,255,255,0.7);
                    white-space: nowrap;
                }
                
                .marquee-item span {
                    color: #fff;
                    font-weight: bold;
                }
            `}</style>
        </section>
    );
};

export default EventsMarquee;

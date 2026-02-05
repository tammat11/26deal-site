import React from 'react';

const EventsMarquee = () => {
    return (
        <section
            className="marquee-container reveal-hidden"
            style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '30px 0',
                minHeight: '80px',
                background: 'transparent'
            }}
        >
            {/* The Scanner Line */}
            <div className="marquee-scanner"></div>

            <div className="marquee-content-wrapper">
                <div className="marquee-track">
                    {/* First copy */}
                    <div className="marquee-item">Совет <span>директоров</span></div>
                    <div className="marquee-item">Бизнес <span>Форум</span></div>
                    <div className="marquee-item">Семейные <span>дни</span></div>
                    <div className="marquee-item"><span>Обучение</span></div>
                    <div className="marquee-item">Совет <span>директоров</span></div>
                    <div className="marquee-item">Бизнес <span>Форум</span></div>
                    <div className="marquee-item">Семейные <span>дни</span></div>
                    <div className="marquee-item"><span>Обучение</span></div>

                    {/* Duplicate copy for loop */}
                    <div className="marquee-item">Совет <span>директоров</span></div>
                    <div className="marquee-item">Бизнес <span>Форум</span></div>
                    <div className="marquee-item">Семейные <span>дни</span></div>
                    <div className="marquee-item"><span>Обучение</span></div>
                    <div className="marquee-item">Совет <span>директоров</span></div>
                    <div className="marquee-item">Бизнес <span>Форум</span></div>
                    <div className="marquee-item">Семейные <span>дни</span></div>
                    <div className="marquee-item"><span>Обучение</span></div>
                </div>
            </div>
            <style>{`
                .marquee-container {
                    border-top: 1px solid rgba(255,255,255,0.05);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }

                /* Override vertical reveal */
                .marquee-container.reveal-hidden {
                    transform: translateY(0) !important;
                }

                .marquee-scanner {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: -100px;
                    width: 2px;
                    background: white;
                    box-shadow: 0 0 20px 2px white, 0 0 40px 4px rgba(255,255,255,0.5);
                    z-index: 10;
                    opacity: 0;
                    pointer-events: none;
                }

                .marquee-container.reveal-visible .marquee-scanner {
                    animation: scanLine 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .marquee-container.reveal-visible .marquee-content-wrapper {
                    animation: wipeContent 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes scanLine {
                    0% { left: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { left: 100%; opacity: 0; }
                }

                @keyframes wipeContent {
                    0% { 
                        opacity: 0;
                        clip-path: inset(0 100% 0 0);
                    }
                    100% { 
                        opacity: 1;
                        clip-path: inset(0 0% 0 0);
                    }
                }

                .marquee-content-wrapper {
                    display: flex;
                    overflow: hidden;
                    width: 100%;
                    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                }

                .marquee-track {
                    display: flex;
                    gap: 80px;
                    width: max-content;
                    animation: infiniteScroll 40s linear infinite;
                    will-change: transform;
                }
                


                @keyframes infiniteScroll {
                    0% { transform: translate3d(0, 0, 0); }
                    100% { transform: translate3d(-50%, 0, 0); }
                }

                .marquee-item {
                    font-size: 1.2rem;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    color: rgba(255,255,255,0.4);
                    white-space: nowrap;
                    font-family: 'Trajan Pro 3', serif;
                }
                
                .marquee-item span {
                    color: #fff;
                    font-weight: 600;
                    margin-left: 8px;
                }
            `}</style>
        </section>
    );
};

export default EventsMarquee;

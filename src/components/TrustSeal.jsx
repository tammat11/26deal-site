import React, { useEffect, useRef } from 'react';

const TrustSeal = () => {
    const sealRef = useRef(null);

    useEffect(() => {
        let rafId;
        const handleMouseMove = (e) => {
            if (sealRef.current) {
                const { clientX, clientY } = e;
                const { left, top, width, height } = sealRef.current.getBoundingClientRect();
                const centerX = left + width / 2;
                const centerY = top + height / 2;
                const moveX = (clientX - centerX) / 25;
                const moveY = (clientY - centerY) / 25;

                sealRef.current.style.transform = `perspective(1000px) rotateY(${moveX}deg) rotateX(${-moveY}deg)`;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <section className="section trust-seal-section" style={{ overflow: 'hidden', padding: '120px 0' }}>
            <div className="container">
                <div className="flex items-center justify-between" style={{ gap: '60px', flexWrap: 'wrap' }}>

                    {/* Left side: The WoW Seal */}
                    <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <div ref={sealRef} className="seal-container" style={{
                            width: '400px',
                            height: '400px',
                            position: 'relative',
                            transition: 'transform 0.1s ease-out',
                            willChange: 'transform'
                        }}>
                            {/* Rotating Outer Text */}
                            <div className="rotating-text" style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                animation: 'spin 20s linear infinite'
                            }}>
                                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                                    <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
                                    <text style={{ fontSize: '3.5px', fontFamily: 'Trajan Pro 3, serif', letterSpacing: '2.5px', fill: 'rgba(255,255,255,0.4)' }}>
                                        <textPath xlinkHref="#circlePath">
                                            • ЭЛИТНОЕ СООБЩЕСТВО • ПЕЧАТЬ НАДЕЖНОСТИ • ВЫСШИЙ СТАНДАРТ • НОВАЯ КУЛЬТУРА БИЗНЕСА
                                        </textPath>
                                    </text>
                                </svg>
                            </div>

                            {/* Inner Chrome Shape */}
                            <div className="seal-core" style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '260px',
                                height: '260px',
                                background: 'radial-gradient(circle at 30% 30%, #fff 0%, #aaa 30%, #444 60%, #111 100%)',
                                borderRadius: '50%',
                                boxShadow: '0 0 80px rgba(255,255,255,0.1), inset 0 0 40px rgba(0,0,0,0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                <img src="/logo_26_business_club_silver_invert.png" alt="26 Logo" style={{
                                    width: '120px',
                                    filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.5))'
                                }} />

                                {/* Gloss effect */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-50%',
                                    left: '-50%',
                                    width: '200%',
                                    height: '200%',
                                    background: 'linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.2) 50%, transparent 55%)',
                                    animation: 'sheen 4s infinite linear'
                                }}></div>
                            </div>

                            {/* Glow behind */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '450px',
                                height: '450px',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                                zIndex: -1
                            }}></div>
                        </div>
                    </div>

                    {/* Right side: Text Content */}
                    <div style={{ flex: '1 1 500px' }}>
                        <h2 className="reveal-hidden" style={{ fontSize: '3.5rem', lineHeight: '1', marginBottom: '20px' }}>
                            ПЕЧАТЬ <br /> <i>НАДЕЖНОСТИ</i>
                        </h2>
                        <div className="reveal-hidden delay-100" style={{ width: '80px', height: '1px', background: 'white', opacity: 0.5, marginBottom: '40px' }}></div>

                        <div className="trust-points">
                            <div className="trust-point reveal-hidden delay-200">
                                <h3>СТРОГИЙ ОТБОР</h3>
                                <p>Только 4% предпринимателей проходят квалификацию. Мы объединяем лидеров, а не просто участников.</p>
                            </div>
                            <div className="trust-point reveal-hidden delay-300">
                                <h3>РЕПУТАЦИОННЫЙ ЦЕНЗ</h3>
                                <p>Вход в клуб возможен только через рекомендации действующих резидентов и одобрение совета.</p>
                            </div>
                            <div className="trust-point reveal-hidden delay-400">
                                <h3>ПРОЗРАЧНОСТЬ</h3>
                                <p>Сообщество, построенное на доверии и открытости, где каждый несет ответственность за общую среду.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes sheen {
                    from { transform: rotate(0deg) translate(-50%, -50%) translateX(-20%); }
                    to { transform: rotate(0deg) translate(-50%, -50%) translateX(20%); }
                }
                .trust-point {
                    margin-bottom: 35px;
                    border-left: 1px solid rgba(255,255,255,0.1);
                    padding-left: 25px;
                    transition: border-color 0.4s ease;
                }
                .trust-point:hover {
                    border-left-color: rgba(255,255,255,0.6);
                }
                .trust-point h3 {
                    font-size: 1.1rem;
                    letter-spacing: 0.15em;
                    margin-bottom: 10px;
                    color: #fff;
                }
                .trust-point p {
                    font-size: 0.85rem;
                    color: #aaa;
                    line-height: 1.5;
                    font-family: var(--font-sans);
                }
                @media (max-width: 900px) {
                    .trust-seal-section .flex {
                        flex-direction: column;
                        text-align: center;
                    }
                    .seal-container {
                        width: 300px !important;
                        height: 300px !important;
                    }
                    .seal-core {
                        width: 200px !important;
                        height: 200px !important;
                    }
                    .trust-point {
                        border-left: none;
                        border-top: 1px solid rgba(255,255,255,0.1);
                        padding: 20px 0 0 0;
                    }
                }
            `}</style>
        </section >
    );
};

export default TrustSeal;

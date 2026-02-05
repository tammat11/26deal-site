import React, { useEffect, useRef } from 'react';

const Benefits = () => {
    const sectionRef = useRef(null);
    const card1Ref = useRef(null);
    const card2Ref = useRef(null);
    const card3Ref = useRef(null);

    /* Direct DOM Manipulation for Smooth 60FPS Parallax */
    useEffect(() => {
        let rafId;

        const updateParallax = () => {
            if (sectionRef.current) {
                const rect = sectionRef.current.getBoundingClientRect();
                const viewHeight = window.innerHeight;

                // Only animate if in view
                if (rect.top < viewHeight && rect.bottom > 0) {
                    const relativeY = rect.top;

                    // Reduced speed for tighter sync
                    const shift = (viewHeight - relativeY) * 0.08;

                    // Force no transition to prevent lag
                    const setTransform = (el, val) => {
                        if (el) {
                            el.style.transform = `translate3d(0, ${val}px, 0)`;
                        }
                    };

                    setTransform(card1Ref.current, -shift * 0.3);
                    setTransform(card3Ref.current, -shift * 0.3);
                    setTransform(card2Ref.current, shift * 0.3);
                }
            }
            rafId = requestAnimationFrame(updateParallax);
        };

        updateParallax();
        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <section id="benefits" className="section" ref={sectionRef} style={{ overflow: 'hidden', padding: '100px 0', position: 'relative' }}>
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="reveal-hidden" style={{ marginBottom: '60px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: '1.2', letterSpacing: '0.05em', marginBottom: '20px' }}>
                        «26 BUSINESS CLUB» ДЛЯ ВАС, ЕСЛИ:
                    </h2>
                    <div style={{ width: '60px', height: '2px', background: '#fff', margin: '0 auto', opacity: 0.5 }}></div>
                </div>

                <div className="benefits-grid">

                    {/* Card 1 */}
                    <div ref={card1Ref} className="benefit-wrapper reveal-hidden reveal-3d" style={{ willChange: 'transform' }}>
                        <div className="benefit-card">
                            <div className="card-header">
                                <div className="stat-value"><span className="stat-prefix">ОТ</span> 100</div>
                                <div className="stat-label">МЛН ТГ ОБОРОТ</div>
                            </div>
                            <div className="card-body">
                                <h3>Вы являетесь одним из лучших в своей индустрии</h3>
                                <p>Рядом с вами нет человека, который мог бы поделиться своим опытом и стать примером в бизнесе? Менторы и резиденты сообщества — проактивные предприниматели.</p>
                            </div>
                            <div className="card-glow"></div>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div ref={card2Ref} className="benefit-wrapper reveal-hidden reveal-3d" style={{ willChange: 'transform' }}>
                        <div className="benefit-card" style={{ transitionDelay: '150ms' }}>
                            <div className="card-header">
                                <div className="stat-value"><span className="stat-prefix">ОТ</span> 3</div>
                                <div className="stat-label">ЛЕТ В БИЗНЕСЕ</div>
                            </div>
                            <div className="card-body">
                                <h3>Вы социально активны и ставите высокие цели</h3>
                                <p>Ваши жизненные ценности сменились, а окружение все еще стоит на месте? «26 Business Club» — это среда единомышленников, которые так же, как и вы, готовы свернуть горы.</p>
                            </div>
                            <div className="card-glow"></div>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div ref={card3Ref} className="benefit-wrapper reveal-hidden reveal-3d" style={{ willChange: 'transform' }}>
                        <div className="benefit-card" style={{ transitionDelay: '300ms' }}>
                            <div className="card-header">
                                <div className="stat-value"><span className="stat-prefix">ОТ</span> 10</div>
                                <div className="stat-label">ЧЕЛОВЕК В КОМАНДЕ</div>
                            </div>
                            <div className="card-body">
                                <h3>Ваш бизнес постоянно растет</h3>
                                <p>При быстром росте цена ошибки очень высока. Резиденты клуба имеют большой опыт в решении данных задач и помогут вам оперативно их решить.</p>
                            </div>
                            <div className="card-glow"></div>
                        </div>
                    </div>

                </div>
            </div>
            <style>{`
                .benefits-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 30px;
                    padding-bottom: 50px;
                }

                .benefit-wrapper {
                    /* Ensure no transition interferes with parallax */
                    transition: none !important; 
                }

                /* Inner Card handles Reveal Animation */
                .reveal-3d .benefit-card {
                    opacity: 0;
                    transform: perspective(1000px) rotateX(15deg) translateY(60px) scale(0.9);
                    transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                .reveal-visible.reveal-3d .benefit-card {
                    opacity: 1;
                    transform: perspective(1000px) rotateX(0deg) translateY(0) scale(1);
                }

                /* LIQUID GLASS STYLE */
                .benefit-card {
                    background: rgba(255, 255, 255, 0.02); /* Very sheer */
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-top: 1px solid rgba(255, 255, 255, 0.25); /* Glossy top edge */
                    border-radius: 40px; /* Soft liquid shape */
                    padding: 40px 30px;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    height: 100%;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                }
                
                .benefit-card:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.4);
                    box-shadow: 0 40px 80px rgba(0,0,0,0.5), inset 0 0 30px rgba(255,255,255,0.05); /* Deep reflection */
                    transform: translateY(-5px) scale(1.02);
                }

                .card-header {
                    margin-bottom: 25px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 20px;
                    position: relative;
                }
                .card-header::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    width: 0%;
                    height: 2px;
                    background: #fff;
                    transition: width 0.4s ease;
                    box-shadow: 0 0 10px rgba(255,255,255,0.5);
                }
                .benefit-card:hover .card-header::after { width: 100%; }
                
                .stat-value {
                    font-size: 4.5rem;
                    font-weight: 800;
                    color: #fff;
                    line-height: 0.9;
                    margin-bottom: 15px;
                    text-shadow: 0 0 30px rgba(255,255,255,0.3);
                    letter-spacing: -0.02em;
                }
                .stat-prefix {
                    font-size: 0.3em;
                    font-weight: 500;
                    vertical-align: middle;
                    margin-right: 12px;
                    opacity: 0.9;
                    color: rgba(255,255,255,0.7);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                .stat-label {
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    color: #fff;
                    font-weight: 600;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                }
                .card-body h3 {
                    font-size: 1.2rem;
                    margin-bottom: 15px;
                    color: white;
                    line-height: 1.4;
                    min-height: 3.4em;
                }
                .card-body p {
                    color: #e0e0e0;
                    font-size: 0.95rem;
                    font-family: sans-serif;
                    line-height: 1.6;
                }
                .card-glow {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                    transition: left 0.6s ease;
                    pointer-events: none;
                }
                .benefit-card:hover .card-glow { left: 100%; transition: left 0.6s ease; }

                @media (max-width: 900px) {
                    .benefits-grid { grid-template-columns: 1fr; gap: 40px; padding-bottom: 50px; }
                    .benefit-wrapper { transform: none !important; }
                    .benefit-card { padding: 30px; }
                    .card-body h3 { min-height: auto; }
                }
            `}</style>
        </section>
    );
};

export default Benefits;

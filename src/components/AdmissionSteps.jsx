import React, { useState, useEffect, useRef } from 'react';

const steps = [
    { id: 1, title: 'Анкетирование' },
    { id: 2, title: 'Интервью' },
    { id: 3, title: 'РЕЗИДЕНТСТВО' },
    { id: 4, title: 'Договор + оплата' },
];

const AdmissionSteps = () => {
    const sectionRef = useRef(null);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        let rafId;
        const handleScroll = () => {
            if (sectionRef.current) {
                const rect = sectionRef.current.getBoundingClientRect();
                const viewHeight = window.innerHeight;
                // Calculate visible progress
                if (rect.top < viewHeight && rect.bottom > 0) {
                    // Normalized offset for subtle movement
                    setOffset((viewHeight - rect.top) * 0.05);
                }
            }
        };

        const onScroll = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(handleScroll);
        }

        window.addEventListener('scroll', onScroll);
        handleScroll(); // init
        return () => {
            window.removeEventListener('scroll', onScroll);
            cancelAnimationFrame(rafId);
        }
    }, []);

    return (
        <section id="admission" className="section" ref={sectionRef} style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="container" style={{ position: 'relative', zIndex: 2 }}>
                <div className="text-center reveal-hidden" style={{ marginBottom: '60px' }}>
                    <h2>Этапы <i>вступления</i></h2>
                    <p style={{ maxWidth: '800px', margin: '30px auto', color: '#ccc', lineHeight: '1.6', fontSize: '0.9rem' }}>
                        Отличительной чертой 26 Business Club является строгий отбор участников, который осуществляется после подачи заявки и заполнения вступительной анкеты. В мире всего 4% high-impact предпринимателей. 26 Business Club — это клуб предпринимателей для предпринимателей, и поэтому окончательное решение по отбору принимают действующие резиденты
                    </p>
                </div>

                <div className="grid-4 reveal-hidden" style={{ gap: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    {steps.map((step, index) => (
                        <div key={step.id} className="liquid-glass reveal-child" style={{
                            padding: '30px',
                            animationDelay: `${index * 150}ms`,
                            position: 'relative',
                            overflow: 'hidden',
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}>
                            {/* Number Container - Static */}
                            <div style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                pointerEvents: 'none',
                                zIndex: 0
                            }}>
                                <div style={{
                                    fontSize: '5rem',
                                    color: 'rgba(255,255,255,0.8)',
                                    fontWeight: '700',
                                    lineHeight: 1,
                                    fontFamily: 'Trajan Pro 3, serif',
                                    textShadow: '0 0 20px rgba(255,255,255,0.2)'
                                }}>
                                    0{step.id}
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.3rem', margin: '80px 0 0 0', color: 'white', position: 'relative', zIndex: 1 }}>{step.title}</h3>
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                .reveal-child {
                    opacity: 0;
                    transform: translateY(30px);
                }
                
                .reveal-hidden.reveal-visible .reveal-child {
                    animation: premiumFadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }

                @keyframes premiumFadeIn {
                    from { opacity: 0; transform: translateY(40px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .liquid-glass:hover {
                    background: rgba(255,255,255,0.08);
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
            `}</style>
        </section>
    );
};

export default AdmissionSteps;

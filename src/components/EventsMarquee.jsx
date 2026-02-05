import React from 'react';

const EventsMarquee = () => {
    return (
        <section
            className="marquee-container reveal-hidden"
            style={{ position: 'relative', overflow: 'hidden', padding: '20px 0', minHeight: '60px', background: 'transparent' }}
        >
            <div className="marquee-content-wrapper">
                <div className="marquee-track">
                    {/* First copy */}
                    <div className="marquee-item">Private <span>Dinners</span></div>
                    <div className="marquee-item">Business <span>Breakfasts</span></div>
                    <div className="marquee-item">Global <span>Retreats</span></div>
                    <div className="marquee-item">Investment <span>Forums</span></div>
                    <div className="marquee-item">Exclusive <span>Workshops</span></div>
                    <div className="marquee-item">Family <span>Events</span></div>
                    <div className="marquee-item">Sports <span>Activities</span></div>

                    {/* Duplicate copy for loop */}
                    <div className="marquee-item">Private <span>Dinners</span></div>
                    <div className="marquee-item">Business <span>Breakfasts</span></div>
                    <div className="marquee-item">Global <span>Retreats</span></div>
                    <div className="marquee-item">Investment <span>Forums</span></div>
                    <div className="marquee-item">Exclusive <span>Workshops</span></div>
                    <div className="marquee-item">Family <span>Events</span></div>
                    <div className="marquee-item">Sports <span>Activities</span></div>

                    {/* Triplicate copy for safety on wide screens */}
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
                .marquee-content-wrapper {
                    display: flex;
                    overflow: hidden;
                    width: 100%;
                    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                }

                .marquee-track {
                    display: flex;
                    gap: 60px;
                    width: max-content;
                    animation: infiniteScroll 40s linear infinite;
                    will-change: transform;
                }
                
                .marquee-container.reveal-visible {
                    animation: unroll 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes unroll {
                    from { 
                        opacity: 0; 
                        transform: scaleX(0.8);
                        letter-spacing: 0.5em;
                    }
                    to { 
                        opacity: 1; 
                        transform: scaleX(1);
                        letter-spacing: 0.1em;
                    }
                }

                .marquee-container:hover .marquee-track {
                    animation-play-state: paused; 
                }

                @keyframes infiniteScroll {
                    0% { transform: translate3d(0, 0, 0); }
                    100% { transform: translate3d(-33.33%, 0, 0); } /* Moving 1/3 since we have 3 sets */
                }

                .marquee-item {
                    font-size: 1.2rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: rgba(255,255,255,0.5);
                    white-space: nowrap;
                    font-family: 'Trajan Pro 3', serif; /* Matching global font usage */
                }
                
                .marquee-item span {
                    color: #fff;
                    font-weight: 600;
                    margin-left: 5px;
                }
            `}</style>
        </section>
    );
};

export default EventsMarquee;

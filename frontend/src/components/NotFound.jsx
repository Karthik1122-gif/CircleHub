import React, { useEffect } from 'react';

export default function NotFound({ setActiveTab, onBack }) {
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.title = '404 - Page Not Found | CircleHub';
    }, []);

    const handleNavigate = (tab) => {
        if (setActiveTab) {
            setActiveTab(tab);
            window.location.hash = `#${tab}`;
        } else {
            window.location.href = `/#${tab}`;
        }
    };

    return (
        <div className="notfound-container page-enter">
            <div className="notfound-card">
                <div className="notfound-badge">
                    <span className="notfound-icon">🌿</span>
                </div>
                <div className="notfound-number">404</div>
                <h1 className="notfound-title">Neighborhood Not Found</h1>
                <p className="notfound-desc">
                    Oops! The page, circle, or event you are trying to visit seems to have relocated or doesn't exist in this neighborhood.
                </p>

                <div className="notfound-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => handleNavigate('dashboard')}
                        id="btn-404-dashboard"
                    >
                        🏡 Back to Dashboard
                    </button>
                    <button
                        className="btn btn-outline"
                        onClick={() => handleNavigate('circles')}
                        id="btn-404-circles"
                    >
                        Explore Circles
                    </button>
                    <button
                        className="btn btn-outline"
                        onClick={() => handleNavigate('events')}
                        id="btn-404-events"
                    >
                        Discover Events
                    </button>
                </div>

                <div className="notfound-footer">
                    <span>Looking for something else?</span>
                    <div className="notfound-links">
                        <button className="link-button" onClick={() => handleNavigate('privacy')}>
                            Privacy Policy
                        </button>
                        <span>•</span>
                        <button className="link-button" onClick={() => handleNavigate('terms')}>
                            Terms &amp; Conditions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

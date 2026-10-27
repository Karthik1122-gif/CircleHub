import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Circles from './components/Circles';
import Events from './components/Events';
import Profile from './components/Profile';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import NotFound from './components/NotFound';
import Footer from './components/Footer';

const VALID_TABS = ['dashboard', 'circles', 'events', 'profile', 'privacy', 'terms'];

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab]     = useState(() => {
        const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
        if (VALID_TABS.includes(hash)) return hash;
        if (hash) return '404';
        return 'dashboard';
    });
    const [statsRefreshKey, setStatsRefreshKey] = useState(0);

    const handleStatsChange = () => {
        setStatsRefreshKey(k => k + 1);
    };

    // Load saved session on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('circlehub_user');
        if (savedUser) {
            try {
                setCurrentUser(JSON.parse(savedUser));
            } catch (err) {
                console.error('Failed to parse saved user session:', err);
                localStorage.removeItem('circlehub_user');
            }
        }
    }, []);

    // Sync state with URL hash
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
            if (!hash) {
                setActiveTab('dashboard');
            } else if (VALID_TABS.includes(hash)) {
                setActiveTab(hash);
            } else {
                setActiveTab('404');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Dynamic Title & Meta Description update
    useEffect(() => {
        const titles = {
            dashboard: 'CircleHub - Hyper-Local Neighborhood Communities & Events',
            circles: 'Explore Neighborhood Circles | CircleHub',
            events: 'Upcoming Community Events & Workshops | CircleHub',
            profile: 'My Neighborhood Profile | CircleHub',
            privacy: 'Privacy Policy | CircleHub Community Network',
            terms: 'Terms & Conditions | CircleHub Community Guidelines',
            404: 'Neighborhood Not Found (404) | CircleHub'
        };

        const descriptions = {
            dashboard: 'Join your local neighborhood network. Explore upcoming community events, interest circles, and neighbors in your area.',
            circles: 'Discover and join hyper-local interest circles around gardening, technology, arts, fitness, and more.',
            events: 'RSVP to local neighborhood workshops, community park cleanups, skill shares, and neighborly gatherings.',
            profile: 'Manage your local neighborhood profile, bio, skills to share, and contact privacy settings.',
            privacy: 'Learn how CircleHub safeguards your data with end-to-end security and granular contact privacy controls.',
            terms: 'CircleHub community guidelines, code of honor, organizer responsibilities, and terms of service.',
            404: 'The page or neighborhood you are looking for does not exist on CircleHub.'
        };

        document.title = titles[activeTab] || titles.dashboard;

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', descriptions[activeTab] || descriptions.dashboard);
        }
    }, [activeTab]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        window.location.hash = `#${newTab}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        localStorage.setItem('circlehub_user', JSON.stringify(user));
        handleTabChange('dashboard');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('circlehub_user');
        handleTabChange('dashboard');
    };

    const handleUserUpdated = (updatedUser) => {
        setCurrentUser(updatedUser);
        localStorage.setItem('circlehub_user', JSON.stringify(updatedUser));
    };

    // Render active view
    const renderContent = () => {
        // Universal views accessible to both guests and logged-in users
        if (activeTab === 'privacy') {
            return (
                <div key="privacy" className="page-enter">
                    <PrivacyPolicy setActiveTab={handleTabChange} onBack={() => handleTabChange('dashboard')} />
                </div>
            );
        }

        if (activeTab === 'terms') {
            return (
                <div key="terms" className="page-enter">
                    <TermsAndConditions setActiveTab={handleTabChange} onBack={() => handleTabChange('dashboard')} />
                </div>
            );
        }

        if (activeTab === '404') {
            return (
                <div key="404" className="page-enter">
                    <NotFound setActiveTab={handleTabChange} onBack={() => handleTabChange('dashboard')} />
                </div>
            );
        }

        // Authentication guard
        if (!currentUser) {
            return (
                <Auth
                    onLoginSuccess={handleLoginSuccess}
                    onOpenPrivacy={() => handleTabChange('privacy')}
                    onOpenTerms={() => handleTabChange('terms')}
                />
            );
        }

        // Authenticated member views
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div key={`dashboard-${statsRefreshKey}`} className="page-enter">
                        <Dashboard currentUser={currentUser} setActiveTab={handleTabChange} refreshKey={statsRefreshKey} />
                    </div>
                );
            case 'circles':
                return (
                    <div key="circles" className="page-enter">
                        <Circles currentUser={currentUser} onStatsChange={handleStatsChange} />
                    </div>
                );
            case 'events':
                return (
                    <div key="events" className="page-enter">
                        <Events currentUser={currentUser} onStatsChange={handleStatsChange} />
                    </div>
                );
            case 'profile':
                return (
                    <div key="profile" className="page-enter">
                        <Profile currentUser={currentUser} onUserUpdated={handleUserUpdated} />
                    </div>
                );
            default:
                return (
                    <div key="404-fallback" className="page-enter">
                        <NotFound setActiveTab={handleTabChange} onBack={() => handleTabChange('dashboard')} />
                    </div>
                );
        }
    };

    return (
        <div className="app-container">
            <Navbar
                currentUser={currentUser}
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                onLogout={handleLogout}
            />

            <main className="main-content">
                {renderContent()}
            </main>

            <Footer
                currentUser={currentUser}
                setActiveTab={handleTabChange}
            />
        </div>
    );
}

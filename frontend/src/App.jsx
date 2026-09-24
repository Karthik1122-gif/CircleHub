import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Circles from './components/Circles';
import Events from './components/Events';
import Profile from './components/Profile';

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab]     = useState('dashboard');

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

    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        localStorage.setItem('circlehub_user', JSON.stringify(user));
        setActiveTab('dashboard');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('circlehub_user');
        setActiveTab('dashboard');
    };

    const handleUserUpdated = (updatedUser) => {
        setCurrentUser(updatedUser);
        localStorage.setItem('circlehub_user', JSON.stringify(updatedUser));
    };

    return (
        <div className="app-container">
            <Navbar
                currentUser={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onLogout={handleLogout}
            />

            <main className="main-content">
                {!currentUser ? (
                    <Auth onLoginSuccess={handleLoginSuccess} />
                ) : (
                    <>
                        {activeTab === 'dashboard' && (
                            <div key="dashboard" className="page-enter">
                                <Dashboard currentUser={currentUser} setActiveTab={setActiveTab} />
                            </div>
                        )}
                        {activeTab === 'circles' && (
                            <div key="circles" className="page-enter">
                                <Circles currentUser={currentUser} />
                            </div>
                        )}
                        {activeTab === 'events' && (
                            <div key="events" className="page-enter">
                                <Events currentUser={currentUser} />
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <div key="profile" className="page-enter">
                                <Profile currentUser={currentUser} onUserUpdated={handleUserUpdated} />
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

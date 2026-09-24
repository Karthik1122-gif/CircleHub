import React from 'react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onLogout }) {
    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <div className="brand" onClick={() => setActiveTab('dashboard')}>
                    <div className="brand-icon">CH</div>
                    <span>CircleHub</span>
                </div>

                {currentUser && (
                    <>
                        <ul className="nav-links">
                            <li 
                                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setActiveTab('dashboard')}
                            >
                                Dashboard
                            </li>
                            <li 
                                className={`nav-item ${activeTab === 'circles' ? 'active' : ''}`}
                                onClick={() => setActiveTab('circles')}
                            >
                                Circles
                            </li>
                            <li 
                                className={`nav-item ${activeTab === 'events' ? 'active' : ''}`}
                                onClick={() => setActiveTab('events')}
                            >
                                Events
                            </li>
                            <li 
                                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                My Profile
                            </li>
                        </ul>

                        <div className="user-status">
                            <div className="user-badge">
                                <div className="avatar">
                                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <span>{currentUser.name}</span>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={onLogout}>
                                Logout
                            </button>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
}

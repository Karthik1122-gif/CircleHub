import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Dashboard({ currentUser, setActiveTab }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser && currentUser.id) {
            fetchDashboard();
        }
    }, [currentUser]);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const data = await api.getDashboard(currentUser.id);
            setDashboardData(data);
        } catch (err) {
            setError(err.message || 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading your dashboard...</div>;
    if (error) return <div className="alert alert-danger">{error}</div>;

    const { joinedCircles, createdCircles, upcomingEvents, stats } = dashboardData || {
        joinedCircles: [],
        createdCircles: [],
        upcomingEvents: [],
        stats: { totalJoined: 0, totalCreated: 0, totalEvents: 0 }
    };

    return (
        <div>
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <h1>Hello, {currentUser.name}! 👋</h1>
                <p>
                    Welcome to CircleHub! Here is what's happening in your neighborhood (<strong>{currentUser.location || 'Urban Neighborhood'}</strong>).
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-number">{stats.totalJoined}</div>
                    <div className="stat-label">Joined Circles</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{stats.totalCreated}</div>
                    <div className="stat-label">Created Circles</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{stats.totalEvents}</div>
                    <div className="stat-label">Upcoming Events</div>
                </div>
            </div>

            {/* Content Sections */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
                
                {/* My Circles Section */}
                <div className="card" style={{ justifyContent: 'flex-start' }}>
                    <div className="card-header">
                        <h3 className="card-title">My Joined Circles</h3>
                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('circles')}>
                            Explore All
                        </button>
                    </div>

                    <div className="card-body">
                        {joinedCircles.length === 0 ? (
                            <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                                You haven't joined any circles yet. Click 'Explore All' to find nearby circles!
                            </p>
                        ) : (
                            joinedCircles.map((circle) => (
                                <div key={circle.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{circle.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        {circle.category} • {circle.member_count} members • {circle.location}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Events Section */}
                <div className="card" style={{ justifyContent: 'flex-start' }}>
                    <div className="card-header">
                        <h3 className="card-title">Upcoming Meetups & Events</h3>
                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('events')}>
                            View Events
                        </button>
                    </div>

                    <div className="card-body">
                        {upcomingEvents.length === 0 ? (
                            <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                                No upcoming events in your joined circles yet.
                            </p>
                        ) : (
                            upcomingEvents.map((event) => (
                                <div key={event.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontWeight: '600', color: '#10b981' }}>{event.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                                        📍 {event.location} • 📅 {new Date(event.event_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                        Organized by {event.circle_name}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

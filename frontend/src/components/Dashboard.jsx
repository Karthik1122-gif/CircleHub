import React, { useState, useEffect } from 'react';
import { api } from '../api';

/* ── Skeleton placeholder ─────────────────────────────────── */
function SkeletonGrid() {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {[1, 2, 3].map(i => (
                <div key={i} className="card">
                    <div className="skeleton skeleton-line med" style={{ marginBottom: 12 }} />
                    <div className="skeleton skeleton-line full" />
                    <div className="skeleton skeleton-line short" />
                </div>
            ))}
        </div>
    );
}

/* ── Animated stat number ─────────────────────────────────── */
function AnimatedStat({ target }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!target) return;
        let start = 0;
        const step = Math.ceil(target / 30);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
        }, 30);
        return () => clearInterval(timer);
    }, [target]);

    return <div className="stat-number">{count}</div>;
}

/* ── Component ───────────────────────────────────────────── */
export default function Dashboard({ currentUser, setActiveTab }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const userId = currentUser?._id || currentUser?.id;

    useEffect(() => {
        if (userId) fetchDashboard();
    }, [currentUser]);

    const fetchDashboard = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getDashboard(userId);
            setDashboardData(data);
        } catch (err) {
            setError(err.message || 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="page-enter">
            <div className="welcome-banner" style={{ marginBottom: 24 }}>
                <div className="skeleton skeleton-line med" style={{ height: 28, marginBottom: 10 }} />
                <div className="skeleton skeleton-line short" style={{ height: 16 }} />
            </div>
            <SkeletonGrid />
        </div>
    );

    if (error) return (
        <div className="page-enter" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>😕</div>
            <div className="alert alert-danger" style={{ maxWidth: 480, margin: '0 auto 16px' }}>{error}</div>
            <button className="btn btn-primary" onClick={fetchDashboard}>🔄 Retry</button>
        </div>
    );

    const {
        joinedCircles  = [],
        createdCircles = [],
        upcomingEvents = [],
        stats = { totalJoined: 0, totalCreated: 0, totalEvents: 0 }
    } = dashboardData || {};

    return (
        <div className="page-enter">
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <h1>Hello, {currentUser.name}! 👋</h1>
                <p>
                    Welcome to CircleHub! Here's what's happening in your neighborhood (
                    <strong>{currentUser.location || 'Urban Neighborhood'}</strong>).
                </p>
            </div>

            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <AnimatedStat target={stats.totalJoined} />
                    <div className="stat-label">Joined Circles</div>
                </div>
                <div className="stat-card">
                    <AnimatedStat target={stats.totalCreated} />
                    <div className="stat-label">Created Circles</div>
                </div>
                <div className="stat-card">
                    <AnimatedStat target={stats.totalEvents} />
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
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌐</div>
                                <p style={{ fontStyle: 'italic' }}>
                                    You haven't joined any circles yet.
                                </p>
                                <small>Click 'Explore All' to find nearby circles!</small>
                            </div>
                        ) : (
                            joinedCircles.map((circle) => (
                                <div key={circle._id || circle.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
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
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
                                <p style={{ fontStyle: 'italic' }}>
                                    No upcoming events in your joined circles yet.
                                </p>
                                <small>Check the Events tab to explore!</small>
                            </div>
                        ) : (
                            upcomingEvents.map((event) => (
                                <div key={event._id || event.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontWeight: '600', color: '#10b981' }}>{event.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                                        📍 {event.location} • 📅{' '}
                                        {new Date(event.event_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
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

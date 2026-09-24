import React, { useState, useEffect } from 'react';
import { api } from '../api';

/* ── Toast ────────────────────────────────────────────────── */
function Toast({ message, type, onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, []);
    return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {message}</div>;
}

/* ── Skeleton loader ──────────────────────────────────────── */
function SkeletonCards() {
    return (
        <div className="grid-cards">
            {[1, 2, 3].map(i => (
                <div key={i} className="card">
                    <div className="skeleton skeleton-line med" style={{ marginBottom: 12 }} />
                    <div className="skeleton skeleton-line full" />
                    <div className="skeleton skeleton-line short" />
                    <div className="skeleton skeleton-line full" style={{ marginTop: 16, height: 36, borderRadius: 8 }} />
                </div>
            ))}
        </div>
    );
}

/* ── Component ───────────────────────────────────────────── */
export default function Circles({ currentUser }) {
    const [circles, setCircles]             = useState([]);
    const [searchTerm, setSearchTerm]       = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState('');
    const [actionError, setActionError]     = useState('');
    const [toast, setToast]                 = useState(null);   // { message, type }
    const [busyCircle, setBusyCircle]       = useState(null);   // circleId being processed

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCircle, setNewCircle] = useState({
        name: '', description: '', category: 'Hobbies',
        location: currentUser.location || 'Downtown Heights'
    });
    const [createError, setCreateError]   = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // View modal
    const [viewingCircle, setViewingCircle] = useState(null);
    const [circleMembers, setCircleMembers] = useState([]);

    const currentUserId = currentUser._id || currentUser.id;

    useEffect(() => { fetchCircles(); }, [currentUser]);

    const fetchCircles = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getCircles(currentUserId);
            setCircles(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch circles.');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleJoin = async (circleId) => {
        setBusyCircle(circleId);
        setActionError('');
        try {
            await api.joinCircle(circleId, currentUserId);
            showToast('Successfully joined the circle! 🎉');
            fetchCircles();
        } catch (err) {
            setActionError(err.message || 'Error joining circle');
        } finally {
            setBusyCircle(null);
        }
    };

    const handleLeave = async (circleId) => {
        setBusyCircle(circleId);
        setActionError('');
        try {
            await api.leaveCircle(circleId, currentUserId);
            showToast('You have left the circle.', 'info');
            fetchCircles();
        } catch (err) {
            setActionError(err.message || 'Error leaving circle');
        } finally {
            setBusyCircle(null);
        }
    };

    const handleCreateCircle = async (e) => {
        e.preventDefault();
        setCreateError('');
        if (!newCircle.name.trim()) { setCreateError('Circle name is required.'); return; }
        if (!newCircle.description.trim()) { setCreateError('Description is required.'); return; }
        if (!newCircle.location.trim()) { setCreateError('Location is required.'); return; }

        setCreateLoading(true);
        try {
            await api.createCircle({ ...newCircle, created_by: currentUserId });
            setShowCreateModal(false);
            setNewCircle({ name: '', description: '', category: 'Hobbies', location: currentUser.location || 'Downtown Heights' });
            showToast('Circle created successfully! 🌟');
            fetchCircles();
        } catch (err) {
            setCreateError(err.message || 'Error creating circle');
        } finally {
            setCreateLoading(false);
        }
    };

    const openCircleDetails = async (circle) => {
        setViewingCircle(circle);
        setCircleMembers([]);
        try {
            const members = await api.getCircleMembers(circle._id || circle.id);
            setCircleMembers(members);
        } catch (err) {
            console.error('Error fetching members:', err);
        }
    };

    const filteredCircles = circles.filter(c => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (c.name || '').toLowerCase().includes(term) ||
            (c.description || '').toLowerCase().includes(term) ||
            (c.location || '').toLowerCase().includes(term);
        const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Interest Circles</h2>
                    <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                        Discover, join, or create hyper-local communities in your area.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Create New Circle
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {actionError && <div className="alert alert-danger">⚠️ {actionError}</div>}

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <input
                    type="text" className="form-input"
                    placeholder="🔍 Search circles by name, description, or location…"
                    style={{ flex: 1, minWidth: '240px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="form-select" style={{ width: '180px' }}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="All">All Categories</option>
                    <option value="Hobbies">Hobbies</option>
                    <option value="Environment">Environment</option>
                    <option value="Technology">Technology</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Arts">Arts & Culture</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            {loading ? <SkeletonCards /> : (
                <div className="grid-cards">
                    {filteredCircles.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-emoji">🔍</div>
                            <p>No circles found matching your criteria.</p>
                            <small>Try adjusting your search or category filter!</small>
                        </div>
                    ) : (
                        filteredCircles.map((circle) => {
                            const cId = circle._id || circle.id;
                            const createdBy = circle.created_by?._id || circle.created_by;
                            const isOwner = String(createdBy) === String(currentUserId);
                            const isBusy = busyCircle === cId;

                            return (
                                <div key={cId} className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">{circle.name}</h3>
                                        <span className="badge badge-emerald">{circle.category}</span>
                                    </div>

                                    <div className="card-body">{circle.description}</div>

                                    <div className="card-meta">
                                        <div className="meta-item">📍 {circle.location}</div>
                                        <div className="meta-item">👥 {circle.member_count} Members</div>
                                        <div className="meta-item">👤 Created by {circle.creator_name || 'Community Member'}</div>
                                    </div>

                                    <div className="card-footer">
                                        <button className="btn btn-outline btn-sm" onClick={() => openCircleDetails(circle)}>
                                            View Details
                                        </button>

                                        {isOwner ? (
                                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>⭐ Your Circle</span>
                                        ) : circle.is_member ? (
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleLeave(cId)}
                                                disabled={isBusy}
                                            >
                                                {isBusy ? <><span className="spinner" style={{ borderTopColor: 'white', width: 14, height: 14 }} /> Leaving…</> : 'Leave Circle'}
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleJoin(cId)}
                                                disabled={isBusy}
                                            >
                                                {isBusy ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Joining…</> : 'Join Circle'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type || 'success'}
                    onDone={() => setToast(null)}
                />
            )}

            {/* Create Circle Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Create a New Interest Circle</h3>
                            <button className="close-btn" onClick={() => { setShowCreateModal(false); setCreateError(''); }}>✕</button>
                        </div>

                        {createError && <div className="alert alert-danger">⚠️ {createError}</div>}

                        <form onSubmit={handleCreateCircle}>
                            <div className="form-group">
                                <label>Circle Name <span className="required-star">*</span></label>
                                <input
                                    type="text" className="form-input"
                                    placeholder="e.g. Neighborhood Book Club"
                                    value={newCircle.name}
                                    onChange={(e) => setNewCircle({ ...newCircle, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    className="form-select"
                                    value={newCircle.category}
                                    onChange={(e) => setNewCircle({ ...newCircle, category: e.target.value })}
                                >
                                    <option value="Hobbies">Hobbies</option>
                                    <option value="Environment">Environment</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Fitness">Fitness</option>
                                    <option value="Arts">Arts & Culture</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Neighborhood / Location <span className="required-star">*</span></label>
                                <input
                                    type="text" className="form-input"
                                    value={newCircle.location}
                                    onChange={(e) => setNewCircle({ ...newCircle, location: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Description <span className="required-star">*</span></label>
                                <textarea
                                    className="form-textarea" rows="3"
                                    placeholder="What is this circle about? Who should join?"
                                    value={newCircle.description}
                                    onChange={(e) => setNewCircle({ ...newCircle, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => { setShowCreateModal(false); setCreateError(''); }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                                    {createLoading ? <><span className="spinner" /> Creating…</> : 'Create Circle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Circle Details Modal */}
            {viewingCircle && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{viewingCircle.name}</h3>
                            <button className="close-btn" onClick={() => setViewingCircle(null)}>✕</button>
                        </div>
                        <div>
                            <span className="badge badge-emerald" style={{ marginBottom: '12px', display: 'inline-block' }}>
                                {viewingCircle.category}
                            </span>
                            <p style={{ color: '#475569', margin: '10px 0' }}>{viewingCircle.description}</p>
                            <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '16px' }}>
                                📍 <strong>Location:</strong> {viewingCircle.location}<br />
                                👤 <strong>Created By:</strong> {viewingCircle.creator_name}
                            </div>

                            <h4 style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '14px' }}>
                                Members ({circleMembers.length})
                            </h4>
                            {circleMembers.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 8 }}>Loading members…</p>
                            ) : (
                                <ul className="member-list">
                                    {circleMembers.map(m => (
                                        <li key={m._id || m.id} className="member-item">
                                            <div className="avatar" style={{ background: '#10b981' }}>
                                                {m.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{m.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.location}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

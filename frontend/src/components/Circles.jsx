import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Circles({ currentUser }) {
    const [circles, setCircles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state for Create Circle
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCircle, setNewCircle] = useState({
        name: '',
        description: '',
        category: 'Hobbies',
        location: currentUser.location || 'Downtown Heights'
    });

    // Modal state for Circle Details & Members
    const [viewingCircle, setViewingCircle] = useState(null);
    const [circleMembers, setCircleMembers] = useState([]);

    useEffect(() => {
        fetchCircles();
    }, [currentUser]);

    const fetchCircles = async () => {
        try {
            setLoading(true);
            const data = await api.getCircles(currentUser ? currentUser.id : '');
            setCircles(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch circles.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (circleId) => {
        try {
            await api.joinCircle(circleId, currentUser.id);
            fetchCircles();
        } catch (err) {
            alert(err.message || 'Error joining circle');
        }
    };

    const handleLeave = async (circleId) => {
        try {
            await api.leaveCircle(circleId, currentUser.id);
            fetchCircles();
        } catch (err) {
            alert(err.message || 'Error leaving circle');
        }
    };

    const handleCreateCircle = async (e) => {
        e.preventDefault();
        try {
            await api.createCircle({
                ...newCircle,
                created_by: currentUser.id
            });
            setShowCreateModal(false);
            setNewCircle({
                name: '',
                description: '',
                category: 'Hobbies',
                location: currentUser.location || 'Downtown Heights'
            });
            fetchCircles();
        } catch (err) {
            alert(err.message || 'Error creating circle');
        }
    };

    const openCircleDetails = async (circle) => {
        setViewingCircle(circle);
        try {
            const members = await api.getCircleMembers(circle.id);
            setCircleMembers(members);
        } catch (err) {
            console.error('Error fetching members:', err);
        }
    };

    const filteredCircles = circles.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div>
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

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Search circles by name, description, or location..."
                    style={{ flex: 1, minWidth: '240px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="form-select"
                    style={{ width: '180px' }}
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

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading circles...</div>
            ) : (
                <div className="grid-cards">
                    {filteredCircles.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            No circles found matching your criteria. Try adjusting your search!
                        </div>
                    ) : (
                        filteredCircles.map((circle) => (
                            <div key={circle.id} className="card">
                                <div className="card-header">
                                    <h3 className="card-title">{circle.name}</h3>
                                    <span className="badge badge-emerald">{circle.category}</span>
                                </div>

                                <div className="card-body">
                                    {circle.description}
                                </div>

                                <div className="card-meta">
                                    <div className="meta-item">📍 {circle.location}</div>
                                    <div className="meta-item">👥 {circle.member_count} Members</div>
                                    <div className="meta-item">👤 Created by {circle.creator_name || 'Community Member'}</div>
                                </div>

                                <div className="card-footer">
                                    <button className="btn btn-outline btn-sm" onClick={() => openCircleDetails(circle)}>
                                        View Details
                                    </button>

                                    {circle.is_member ? (
                                        <button className="btn btn-danger btn-sm" onClick={() => handleLeave(circle.id)}>
                                            Leave Circle
                                        </button>
                                    ) : (
                                        <button className="btn btn-primary btn-sm" onClick={() => handleJoin(circle.id)}>
                                            Join Circle
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Circle Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Create a New Interest Circle</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateCircle}>
                            <div className="form-group">
                                <label>Circle Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Neighborhood Book Club"
                                    value={newCircle.name}
                                    onChange={(e) => setNewCircle({ ...newCircle, name: e.target.value })}
                                    required
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
                                <label>Neighborhood / Location</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newCircle.location}
                                    onChange={(e) => setNewCircle({ ...newCircle, location: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    className="form-textarea"
                                    rows="3"
                                    placeholder="What is this circle about? Who should join?"
                                    value={newCircle.description}
                                    onChange={(e) => setNewCircle({ ...newCircle, description: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Circle
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
                                📍 <strong>Location:</strong> {viewingCircle.location}<br/>
                                👤 <strong>Created By:</strong> {viewingCircle.creator_name}
                            </div>

                            <h4 style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '14px' }}>
                                Members ({circleMembers.length})
                            </h4>
                            <ul className="member-list">
                                {circleMembers.map(m => (
                                    <li key={m.id} className="member-item">
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

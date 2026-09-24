import React, { useState, useEffect } from 'react';
import { api } from '../api';

/* ── Avatar gradient by first letter ─────────────────────── */
const AVATAR_COLORS = [
    'linear-gradient(135deg,#10b981,#047857)',
    'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    'linear-gradient(135deg,#ef4444,#b91c1c)',
    'linear-gradient(135deg,#ec4899,#be185d)',
];

function avatarGradient(name = '') {
    const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

/* ── Component ───────────────────────────────────────────── */
export default function Profile({ currentUser, onUserUpdated }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name:      currentUser.name      || '',
        location:  currentUser.location  || '',
        bio:       currentUser.bio       || '',
        interests: currentUser.interests || '',
        skills:    currentUser.skills    || ''
    });
    const [message, setMessage] = useState('');
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);

    const currentUserId = currentUser._id || currentUser.id;

    // Auto-dismiss success message after 3 s
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(''), 3000);
        return () => clearTimeout(t);
    }, [message]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        if (!formData.name.trim()) { setError('Name cannot be empty.'); return; }
        setLoading(true);

        try {
            const res = await api.updateUserProfile(currentUserId, formData);
            setMessage('Profile updated successfully! ✅');
            onUserUpdated(res.user);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Error updating profile.');
        } finally {
            setLoading(false);
        }
    };

    const memberSince = currentUser.createdAt
        ? new Date(currentUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
        : null;

    return (
        <div className="page-enter" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="page-header">
                <h2 className="page-title">My Profile</h2>
                {!isEditing && (
                    <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                        ✏️ Edit Profile
                    </button>
                )}
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error   && <div className="alert alert-danger">⚠️ {error}</div>}

            <div className="card">
                {isEditing ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Full Name <span className="required-star">*</span></label>
                            <input
                                type="text" name="name" className="form-input"
                                value={formData.name} onChange={handleChange}
                                placeholder="Your full name"
                            />
                            <span className="form-hint">This will be displayed across the app</span>
                        </div>

                        <div className="form-group">
                            <label>Neighborhood / Location</label>
                            <input
                                type="text" name="location" className="form-input"
                                value={formData.location} onChange={handleChange}
                                placeholder="e.g. Downtown Heights"
                            />
                            <span className="form-hint">Your local area or neighborhood</span>
                        </div>

                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                name="bio" className="form-textarea" rows="3"
                                value={formData.bio} onChange={handleChange}
                                placeholder="Tell the community a little about yourself…"
                            />
                        </div>

                        <div className="form-group">
                            <label>Interests</label>
                            <input
                                type="text" name="interests" className="form-input"
                                value={formData.interests} onChange={handleChange}
                                placeholder="Reading, Gardening, Tech"
                            />
                            <span className="form-hint">Comma-separated list of your interests</span>
                        </div>

                        <div className="form-group">
                            <label>Skills to Share</label>
                            <input
                                type="text" name="skills" className="form-input"
                                value={formData.skills} onChange={handleChange}
                                placeholder="Yoga, Coding, Cooking"
                            />
                            <span className="form-hint">Comma-separated skills you can share with the community</span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                type="button" className="btn btn-outline"
                                onClick={() => { setIsEditing(false); setError(''); }}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        {/* Avatar + basic info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                            <div
                                className="profile-avatar"
                                style={{ background: avatarGradient(currentUser.name) }}
                            >
                                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{currentUser.name}</h3>
                                <p style={{ color: '#64748b' }}>✉️ {currentUser.email}</p>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                    📍 {currentUser.location || 'Urban Neighborhood'}
                                </p>
                                {memberSince && (
                                    <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 2 }}>
                                        🗓 Member since {memberSince}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Detail sections */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                            <div>
                                <strong style={{ color: '#0f172a' }}>About / Bio:</strong>
                                <p style={{ color: '#475569', marginTop: '4px' }}>
                                    {currentUser.bio || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No bio added yet. Click Edit Profile to add one.</span>}
                                </p>
                            </div>

                            <div>
                                <strong style={{ color: '#0f172a' }}>Interests:</strong>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {(currentUser.interests || 'Community, Events')
                                        .split(',')
                                        .map((item, idx) => (
                                            <span key={idx} className="badge badge-emerald">{item.trim()}</span>
                                        ))}
                                </div>
                            </div>

                            <div>
                                <strong style={{ color: '#0f172a' }}>Skills to Share:</strong>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {(currentUser.skills || 'Networking')
                                        .split(',')
                                        .map((item, idx) => (
                                            <span key={idx} className="badge badge-blue">{item.trim()}</span>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

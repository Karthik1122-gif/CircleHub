import React, { useState } from 'react';
import { api } from '../api';

export default function Profile({ currentUser, onUserUpdated }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: currentUser.name || '',
        location: currentUser.location || '',
        bio: currentUser.bio || '',
        interests: currentUser.interests || '',
        skills: currentUser.skills || ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const res = await api.updateUserProfile(currentUser.id, formData);
            setMessage('Profile updated successfully!');
            onUserUpdated(res.user);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Error updating profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="page-header">
                <h2 className="page-title">User Profile</h2>
                {!isEditing && (
                    <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                        ✏️ Edit Profile
                    </button>
                )}
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card">
                {isEditing ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Neighborhood / Location</label>
                            <input
                                type="text"
                                name="location"
                                className="form-input"
                                value={formData.location}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                name="bio"
                                className="form-textarea"
                                rows="3"
                                value={formData.bio}
                                onChange={handleChange}
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label>Interests</label>
                            <input
                                type="text"
                                name="interests"
                                className="form-input"
                                value={formData.interests}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Skills to Share</label>
                            <input
                                type="text"
                                name="skills"
                                className="form-input"
                                value={formData.skills}
                                onChange={handleChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button 
                                type="button" 
                                className="btn btn-outline"
                                onClick={() => { setIsEditing(false); setError(''); }}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                            <div 
                                className="avatar" 
                                style={{ width: '64px', height: '64px', fontSize: '1.8rem', background: '#10b981' }}
                            >
                                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{currentUser.name}</h3>
                                <p style={{ color: '#64748b' }}>✉️ {currentUser.email}</p>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>📍 {currentUser.location || 'Urban Neighborhood'}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                            <div>
                                <strong style={{ color: '#0f172a' }}>About / Bio:</strong>
                                <p style={{ color: '#475569', marginTop: '4px' }}>
                                    {currentUser.bio || 'No bio added yet.'}
                                </p>
                            </div>

                            <div>
                                <strong style={{ color: '#0f172a' }}>Interests:</strong>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {(currentUser.interests || 'Community, Events').split(',').map((item, idx) => (
                                        <span key={idx} className="badge badge-emerald">
                                            {item.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <strong style={{ color: '#0f172a' }}>Skills to Share:</strong>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {(currentUser.skills || 'Networking').split(',').map((item, idx) => (
                                        <span key={idx} className="badge badge-blue">
                                            {item.trim()}
                                        </span>
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

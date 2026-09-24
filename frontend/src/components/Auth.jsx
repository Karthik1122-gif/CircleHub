import React, { useState } from 'react';
import { api } from '../api';

export default function Auth({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        location: 'Downtown Heights',
        bio: '',
        interests: '',
        skills: ''
    });
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
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const res = await api.login({
                    email: formData.email,
                    password: formData.password
                });
                onLoginSuccess(res.user);
            } else {
                const res = await api.register(formData);
                onLoginSuccess(res.user);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-header">
                <h2>{isLogin ? 'Welcome Back!' : 'Join CircleHub'}</h2>
                <p>
                    {isLogin 
                        ? 'Connect with your hyper-local neighborhood community' 
                        : 'Create your account to join nearby interest circles'}
                </p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            placeholder="e.g. Sarah Jenkins"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                )}

                <div className="form-group">
                    <label>Email Address</label>
                    <input
                        type="email"
                        name="email"
                        className="form-input"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        className="form-input"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                {!isLogin && (
                    <>
                        <div className="form-group">
                            <label>Neighborhood / Location</label>
                            <input
                                type="text"
                                name="location"
                                className="form-input"
                                placeholder="e.g. Downtown Heights"
                                value={formData.location}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Short Bio</label>
                            <textarea
                                name="bio"
                                className="form-textarea"
                                rows="2"
                                placeholder="Share a few words about yourself..."
                                value={formData.bio}
                                onChange={handleChange}
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label>Interests (comma separated)</label>
                            <input
                                type="text"
                                name="interests"
                                className="form-input"
                                placeholder="Reading, Gardening, Tech"
                                value={formData.interests}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Skills to share (comma separated)</label>
                            <input
                                type="text"
                                name="skills"
                                className="form-input"
                                placeholder="Yoga, Coding, Cooking"
                                value={formData.skills}
                                onChange={handleChange}
                            />
                        </div>
                    </>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                </button>
            </form>

            <div className="auth-toggle">
                {isLogin ? (
                    <p>
                        Don't have an account?{' '}
                        <span onClick={() => { setIsLogin(false); setError(''); }}>Register Now</span>
                    </p>
                ) : (
                    <p>
                        Already have an account?{' '}
                        <span onClick={() => { setIsLogin(true); setError(''); }}>Sign In</span>
                    </p>
                )}
            </div>

            {/* Quick Demo Credentials helper for beginner testing */}
            <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.82rem', color: '#64748b' }}>
                <strong>💡 Quick Demo Login:</strong><br/>
                Email: <code>alex@example.com</code> | Password: <code>password123</code>
            </div>
        </div>
    );
}

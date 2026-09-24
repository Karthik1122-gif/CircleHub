const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_ROOT = API_BASE_URL.replace('/api', '');

// 🔥 Wake up Render backend immediately on app load (prevents cold start delay)
export const wakeBackend = () => {
    fetch(`${BACKEND_ROOT}/ping`).catch(() => {});
};

// Helper wrapper for fetch requests
async function request(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong with the server.');
        }

        return data;
    } catch (err) {
        console.error(`API Error [${endpoint}]:`, err.message);
        throw err;
    }
}

export const api = {
    // Auth
    register: (userData) => request('/register', { method: 'POST', body: JSON.stringify(userData) }),
    login: (credentials) => request('/login', { method: 'POST', body: JSON.stringify(credentials) }),

    // User Profile
    getUserProfile: (userId) => request(`/users/${userId}`),
    updateUserProfile: (userId, data) => request(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Circles
    getCircles: (userId = '') => request(`/circles?userId=${userId}`),
    getCircleById: (id) => request(`/circles/${id}`),
    createCircle: (circleData) => request('/circles', { method: 'POST', body: JSON.stringify(circleData) }),
    joinCircle: (circleId, userId) => request(`/circles/${circleId}/join`, { method: 'POST', body: JSON.stringify({ userId }) }),
    leaveCircle: (circleId, userId) => request(`/circles/${circleId}/leave`, { method: 'POST', body: JSON.stringify({ userId }) }),
    getCircleMembers: (circleId) => request(`/circles/${circleId}/members`),

    // Events
    getEvents: () => request('/events'),
    createEvent: (eventData) => request('/events', { method: 'POST', body: JSON.stringify(eventData) }),

    // Dashboard
    getDashboard: (userId) => request(`/dashboard/${userId}`)
};

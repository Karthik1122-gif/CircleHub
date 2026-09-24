const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/?$/, '');

// 🔥 Wake up backend immediately on page load
export const wakeBackend = () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        fetch(`${BACKEND_ROOT}/ping`, { signal: controller.signal })
            .catch(() => {})
            .finally(() => clearTimeout(timeout));
    } catch {}
};

// Helper wrapper for fetch requests with safety timeout and resilient error handling
async function request(endpoint, options = {}) {
    const controller = new AbortController();
    // 20 second timeout so user NEVER gets stuck indefinitely
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        signal: controller.signal,
        ...options
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        clearTimeout(timeoutId);

        let data = {};
        const text = await response.text();
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { error: text || 'Server returned an invalid response.' };
        }

        if (!response.ok) {
            throw new Error(data.error || `Server returned error (${response.status})`);
        }

        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Connection timed out. The server is taking longer than expected to respond. Please try again.');
        }
        if (err.message && err.message.includes('Failed to fetch')) {
            throw new Error('Cannot reach the backend server. Please verify your internet connection or wait a moment for the server to wake up.');
        }
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

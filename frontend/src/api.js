const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
);

const LOCAL_API_URL = 'http://localhost:5000/api';
// Use relative /api on Vercel production for instant edge execution
const API_BASE_URL = isLocalhost ? LOCAL_API_URL : '/api';

// In-memory cache for ultra-fast GET queries (eliminates buffering & duplicate requests)
const apiCache = new Map();
const CACHE_TTL_MS = 12000; // 12 seconds cache for instant tab transitions

export const clearApiCache = (pattern) => {
    if (!pattern) {
        apiCache.clear();
        return;
    }
    for (const key of apiCache.keys()) {
        if (key.includes(pattern)) {
            apiCache.delete(key);
        }
    }
};

// 🔥 Wake up backend non-blockingly with a tiny 2s timeout
export const wakeBackend = () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        fetch('/api/ping', { signal: controller.signal })
            .catch(() => {})
            .finally(() => clearTimeout(timeout));
    } catch {}
};

// Helper wrapper for fetch requests with safety timeout and resilient error handling
async function request(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const cacheKey = `${method}:${endpoint}`;

    // Return cached response for GET requests if fresh
    if (method === 'GET' && !options.skipCache) {
        const cached = apiCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            return cached.data;
        }
    }

    const controller = new AbortController();
    // Fast 10 second timeout to eliminate long hangs
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        },
        signal: controller.signal,
        ...options
    };

    let targetUrl = `${API_BASE_URL}${endpoint}`;

    try {
        let response;
        try {
            response = await fetch(targetUrl, config);
        } catch (fetchErr) {
            // If local port 5000 is down, fallback to relative /api or production endpoint
            if (isLocalhost && targetUrl.startsWith(LOCAL_API_URL)) {
                const fallbackUrl = `/api${endpoint}`;
                console.warn(`Local backend unreachable (${targetUrl}). Retrying via ${fallbackUrl}...`);
                const retryController = new AbortController();
                const retryTimeout = setTimeout(() => retryController.abort(), 4000);
                try {
                    response = await fetch(fallbackUrl, { ...config, signal: retryController.signal });
                    clearTimeout(retryTimeout);
                } catch {
                    clearTimeout(retryTimeout);
                    throw fetchErr;
                }
            } else {
                throw fetchErr;
            }
        }

        clearTimeout(timeoutId);

        let data = {};
        const text = await response.text();
        const trimmedText = text ? text.trim() : '';

        if (trimmedText) {
            try {
                data = JSON.parse(trimmedText);
            } catch {
                let cleanText = trimmedText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (cleanText.length > 120) {
                    cleanText = cleanText.substring(0, 120) + '...';
                }
                data = { error: cleanText || 'Server returned an invalid non-JSON response.' };
            }
        } else {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || `Server returned error status (${response.status})`);
        }

        // Cache successful GET responses
        if (method === 'GET') {
            apiCache.set(cacheKey, { data, timestamp: Date.now() });
        } else {
            // Write operations invalidate the cache
            clearApiCache();
        }

        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Connection timed out. The server is taking longer than expected to respond.');
        }
        if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
            throw new Error('Cannot reach the backend server. Please verify your connection.');
        }
        console.error(`API Error [${endpoint}]:`, err.message);
        throw err;
    }
}

export const api = {
    // Auth
    register: (userData) => {
        clearApiCache();
        return request('/register', { method: 'POST', body: JSON.stringify(userData) });
    },
    login: (credentials) => {
        clearApiCache();
        return request('/login', { method: 'POST', body: JSON.stringify(credentials) });
    },

    // User Profile
    getUserProfile: (userId) => request(`/users/${userId}`),
    updateUserProfile: (userId, data) => {
        clearApiCache();
        return request(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    // Circles
    getCircles: (userId = '') => request(`/circles?userId=${userId}`),
    getCircleById: (id) => request(`/circles/${id}`),
    createCircle: (circleData) => {
        clearApiCache();
        return request('/circles', { method: 'POST', body: JSON.stringify(circleData) });
    },
    joinCircle: (circleId, userId) => {
        clearApiCache();
        return request(`/circles/${circleId}/join`, { method: 'POST', body: JSON.stringify({ userId }) });
    },
    leaveCircle: (circleId, userId) => {
        clearApiCache();
        return request(`/circles/${circleId}/leave`, { method: 'POST', body: JSON.stringify({ userId }) });
    },
    getCircleMembers: (circleId) => request(`/circles/${circleId}/members`),
    getCircleResources: (circleId) => request(`/circles/${circleId}/resources`),
    uploadCircleResource: (circleId, resourceData) => {
        clearApiCache();
        return request(`/circles/${circleId}/resources`, { method: 'POST', body: JSON.stringify(resourceData) });
    },
    deleteCircleResource: (circleId, resourceId) => {
        clearApiCache();
        return request(`/circles/${circleId}/resources/${resourceId}`, { method: 'DELETE' });
    },
    deleteCircle: (circleId, userId) => {
        clearApiCache();
        return request(`/circles/${circleId}?userId=${userId}`, { method: 'DELETE' });
    },

    // Events
    getEvents: (userId = '') => request(`/events?userId=${userId}`),
    createEvent: (eventData) => {
        clearApiCache();
        return request('/events', { method: 'POST', body: JSON.stringify(eventData) });
    },
    rsvpEvent: (eventId, userId) => {
        clearApiCache();
        return request(`/events/${eventId}/rsvp`, { method: 'POST', body: JSON.stringify({ userId }) });
    },
    uploadEventPhoto: (eventId, photoData) => {
        clearApiCache();
        return request(`/events/${eventId}/photos`, { method: 'POST', body: JSON.stringify(photoData) });
    },
    deleteEvent: (eventId, userId) => {
        clearApiCache();
        return request(`/events/${eventId}?userId=${userId}`, { method: 'DELETE' });
    },

    // Dashboard
    getDashboard: (userId) => request(`/dashboard/${userId}`)
};

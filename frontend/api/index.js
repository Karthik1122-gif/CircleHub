import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

// Force HTTPS on incoming serverless proxy requests
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Handle JSON syntax errors in request body safely as JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON request payload.' });
    }
    next(err);
});

// Normalize URL path from Vercel serverless rewrites so Express routes match correctly
app.use((req, res, next) => {
    const rawUrl = req.originalUrl || req.url;
    if (rawUrl && rawUrl.includes('/dashboard/')) {
        const parts = rawUrl.split('?')[0].split('/');
        const dashIdx = parts.indexOf('dashboard');
        if (dashIdx !== -1 && parts[dashIdx + 1]) {
            req.url = '/api/dashboard/' + parts[dashIdx + 1];
        }
    }
    next();
});

// High-performance cached MongoDB connection for serverless execution
let cached = global._mongooseCache;
if (!cached) {
    cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise) {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI is missing in environment variables.');
        cached.promise = mongoose.connect(uri, {
            dbName: 'circlehub',
            serverSelectionTimeoutMS: 4000,
            connectTimeoutMS: 4000,
            socketTimeoutMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 1,
            family: 4, // Force IPv4 to eliminate multi-second IPv6 DNS delays
            bufferCommands: false
        }).then((m) => m);
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (err) {
        cached.promise = null;
        throw err;
    }
}

// Ensure DB connected on every request
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('Database connection error in serverless handler:', err);
        return res.status(500).json({ error: 'Database connection failed. Please try again.' });
    }
});

// Schemas & Models
const userSchema = new mongoose.Schema({
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:      { type: String, required: true },
    location:      { type: String, default: 'Urban Neighborhood', trim: true },
    bio:           { type: String, default: '', trim: true },
    interests:     { type: String, default: 'Community, Events', trim: true },
    skills:        { type: String, default: 'Networking', trim: true },
    phone:         { type: String, default: '', trim: true },
    phone_privacy: { type: String, default: 'Circle Members', enum: ['Everyone', 'Circle Members', 'Nobody'], trim: true },
    avatar:        { type: String, default: '', trim: true }
}, { timestamps: true });

const circleResourceSchema = new mongoose.Schema({
    title:            { type: String, required: true, trim: true },
    url:              { type: String, required: true },
    file_type:        { type: String, default: 'file' },
    file_name:        { type: String, default: 'shared-file' },
    uploaded_by_name: { type: String, default: 'Community Member' },
    created_at:       { type: Date, default: Date.now }
});

const circleSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category:    { type: String, required: true, trim: true },
    location:    { type: String, required: true, trim: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resources:   [circleResourceSchema]
}, { timestamps: true });

circleSchema.index({ created_by: 1 });
circleSchema.index({ createdAt: -1 });

const circleMemberSchema = new mongoose.Schema({
    circle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    user_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joined_at: { type: Date, default: Date.now }
});
circleMemberSchema.index({ circle_id: 1, user_id: 1 }, { unique: true });

const photoSchema = new mongoose.Schema({
    url:              { type: String, required: true },
    caption:          { type: String, default: '' },
    uploaded_by_name: { type: String, default: 'Community Member' },
    created_at:       { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
    circle_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    event_date:  { type: Date, required: true },
    location:    { type: String, required: true, trim: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendees:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    photos:      [photoSchema]
}, { timestamps: true });

eventSchema.index({ circle_id: 1, event_date: 1 });
eventSchema.index({ event_date: 1 });

const User         = mongoose.models.User         || mongoose.model('User',         userSchema);
const Circle       = mongoose.models.Circle       || mongoose.model('Circle',       circleSchema);
const CircleMember = mongoose.models.CircleMember || mongoose.model('CircleMember', circleMemberSchema);
const Event        = mongoose.models.Event        || mongoose.model('Event',        eventSchema);

const formatUser = (rawUser) => {
    const obj = rawUser.toObject ? rawUser.toObject() : { ...rawUser };
    const { password, __v, ...rest } = obj;
    const idStr = String(rest._id);
    return { ...rest, _id: idStr, id: idStr };
};

const router = express.Router();

// Ping
router.get('/ping', (req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting', ts: Date.now() });
});

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, location, bio, interests, skills } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Full name is required.' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email address is required.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    try {
        const cleanEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: cleanEmail }).select('_id').lean();
        if (existing) return res.status(400).json({ error: 'This email is already registered. Please sign in instead.' });

        const newUser = await User.create({
            name:      name.trim(),
            email:     cleanEmail,
            password:  password,
            location:  (location && location.trim())  || 'Urban Neighborhood',
            bio:       (bio && bio.trim())            || '',
            interests: (interests && interests.trim()) || 'Community, Events',
            skills:    (skills && skills.trim())       || 'Networking'
        });

        return res.status(201).json({ message: 'User registered successfully!', user: formatUser(newUser) });
    } catch (err) {
        console.error('Registration Error:', err);
        return res.status(500).json({ error: err.message || 'Server error during registration.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    try {
        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail }).lean();
        if (!user) return res.status(404).json({ error: 'No account found with this email. Please register first.' });
        if (user.password !== password) return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });

        return res.json({ message: 'Login successful!', user: formatUser(user) });
    } catch (err) {
        console.error('Login Error:', err);
        return res.status(500).json({ error: 'Server error during login.' });
    }
});

// User Profile
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -__v').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });
        return res.json(formatUser(user));
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching profile.' });
    }
});

router.put('/users/:id', async (req, res) => {
    const { name, location, bio, interests, skills, phone, phone_privacy, avatar } = req.body || {};
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, location, bio, interests, skills, phone, phone_privacy, avatar },
            { new: true, runValidators: true, select: '-password -__v', lean: true }
        );
        if (!updatedUser) return res.status(404).json({ error: 'User not found.' });
        return res.json({ message: 'Profile updated!', user: formatUser(updatedUser) });
    } catch (err) {
        return res.status(500).json({ error: 'Error updating profile.' });
    }
});

// Circles
router.get('/circles', async (req, res) => {
    const userId = req.query.userId || null;
    try {
        const circles = await Circle.find().populate('created_by', 'name').sort({ createdAt: -1 }).lean();
        const circleIds = circles.map(c => c._id);
        const memberCounts = await CircleMember.aggregate([
            { $match: { circle_id: { $in: circleIds } } },
            { $group: { _id: '$circle_id', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        memberCounts.forEach(m => { countMap[m._id.toString()] = m.count; });

        let userMemberSet = new Set();
        if (userId) {
            const memberships = await CircleMember.find({ user_id: userId }).select('circle_id').lean();
            memberships.forEach(m => userMemberSet.add(m.circle_id.toString()));
        }

        const enriched = circles.map(c => ({
            ...c,
            id: c._id.toString(),
            _id: c._id.toString(),
            creator_name: c.created_by?.name || 'Community Member',
            member_count: countMap[c._id.toString()] || 0,
            is_member: userMemberSet.has(c._id.toString())
        }));

        return res.json(enriched);
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching circles.' });
    }
});

router.post('/circles', async (req, res) => {
    const { name, description, category, location, created_by } = req.body || {};
    if (!name || !description || !category || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const circle = await Circle.create({ name, description, category, location, created_by });
        await CircleMember.create({ circle_id: circle._id, user_id: created_by });
        return res.status(201).json({ message: 'Circle created!', id: circle._id.toString(), _id: circle._id.toString() });
    } catch (err) {
        return res.status(500).json({ error: 'Error creating circle.' });
    }
});

router.get('/circles/:id', async (req, res) => {
    try {
        const [circle, member_count] = await Promise.all([
            Circle.findById(req.params.id).populate('created_by', 'name').lean(),
            CircleMember.countDocuments({ circle_id: req.params.id })
        ]);
        if (!circle) return res.status(404).json({ error: 'Circle not found.' });
        return res.json({
            ...circle,
            id: circle._id.toString(),
            _id: circle._id.toString(),
            creator_name: circle.created_by?.name || 'Community Member',
            member_count
        });
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching circle.' });
    }
});

router.post('/circles/:id/join', async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    try {
        await CircleMember.findOneAndUpdate(
            { circle_id: req.params.id, user_id: userId },
            { circle_id: req.params.id, user_id: userId },
            { upsert: true, new: true }
        );
        return res.json({ message: 'Successfully joined circle!' });
    } catch (err) {
        return res.status(500).json({ error: 'Error joining circle.' });
    }
});

router.post('/circles/:id/leave', async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    try {
        await CircleMember.deleteOne({ circle_id: req.params.id, user_id: userId });
        return res.json({ message: 'Successfully left circle.' });
    } catch (err) {
        return res.status(500).json({ error: 'Error leaving circle.' });
    }
});

router.get('/circles/:id/members', async (req, res) => {
    try {
        const members = await CircleMember.find({ circle_id: req.params.id })
            .populate('user_id', 'name email location phone phone_privacy avatar')
            .sort({ joined_at: 1 })
            .lean();
        const result = members.map(m => ({
            id: m.user_id?._id ? m.user_id._id.toString() : String(m.user_id),
            _id: m.user_id?._id ? m.user_id._id.toString() : String(m.user_id),
            name: m.user_id?.name || 'Member',
            email: m.user_id?.email || '',
            location: m.user_id?.location || '',
            phone: m.user_id?.phone || '',
            phone_privacy: m.user_id?.phone_privacy || 'Circle Members',
            avatar: m.user_id?.avatar || '',
            joined_at: m.joined_at
        }));
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching members.' });
    }
});

// Circle Resources Endpoints
router.get('/circles/:id/resources', async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id).select('resources').lean();
        if (!circle) return res.status(404).json({ error: 'Circle not found.' });
        return res.json(circle.resources || []);
    } catch (err) {
        console.error('Get Resources Error:', err);
        return res.status(500).json({ error: 'Error fetching resources.' });
    }
});

router.post('/circles/:id/resources', async (req, res) => {
    const { title, url, file_type, file_name, uploaded_by_name } = req.body || {};
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Resource title is required.' });
    }
    if (!url || !url.trim()) {
        return res.status(400).json({ error: 'File attachment or photo URL is required.' });
    }

    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) return res.status(404).json({ error: 'Circle not found.' });

        const newResource = {
            title: title.trim(),
            url: url.trim(),
            file_type: file_type || 'file',
            file_name: file_name || 'shared-file',
            uploaded_by_name: uploaded_by_name || 'Community Member',
            created_at: new Date()
        };

        if (!circle.resources) circle.resources = [];
        circle.resources.push(newResource);
        await circle.save();

        return res.status(201).json({
            message: 'Resource shared successfully! 📁',
            resources: circle.resources
        });
    } catch (err) {
        console.error('Upload Resource Error:', err);
        return res.status(500).json({ error: 'Error sharing resource.' });
    }
});

router.delete('/circles/:id/resources/:resourceId', async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) return res.status(404).json({ error: 'Circle not found.' });

        if (circle.resources) {
            circle.resources = circle.resources.filter(r => r._id.toString() !== req.params.resourceId);
            await circle.save();
        }

        return res.json({
            message: 'Resource removed successfully.',
            resources: circle.resources || []
        });
    } catch (err) {
        console.error('Delete Resource Error:', err);
        return res.status(500).json({ error: 'Error removing resource.' });
    }
});

router.delete('/circles/:id', async (req, res) => {
    const userId = req.query.userId || req.body?.userId;
    try {
        const circle = await Circle.findById(req.params.id);
        if (!circle) return res.status(404).json({ error: 'Circle not found.' });

        if (userId && String(circle.created_by) !== String(userId)) {
            return res.status(403).json({ error: 'Only the circle creator can remove this circle.' });
        }

        await Promise.all([
            Circle.findByIdAndDelete(req.params.id),
            CircleMember.deleteMany({ circle_id: req.params.id }),
            Event.deleteMany({ circle_id: req.params.id })
        ]);

        return res.json({ message: 'Circle removed successfully!' });
    } catch (err) {
        console.error('Delete Circle Error:', err);
        return res.status(500).json({ error: 'Error removing circle.' });
    }
});

// Events
router.get('/events', async (req, res) => {
    const userId = req.query.userId || null;
    try {
        const events = await Event.find().populate('circle_id', 'name').populate('created_by', 'name').sort({ event_date: 1 }).lean();
        const result = events.map(e => {
            const attendees = e.attendees || [];
            const is_attending = userId ? attendees.some(id => String(id) === String(userId)) : false;
            return {
                ...e,
                id: e._id.toString(),
                _id: e._id.toString(),
                circle_name:  e.circle_id?.name  || 'Community Circle',
                creator_name: e.created_by?.name || 'Community Member',
                photos: e.photos || [],
                attendees,
                attendees_count: attendees.length,
                is_attending
            };
        });
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching events.' });
    }
});

router.post('/events', async (req, res) => {
    const { circle_id, title, description, event_date, location, created_by } = req.body || {};
    if (!circle_id || !title || !description || !event_date || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const event = await Event.create({ circle_id, title, description, event_date, location, created_by, attendees: [created_by], photos: [] });
        return res.status(201).json({ message: 'Event created successfully!', id: event._id.toString(), _id: event._id.toString() });
    } catch (err) {
        return res.status(500).json({ error: 'Error creating event.' });
    }
});

router.post('/events/:id/rsvp', async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });

    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        if (!event.attendees) event.attendees = [];

        const userStr = String(userId);
        const index = event.attendees.findIndex(id => String(id) === userStr);

        let is_attending = false;
        if (index > -1) {
            // Cancel RSVP
            event.attendees.splice(index, 1);
            is_attending = false;
        } else {
            // Join RSVP
            event.attendees.push(userId);
            is_attending = true;
        }

        await event.save();

        return res.json({
            message: is_attending ? 'RSVP recorded! See you there! 🎊' : 'RSVP cancelled.',
            is_attending,
            attendees_count: event.attendees.length
        });
    } catch (err) {
        console.error('RSVP Error:', err);
        return res.status(500).json({ error: 'Server error processing RSVP.' });
    }
});

router.post('/events/:id/photos', async (req, res) => {
    const { url, caption, uploaded_by_name } = req.body || {};
    if (!url || !url.trim()) {
        return res.status(400).json({ error: 'Photo URL or image data is required.' });
    }
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        const newPhoto = {
            url: url.trim(),
            caption: (caption && caption.trim()) || 'Game Photo',
            uploaded_by_name: (uploaded_by_name && uploaded_by_name.trim()) || 'Community Member',
            created_at: new Date()
        };

        if (!event.photos) event.photos = [];
        event.photos.push(newPhoto);
        await event.save();

        return res.status(201).json({
            message: 'Photo uploaded successfully!',
            photos: event.photos
        });
    } catch (err) {
        console.error('Upload Photo Error:', err);
        return res.status(500).json({ error: 'Server error saving photo.' });
    }
});

router.delete('/events/:id', async (req, res) => {
    const userId = req.query.userId || req.body?.userId;
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found.' });

        if (userId && String(event.created_by) !== String(userId)) {
            return res.status(403).json({ error: 'Only the event creator can remove this event.' });
        }

        await Event.findByIdAndDelete(req.params.id);

        return res.json({ message: 'Event removed successfully!' });
    } catch (err) {
        console.error('Delete Event Error:', err);
        return res.status(500).json({ error: 'Error removing event.' });
    }
});

// Dashboard
router.get('/dashboard/:userId', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const cleanUserId = (req.params.userId || '').trim();
    try {
        let validUserObjectId = null;
        if (mongoose.Types.ObjectId.isValid(cleanUserId)) {
            try { validUserObjectId = new mongoose.Types.ObjectId(cleanUserId); } catch {}
        }

        const userMatch = validUserObjectId ? [validUserObjectId] : [cleanUserId];
        const userQuery = validUserObjectId ? { _id: validUserObjectId } : { email: cleanUserId.toLowerCase() };

        const [
            user,
            memberships,
            createdCirclesRaw,
            recommendedCirclesRaw,
            allUpcomingEventsRaw,
            eventsCreatedCount,
            eventsJoinedCount,
            circlesJoinedCount,
            circlesCreatedCount
        ] = await Promise.all([
            User.findOne(userQuery).select('-password -__v').lean(),
            CircleMember.find({ user_id: { $in: userMatch } }).select('circle_id').maxTimeMS(5000).lean(),
            Circle.find({ created_by: { $in: userMatch } }).maxTimeMS(5000).lean(),
            Circle.find({ created_by: { $nin: userMatch } }).sort({ createdAt: -1 }).limit(6).maxTimeMS(5000).lean(),
            Event.find({ event_date: { $gte: new Date() } })
                .populate('circle_id', 'name')
                .populate('created_by', 'name')
                .sort({ event_date: 1 })
                .limit(6)
                .maxTimeMS(5000)
                .lean(),
            Event.countDocuments({ created_by: { $in: userMatch } }),
            Event.countDocuments({ $or: [{ attendees: { $in: userMatch } }, { created_by: { $in: userMatch } }] }),
            CircleMember.countDocuments({ user_id: { $in: userMatch } }),
            Circle.countDocuments({ created_by: { $in: userMatch } })
        ]);

        const joinedCircleIds = memberships.map(m => m.circle_id);

        const joinedCirclesRaw = joinedCircleIds.length > 0
            ? await Circle.find({ _id: { $in: joinedCircleIds } }).maxTimeMS(5000).lean()
            : [];

        // All relevant circle IDs for count mapping
        const allCircleIds = [...new Set([
            ...joinedCirclesRaw.map(c => c._id),
            ...createdCirclesRaw.map(c => c._id),
            ...recommendedCirclesRaw.map(c => c._id)
        ])];

        let countMap = {};
        if (allCircleIds.length > 0) {
            const memberCounts = await CircleMember.aggregate([
                { $match: { circle_id: { $in: allCircleIds } } },
                { $group: { _id: '$circle_id', count: { $sum: 1 } } }
            ]);
            memberCounts.forEach(m => { countMap[m._id.toString()] = m.count; });
        }

        const joinedCircleSet = new Set(joinedCircleIds.map(id => id.toString()));

        const joinedCircles = joinedCirclesRaw.map(c => ({
            ...c,
            id: c._id.toString(),
            _id: c._id.toString(),
            member_count: countMap[c._id.toString()] || 0,
            is_member: true
        }));

        const createdCircles = createdCirclesRaw.map(c => ({
            ...c,
            id: c._id.toString(),
            _id: c._id.toString(),
            member_count: countMap[c._id.toString()] || 0,
            is_member: joinedCircleSet.has(c._id.toString())
        }));

        const recommendedCircles = recommendedCirclesRaw
            .filter(c => !joinedCircleSet.has(c._id.toString()))
            .map(c => ({
                ...c,
                id: c._id.toString(),
                _id: c._id.toString(),
                member_count: countMap[c._id.toString()] || 0,
                is_member: false
            }));

        // Filter upcoming events for joined circles if any joined, else show all community upcoming events
        const joinedUpcomingEvents = allUpcomingEventsRaw.filter(e =>
            joinedCircleSet.has(e.circle_id?._id ? e.circle_id._id.toString() : String(e.circle_id))
        );

        const displayUpcomingEvents = (joinedUpcomingEvents.length > 0 ? joinedUpcomingEvents : allUpcomingEventsRaw)
            .map(e => ({
                ...e,
                id: e._id.toString(),
                _id: e._id.toString(),
                circle_name:  e.circle_id?.name  || 'Community Circle',
                creator_name: e.created_by?.name || 'Community Member',
                photos: e.photos || []
            }));

        // Collect recent game photos across all events
        const eventsWithPhotos = await Event.find({ 'photos.0': { $exists: true } })
            .select('title photos circle_id')
            .populate('circle_id', 'name')
            .sort({ updatedAt: -1 })
            .limit(6)
            .maxTimeMS(5000)
            .lean();

        let recentPhotos = [];
        eventsWithPhotos.forEach(ev => {
            (ev.photos || []).forEach(p => {
                recentPhotos.push({
                    ...p,
                    event_id: ev._id.toString(),
                    event_title: ev.title,
                    circle_name: ev.circle_id?.name || 'Community Circle'
                });
            });
        });
        recentPhotos = recentPhotos.slice(0, 8);

        return res.json({
            user: user ? { ...user, _id: user._id.toString(), id: user._id.toString() } : null,
            joinedCircles,
            createdCircles,
            recommendedCircles,
            upcomingEvents: displayUpcomingEvents,
            recentPhotos,
            stats: {
                eventsCreated:  eventsCreatedCount,
                eventsJoined:   eventsJoinedCount,
                circlesCreated: circlesCreatedCount,
                circlesJoined:  circlesJoinedCount,
                totalJoined:    circlesJoinedCount,
                totalCreated:   circlesCreatedCount,
                totalEvents:    eventsCreatedCount,
                totalPhotos:    recentPhotos.length
            }
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        return res.json({
            user: null,
            joinedCircles: [], createdCircles: [], recommendedCircles: [],
            upcomingEvents: [], recentPhotos: [],
            stats: { totalJoined: 0, totalCreated: 0, totalEvents: 0, totalPhotos: 0 }
        });
    }
});

// Mount router on both /api and / to handle all routing conventions seamlessly
app.use('/api', router);
app.use('/', router);

// Catch-all error middleware ensuring all errors return JSON responses
app.use((err, req, res, next) => {
    console.error('Unhandled serverless error:', err);
    const statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;
    return res.status(statusCode).json({
        error: err.message || 'An unexpected server error occurred.'
    });
});

export default app;

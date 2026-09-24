# CircleHub - Hyper-Local Neighborhood Community Platform 🏡🌐

CircleHub is a modern web application designed to foster local offline communities by connecting neighbors around shared interests, skills, and events.

---

## 🌟 Key Features

1. **Hyper-Local Interest Circles**:
   - Create or join local circles (Hobbies, Environment, Technology, Fitness, Arts, etc.).
   - View member directories and creator info for each circle.

2. **Community Events & Meetups**:
   - Host and publish events hosted by specific circles.
   - Interactive RSVP for local workshops, discussions, and gatherings.

3. **User Profiles & Skill Sharing**:
   - Customizable profiles with location, bio, interests, and skills to share.
   - Neighborhood-scoped user dashboard.

4. **REST API Backend & Clean Database Architecture**:
   - Express & Node.js backend API with MySQL pool database connection.
   - Structured MySQL database schema (`circlehub.sql`).

---

## 📁 Project Structure

```text
CircleHub/
├── circlehub.sql           # Database schema & sample seed data
├── backend/
│   ├── server.js           # Main Express REST API server
│   ├── db.js               # MySQL database connection pool
│   ├── .env                # Environment configuration
│   ├── .env.example        # Environment template
│   └── package.json        # Node dependencies (express, mysql2, cors, dotenv)
├── frontend/
│   ├── index.html          # HTML entry point
│   ├── package.json        # Frontend dependencies (React, Vite)
│   ├── vite.config.js      # Vite configuration
│   └── src/
│       ├── main.jsx        # React DOM render entry point
│       ├── App.jsx         # App component & state management
│       ├── api.js          # API client wrapper
│       ├── index.css       # Styling & design system
│       └── components/     # UI components (Navbar, Auth, Dashboard, Circles, Events, Profile)
└── README.md
```

---

## 🚀 Getting Started

### 1. Setup Database
Import `circlehub.sql` into MySQL:
```bash
mysql -u root -p < circlehub.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
npm start
```
The backend server runs at `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The React frontend runs at `http://localhost:5173`.

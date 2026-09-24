-- CircleHub Database Schema & Sample Data

CREATE DATABASE IF NOT EXISTS circlehub;
USE circlehub;

-- Drop tables if they already exist (clean setup)
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS circle_members;
DROP TABLE IF EXISTS circles;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    location VARCHAR(100) DEFAULT 'Urban Neighborhood',
    bio TEXT,
    interests VARCHAR(255) DEFAULT 'Community, Events',
    skills VARCHAR(255) DEFAULT 'Networking',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Circles Table
CREATE TABLE circles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Circle Members Table (Many-to-Many)
CREATE TABLE circle_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    circle_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_membership (circle_id, user_id),
    FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Events Table
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    circle_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    event_date DATETIME NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Sample Users
INSERT INTO users (id, name, email, password, location, bio, interests, skills) VALUES
(1, 'Alex Johnson', 'alex@example.com', 'password123', 'Downtown Heights', 'Avid reader, tech builder, and urban gardener.', 'Reading, Gardening, Tech', 'Gardening, Web Dev'),
(2, 'Priya Sharma', 'priya@example.com', 'password123', 'Green Park', 'Fitness enthusiast, home baker, and community advocate.', 'Fitness, Baking, Music', 'Baking, Yoga'),
(3, 'David Miller', 'david@example.com', 'password123', 'Downtown Heights', 'Passionate about neighborhood social events and board games.', 'Board Games, Volunteer, Tech', 'Event Organizing');

-- Seed Sample Circles
INSERT INTO circles (id, name, description, category, location, created_by) VALUES
(1, 'Downtown Book Club', 'Weekly gatherings to discuss fiction, non-fiction, and local authors.', 'Hobbies', 'Downtown Heights', 1),
(2, 'Urban Gardeners Collective', 'Sharing seeds, gardening tips, and harvesting fresh produce together.', 'Environment', 'Green Park', 1),
(3, 'Local Tech & Code Meetup', 'Casual meetup for developers, tech enthusiasts, and beginners.', 'Technology', 'Downtown Heights', 3);

-- Seed Sample Memberships
INSERT INTO circle_members (circle_id, user_id) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 3),
(3, 1);

-- Seed Sample Events
INSERT INTO events (circle_id, title, description, event_date, location, created_by) VALUES
(1, 'Sci-Fi Monthly Book Discussion', 'Discussing sci-fi classics and sharing book recommendations.', '2026-10-05 18:00:00', 'Downtown Library Room B', 1),
(2, 'Autumn Seed Swap & Compost Workshop', 'Bring your extra seeds and learn how to start home composting.', '2026-10-12 10:00:00', 'Community Park Pavilion', 1),
(3, 'Beginner Web Dev & Coffee', 'Hands-on coding session for beginners building neighborhood projects.', '2026-10-15 17:30:00', 'Central Cafe & Hub', 3);

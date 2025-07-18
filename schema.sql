-- ENUM TYPES
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE booking_type AS ENUM ('individual', 'team');

-- 1. CITIES
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. USERS (moved up)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(100) NOT NULL
);

-- 3. APARTMENTS
CREATE TABLE apartments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city_id INT REFERENCES cities(id) ON DELETE CASCADE,
    google_map_link TEXT
);

-- 4. FLATS
CREATE TABLE flats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    apartment_id INT REFERENCES apartments(id) ON DELETE CASCADE
);

-- 5. ROOMS
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    flat_id INT REFERENCES flats(id) ON DELETE CASCADE
);

-- 6. BEDS
CREATE TABLE beds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    
    status VARCHAR(20), -- 'occupied', 'available', 'maintenance'
    blocked_by VARCHAR(100),
    occupant_id INT REFERENCES users(id),
    check_in DATE,
    check_out DATE
);

-- 7. BOOKING REQUESTS
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    city_id INT REFERENCES cities(id),
    status request_status DEFAULT 'pending',
    booking_type booking_type DEFAULT 'individual',
    remarks TEXT,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- 8. TEAM MEMBERS
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES requests(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL
);

-- 9. ASSIGNED ACCOMMODATIONS
CREATE TABLE assigned_accommodations (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES requests(id) ON DELETE CASCADE,
    user_email VARCHAR(100) NOT NULL,
    city_id INT,
    apartment_id INT,
    flat_id INT,
    room_id INT,
    bed_id INT
);

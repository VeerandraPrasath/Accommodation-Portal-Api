-- ENUM TYPES (unchanged)
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE booking_type AS ENUM ('individual', 'team');

-- 1. CITIES
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(100) NOT NULL
);

-- 3. APARTMENTS
CREATE TABLE IF NOT EXISTS apartments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city_id INT REFERENCES cities(id) ON DELETE CASCADE,
    google_map_link TEXT
);

-- 4. FLATS
CREATE TABLE IF NOT EXISTS flats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    apartment_id INT REFERENCES apartments(id) ON DELETE CASCADE,
    is_booked BOOLEAN DEFAULT FALSE
);

-- 5. ROOMS
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
    is_booked BOOLEAN DEFAULT FALSE
);

-- 6. BEDS (Cottages)
CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    status VARCHAR(20), -- 'occupied', 'available', 'maintenance'
    blocked_by VARCHAR(100),
    occupant_id INT REFERENCES users(id),
    check_in DATE,
    check_out DATE,
    is_booked BOOLEAN DEFAULT FALSE
);

-- 7. BOOKING REQUESTS
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    city_id INT REFERENCES cities(id),
    status request_status DEFAULT 'pending',
    booking_type booking_type DEFAULT 'individual',
    remarks TEXT,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    booking_for VARCHAR(100), -- added to track who the booking is for (only for individual)
    processed_at TIMESTAMP
);

-- 8. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES requests(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL
);

-- 9. ASSIGNED ACCOMMODATIONS
CREATE TABLE IF NOT EXISTS assigned_accommodations (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES requests(id) ON DELETE CASCADE,
    user_email VARCHAR(100) NOT NULL,
    city_id INT,
    apartment_id INT,
    flat_id INT,
    room_id INT,
    bed_id INT
);

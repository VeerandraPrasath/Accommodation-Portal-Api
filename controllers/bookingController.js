// controllers/bookingsController.js
import pool from '../db.js';
import dayjs from 'dayjs';


export const getBookingHistory = async (req, res) => {
  const {
    city,
    status,
    role,
    search,
    dateFrom,
    dateTo
  } = req.query;

  try {
    const params = [];
    const conditions = [];

    if (city) {
      conditions.push(`LOWER(c.name) = LOWER($${params.length + 1})`);
      params.push(city);
    }

    if (status) {
      conditions.push(`b.status = $${params.length + 1}`);
      params.push(status.toLowerCase());
    }

    if (role) {
      conditions.push(`LOWER(u.role) = LOWER($${params.length + 1})`);
      params.push(role);
    }

    if (search) {
      conditions.push(`(LOWER(u.name) LIKE LOWER($${params.length + 1}) OR LOWER(u.email) LIKE LOWER($${params.length + 1}))`);
      params.push(`%${search}%`);
    }

    if (dateFrom) {
      conditions.push(`b.start_time >= $${params.length + 1}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`b.end_time <= $${params.length + 1}`);
      params.push(dateTo);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        b.id,
        b.start_time,
        b.end_time,
        b.status,
        b.remarks,
        b.booking_type,
        b.booking_for,
        b.team_members,
        b.updated_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        c.name AS city_name,
        a.name AS apartment_name,
        f.name AS flat_name,
        r.name AS room_name,
        co.name AS cottage_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN cities c ON c.id = (
        SELECT city_id FROM apartments WHERE id = b.apartment_id
      )
      LEFT JOIN apartments a ON a.id = b.apartment_id
      LEFT JOIN flats f ON f.id = b.flat_id
      LEFT JOIN rooms r ON r.id = b.room_id
      LEFT JOIN cottages co ON co.id = b.cottage_id
      ${whereClause}
      ORDER BY b.updated_at DESC
    `;

    const result = await pool.query(query, params);

    const requests = result.rows.map(row => {
      const teamMembers = row.team_members || [];
      const assigned = {
        [row.user_email]: formatAssignment(row)
      };

      teamMembers.forEach(email => {
        assigned[email] = formatAssignment(row);
      });

      return {
        id: row.id,
        timestamp: row.start_time,
        user: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          role: row.user_role
        },
        city: row.city_name,
        dates: {
          from: row.start_time.toISOString().split('T')[0],
          to: row.end_time.toISOString().split('T')[0]
        },
        status: row.status,
        assignedAccommodations: assigned,
        bookingType: row.booking_type,
        teamMembers: teamMembers,
        remarks: row.remarks,
        processedAt: row.updated_at
      };
    });

    res.json({
      success: true,
      requests
    });

  } catch (err) {
    console.error('Booking History Error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// helper to format assignment
function formatAssignment(row) {
  return [
    row.apartment_name,
    row.flat_name,
    row.room_name,
    row.cottage_name
  ].filter(Boolean).join(' > ');
}


export const createBooking = async (req, res) => {
  const {
    user,            // { id, name, email, role }
    city,            // city name
    dates,           // { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
    checkInTime,     // 'HH:mm'
    checkOutTime,    // 'HH:mm'
    bookingType,
    bookingFor,     // 'individual' or 'team'
    remarks = null,
    teamMembers = [] // array of emails (only if bookingType is team)
  } = req.body;

  try {
    // Combine date and time strings manually
    const checkIn = `${dates.from} ${checkInTime}`;     // e.g., '2025-07-20 08:00'
    const checkOut = `${dates.to} ${checkOutTime}`;     // e.g., '2025-07-24 10:00'

    const fromDate = new Date(dates.from);
    const toDate = new Date(dates.to);

    const durationInDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);

    if (durationInDays > 14) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Maximum stay is 14 days.'
      });
    }

    // 1. Fetch city_id
    const cityResult = await pool.query(
      'SELECT id FROM cities WHERE LOWER(name) = LOWER($1)',
      [city]
    );
    if (cityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'City not found.'
      });
    }

    const cityId = cityResult.rows[0].id;

    // 2. Insert into requests
    const insertRequest = await pool.query(
      `INSERT INTO requests (
         user_id, city_id, booking_type, remarks,
         date_from, date_to, check_in, check_out,booking_for
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $8::timestamp,$9)
       RETURNING id`,
      [
        user.id,
        cityId,
        bookingType,
        remarks,
        dates.from,
        dates.to,
        checkIn,
        checkOut,
        bookingFor
      ]
    );

    const requestId = insertRequest.rows[0].id;

    // 3. If team booking, insert members
    if (bookingType === 'team' && teamMembers.length > 0) {
      const memberInsertPromises = teamMembers.map(email =>
        pool.query(
          'INSERT INTO team_members (request_id, email) VALUES ($1, $2)',
          [requestId, email]
        )
      );
      await Promise.all(memberInsertPromises);
    }

    res.json({
      success: true,
      message: 'Booking request submitted successfully.',
      requestId
    });

  } catch (err) {
    console.error('Booking request error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
};

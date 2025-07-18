// controllers/bookingsController.js
import pool from '../db.js';

// controllers/bookingsController.js
import { Parser } from 'json2csv'; // for CSV export

export const exportBookingHistory = async (req, res) => {
  const {
    city,
    status,
    role,
    search,
    dateFrom,
    dateTo
  } = req.body.filters || {};

  try {
    const params = [];
    const conditions = [];

    if (city) {
      conditions.push(`LOWER(ci.name) = LOWER($${params.length + 1})`);
      params.push(city);
    }

    if (status) {
      conditions.push(`r.status = $${params.length + 1}`);
      params.push(status.toLowerCase());
    }

    if (role) {
      conditions.push(`LOWER(u.role) = LOWER($${params.length + 1})`);
      params.push(role.toLowerCase());
    }

    if (search) {
      conditions.push(`(LOWER(u.name) LIKE LOWER($${params.length + 1}) OR LOWER(u.email) LIKE LOWER($${params.length + 1}))`);
      params.push(`%${search}%`);
    }

    if (dateFrom) {
      conditions.push(`r.date_from >= $${params.length + 1}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`r.date_to <= $${params.length + 1}`);
      params.push(dateTo);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        r.id AS request_id,
        r.date_from,
        r.date_to,
        r.status,
        r.booking_type,
        r.remarks,
        r.processed_at,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        ci.name AS city_name,
        a.name AS apartment_name,
        f.name AS flat_name,
        ro.name AS room_name,
        b.name AS bed_name,
        r.timestamp,
        ac.user_email AS assigned_email,
        (
          SELECT ARRAY_AGG(tm.email)
          FROM team_members tm
          WHERE tm.request_id = r.id
        ) AS team_members
      FROM requests r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN cities ci ON ci.id = r.city_id
      LEFT JOIN assigned_accommodations ac ON ac.request_id = r.id AND ac.user_email = u.email
      LEFT JOIN apartments a ON a.id = ac.apartment_id
      LEFT JOIN flats f ON f.id = ac.flat_id
      LEFT JOIN rooms ro ON ro.id = ac.room_id
      LEFT JOIN beds b ON b.id = ac.bed_id
      ${whereClause}
      ORDER BY r.timestamp DESC
    `;

    const result = await pool.query(query, params);

    const rows = result.rows.map(row => ({
      "User Name": row.user_name,
      "User Email": row.user_email,
      "Role": row.user_role,
      "City": row.city_name,
      "Accommodation": formatAssignment({
        apartment_name: row.apartment_name,
        flat_name: row.flat_name,
        room_name: row.room_name,
        bed_name: row.bed_name
      }),
      "Booking Type": row.booking_type,
      "Team Members": (row.team_members || []).join(', '),
      "Start Date": row.date_from?.toISOString().split('T')[0],
      "End Date": row.date_to?.toISOString().split('T')[0],
      "Status": row.status,
      "Remarks": row.remarks,
      "Processed At": row.processed_at?.toISOString() || '',
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    const filename = `booking_history_${Date.now()}.csv`;
    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    return res.send(csv);

  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ success: false, message: 'Failed to export booking history' });
  }
};

// helper to format location string
function formatAssignment(row) {
  return [row.apartment_name, row.flat_name, row.room_name, row.cottage_name]
    .filter(Boolean).join(' > ');
}


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
      conditions.push(`LOWER(ci.name) = LOWER($${params.length + 1})`);
      params.push(city);
    }

    if (status) {
      conditions.push(`r.status = $${params.length + 1}`);
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
      conditions.push(`r.date_from >= $${params.length + 1}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`r.date_to <= $${params.length + 1}`);
      params.push(dateTo);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        r.id,
        r.date_from,
        r.date_to,
        r.status,
        r.remarks,
        r.booking_type,
        r.timestamp,
        r.processed_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        ci.name AS city_name,
        aa.apartment_id,
        a.name AS apartment_name,
        f.name AS flat_name,
        r1.name AS room_name,
        b.name AS bed_name,
        aa.user_email AS assigned_email
      FROM requests r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN cities ci ON ci.id = r.city_id
      LEFT JOIN assigned_accommodations aa ON aa.request_id = r.id
      LEFT JOIN apartments a ON a.id = aa.apartment_id
      LEFT JOIN flats f ON f.id = aa.flat_id
      LEFT JOIN rooms r1 ON r1.id = aa.room_id
      LEFT JOIN beds b ON b.id = aa.bed_id
      ${whereClause}
      ORDER BY r.processed_at DESC NULLS LAST, r.timestamp DESC
    `;

    const result = await pool.query(query, params);

    const requestsMap = {};

    for (const row of result.rows) {
      if (!requestsMap[row.id]) {
        requestsMap[row.id] = {
          id: row.id,
          timestamp: row.timestamp,
          user: {
            id: row.user_id,
            name: row.user_name,
            email: row.user_email,
            role: row.user_role
          },
          city: row.city_name,
          dates: {
            from: row.date_from.toISOString().split('T')[0],
            to: row.date_to.toISOString().split('T')[0]
          },
          status: row.status,
          assignedAccommodations: {},
          bookingType: row.booking_type,
          teamMembers: [],
          remarks: row.remarks,
          processedAt: row.processed_at
        };
      }

      const accommodation = {
        apartment: row.apartment_name,
        flat: row.flat_name,
        room: row.room_name,
        bed: row.bed_name // updated field
      };

      if (row.assigned_email) {
        requestsMap[row.id].assignedAccommodations[row.assigned_email] = accommodation;

        if (
          row.assigned_email !== row.user_email &&
          !requestsMap[row.id].teamMembers.includes(row.assigned_email)
        ) {
          requestsMap[row.id].teamMembers.push(row.assigned_email);
        }
      }
    }

    const requests = Object.values(requestsMap);

    res.json({
      success: true,
      requests
    });

  } catch (err) {
    console.error('Booking History Error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};


export const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        r.id,
        r.date_from AS start_time,
        r.date_to AS end_time,
        r.status,
        r.remarks,
        r.timestamp AS created_at,
        r.processed_at,
        r.city_id,
        aa.apartment_id,
        aa.flat_id,
        aa.room_id,
        NULL AS cottage_id,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'role', u.role
        ) AS user
      FROM requests r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN assigned_accommodations aa ON aa.request_id = r.id
    `;

    const values = [];

    if (status) {
      query += ` WHERE r.status = $1`;
      values.push(status);
    }

    query += ` ORDER BY r.timestamp DESC`;

    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      requests: result.rows
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
};

export const approveRequest = async (req, res) => {
  const requestId = parseInt(req.params.id);
  const {
    apartment_id,
    flat_id,
    room_id,
    cottage_id,
    remarks,
    assigned_by // optional, not used in this example unless you want audit logs
  } = req.body;

  try {
    // 1. Update request status and remarks
    const updateQuery = `
      UPDATE requests
      SET status = 'approved',
          remarks = $1,
          processed_at = NOW()
      WHERE id = $2
      RETURNING id, status, remarks
    `;
    const updateResult = await pool.query(updateQuery, [remarks || null, requestId]);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // 2. Get user email for assignment
    const userResult = await pool.query(`
      SELECT u.email, r.city_id
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [requestId]);

    const { email, city_id } = userResult.rows[0];

    // 3. Insert into assigned_accommodations
    await pool.query(`
      INSERT INTO assigned_accommodations (
        request_id, user_email, city_id,
        apartment_id, flat_id, room_id, bed_id
      ) VALUES ($1, $2, $3, $4, $5, $6, NULL)
    `, [
      requestId,
      email,
      city_id,
      apartment_id || null,
      flat_id || null,
      room_id || null
    ]);

    // 4. Respond with the structured output
    res.status(200).json({
      success: true,
      message: "Request approved.",
      request: {
        id: requestId,
        status: 'approved',
        apartment_id: apartment_id || null,
        flat_id: flat_id || null,
        room_id: room_id || null,
        cottage_id: cottage_id || null, // this is not in your DB, but included in response
        remarks: remarks || null
      }
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      message: "Failed to approve request",
      error: error.message
    });
  }
};

export const rejectRequest = async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { remarks, assigned_by } = req.body; // assigned_by is optional and unused here

  try {
    // Update the request status and remarks
    const result = await pool.query(
      `
      UPDATE requests
      SET status = 'rejected',
          remarks = $1,
          processed_at = NOW()
      WHERE id = $2
      RETURNING id, status, remarks
      `,
      [remarks || null, requestId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const rejectedRequest = result.rows[0];

    res.status(200).json({
      success: true,
      message: 'Request rejected.',
      request: {
        id: rejectedRequest.id,
        status: rejectedRequest.status,
        remarks: rejectedRequest.remarks
      }
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: error.message
    });
  }
};



// helper to format assignment
// function formatAssignment(row) {
//   return [
//     row.apartment_name,
//     row.flat_name,
//     row.room_name,
//     row.cottage_name
//   ].filter(Boolean).join(' > ');
// }

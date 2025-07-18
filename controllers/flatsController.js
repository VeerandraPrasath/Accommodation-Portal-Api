// controllers/flatsController.js
import pool from '../db.js';

export const createFlat = async (req, res) => {
  const { name, apartment_id } = req.body;

  if (!name || !apartment_id) {
    return res.status(400).json({ success: false, message: "name and apartment_id are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO flats (name, apartment_id) VALUES ($1, $2) RETURNING id, name, apartment_id`,
      [name, apartment_id]
    );

    res.status(201).json({
      success: true,
      flat: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating flat:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export const editFlat=async (req, res) => {
  const flatId = req.params.id;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: "Flat name is required" });
  }

  try {
    const result = await pool.query(
      `UPDATE flats SET name = $1 WHERE id = $2 RETURNING id, name, apartment_id`,
      [name, flatId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Flat not found" });
    }

    res.json({
      success: true,
      flat: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating flat:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteFlat= async (req, res) => {
  const flatId = req.params.id;

  try {
    const result = await pool.query(`DELETE FROM flats WHERE id = $1 RETURNING id`, [flatId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Flat not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting flat:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}









//this is not needed for now
export const getFlatByName = async (req, res) => {
  const { flatName } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        f.id AS flat_id,
        f.name AS flat_name,
        f.is_booked AS flat_booked,
        f.role AS flat_blocked_by,
        r.id AS room_id,
        r.name AS room_name,
        r.is_booked AS room_booked,
        r.role AS room_blocked_by,
        c.id AS cottage_id,
        c.name AS cottage_name,
        c.is_booked AS cottage_booked,
        c.role AS cottage_blocked_by,
        c.room_id AS cottage_room_id
      FROM flats f
      LEFT JOIN rooms r ON r.flat_id = f.id
      LEFT JOIN cottages c ON c.room_id = r.id
      WHERE f.name = $1
      ORDER BY r.id, c.id
      `,
      [flatName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flat not found' });
    }

    const flat = result.rows[0];

    const response = {
      id: `FLAT_${flat.flat_name.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`,
      doorNumber: flat.flat_name,
      status: flat.flat_booked ? 'booked' : (flat.flat_blocked_by ? 'partial' : 'available'),
      rooms: []
    };

    const roomMap = new Map();

    for (const row of result.rows) {
      if (row.room_id && !roomMap.has(row.room_id)) {
        const roomItem = {
          id: `room${row.room_id}`,
          name: row.room_name,
          status: row.room_booked ? 'booked' : (row.room_blocked_by ? 'partial' : 'available'),
          bookable: true,
          beds: []
        };
        roomMap.set(row.room_id, roomItem);
        response.rooms.push(roomItem);
      }

      if (row.cottage_id) {
        const bedItem = {
          id: `bed${row.cottage_id}`,
          name: row.cottage_name,
          status: row.cottage_booked ? 'booked' : (row.cottage_blocked_by ? 'partial' : 'available'),
          bookable: true
        };
        roomMap.get(row.cottage_room_id)?.beds.push(bedItem);
      }
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Error fetching flat by name:', err);
    res.status(500).json({ error: 'Failed to fetch flat layout' });
  }
};

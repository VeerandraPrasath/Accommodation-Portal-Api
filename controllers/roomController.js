import pool from '../db.js';

export const createRoom=  async (req, res) => {
  const { name, flat_id, beds } = req.body;

  try {
    // 1. Insert into rooms
    const roomResult = await pool.query(
      'INSERT INTO rooms (name, flat_id) VALUES ($1, $2) RETURNING id',
      [name, flat_id]
    );
    const roomId = roomResult.rows[0].id;

    // 2. Insert 'beds' number of rows into beds table
    const bedInserts = [];
    for (let i = 1; i <= beds; i++) {
      const bedName = `Bed ${i}`;
      bedInserts.push(
        pool.query(
          `INSERT INTO beds (name, room_id, status) VALUES ($1, $2, 'available')`,
          [bedName, roomId]
        )
      );
    }

    await Promise.all(bedInserts);

    // 3. Return response
    res.status(201).json({
      success: true,
      room: {
        id: roomId,
        name,
        flat_id,
        beds
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Error creating room' });
  }
};

export const editRoom=async (req, res) => {
  const roomId = req.params.id;
  const { name, beds } = req.body;

  if (!name || !beds) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const updateQuery = `
      UPDATE rooms
      SET name = $1, beds = $2
      WHERE id = $3
      RETURNING id, name, flat_id, beds
    `;

    const result = await pool.query(updateQuery, [name, beds, roomId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    res.json({ success: true, room: result.rows[0] });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export const deleteRoom=async (req, res) => {
  const roomId = req.params.id;

  try {
    // First delete all cottages/beds related to the room if applicable
    await pool.query("DELETE FROM cottages WHERE room_id = $1", [roomId]);

    // Then delete the room
    const result = await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
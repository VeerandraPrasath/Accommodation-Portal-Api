// controllers/citiesController.js
import pool from '../db.js';
import dayjs from 'dayjs';

export const getAllCities = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cities ORDER BY id');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching cities:', err);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

export const createCity = async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, message: "City name is required." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO cities (name) VALUES ($1) RETURNING id, name",
      [name.trim()]
    );

    res.status(201).json({
      success: true,
      city: result.rows[0]
    });
  } catch (error) {
    console.error("Error inserting city:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const EditCity = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, message: "City name is required." });
  }

  try {
    const result = await pool.query(
      "UPDATE cities SET name = $1 WHERE id = $2 RETURNING id, name",
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "City not found." });
    }

    res.json({ success: true, city: result.rows[0] });
  } catch (error) {
    console.error("Error updating city:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export const deleteCity=async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM cities WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "City not found." });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting city:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}


export const getCityAccommodations = async (req, res) => {
  const cityId = req.params.cityId;

  try {
    const apartmentsRes = await pool.query(`
      SELECT 
        a.id AS apartment_id, 
        a.name AS apartment_name, 
        a.google_map_link,

        f.id AS flat_id, 
        f.name AS flat_name,
        f.is_booked AS flat_booked,

        r.id AS room_id, 
        r.name AS room_name,
        r.is_booked AS room_booked,

        b.id AS bed_id, 
        b.name AS bed_name,
        b.is_booked AS bed_booked

      FROM apartments a
      LEFT JOIN flats f ON f.apartment_id = a.id
      LEFT JOIN rooms r ON r.flat_id = f.id
      LEFT JOIN beds b ON b.room_id = r.id
      WHERE a.city_id = $1
      ORDER BY a.id, f.id, r.id, b.id
    `, [cityId]);

    const rows = apartmentsRes.rows;
    const apartmentsMap = {};

    for (const row of rows) {
      const aptId = row.apartment_id;
      if (!apartmentsMap[aptId]) {
        apartmentsMap[aptId] = {
          id: aptId,
          name: row.apartment_name,
          google_map_link: row.google_map_link,
          flats: []
        };
      }

      const apartment = apartmentsMap[aptId];

      let flat = apartment.flats.find(f => f.id === row.flat_id);
      if (!flat && row.flat_id) {
        flat = {
          id: row.flat_id,
          name: row.flat_name,
          is_booked: row.flat_booked ?? false,
          rooms: []
        };
        apartment.flats.push(flat);
      }

      if (flat && row.room_id) {
        let room = flat.rooms.find(r => r.id === row.room_id);
        if (!room) {
          room = {
            id: row.room_id,
            name: row.room_name,
            is_booked: row.room_booked ?? false,
            cottages: []
          };
          flat.rooms.push(room);
        }

        if (row.bed_id) {
          room.cottages.push({
            id: row.bed_id,
            name: row.bed_name,
            is_booked: row.bed_booked ?? false
          });
        }
      }
    }

    res.json({
      success: true,
      apartments: Object.values(apartmentsMap)
    });
  } catch (error) {
    console.error('Error fetching accommodations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



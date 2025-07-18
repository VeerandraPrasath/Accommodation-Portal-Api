// controllers/apartmentsController.js
import pool from '../db.js';

export const createApartment = async (req, res) => {
  try {
    let { name, cityId, googleMapLink } = req.body;

    console.log("Received cityId:", cityId); // Debug log

    // Ensure cityId is an integer
    cityId = parseInt(cityId);
    if (isNaN(cityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cityId"
      });
    }

    const result = await pool.query(
      'INSERT INTO apartments (name, city_id, google_map_link) VALUES ($1, $2, $3) RETURNING *',
      [name, cityId, googleMapLink]
    );

    res.status(201).json({
      success: true,
      apartment: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating apartment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const editApartment=async (req, res) => {
  const apartmentId = req.params.id;
  const { name, googleMapLink } = req.body;

  try {
    const result = await pool.query(
      `UPDATE apartments
       SET name = $1, googleMapLink = $2
       WHERE id = $3
       RETURNING id, name, googleMapLink`,
      [name, googleMapLink, apartmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Apartment not found" });
    }

    res.json({
      success: true,
      apartment: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating apartment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// ➕ Create apartment
// export const createApartment = async (req, res) => {
//   const { name, location, city_id } = req.body;

//   if (!name || !location || !city_id) {
//     return res.status(400).json({ error: 'Name, location, and city_id are required' });
//   }

//   try {
//     const result = await pool.query(
//       'INSERT INTO apartments (name, location, city_id) VALUES ($1, $2, $3) RETURNING *',
//       [name, location, city_id]
//     );
//     res.status(201).json(result.rows[0]);
//   } catch (err) {
//     console.error('Error creating apartment:', err);
//     res.status(500).json({ error: 'Failed to create apartment' });
//   }
// };

// 🔍 Get apartment by ID
export const getApartmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM apartments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching apartment by ID:', err);
    res.status(500).json({ error: 'Failed to fetch apartment' });
  }
};

// 🔍 Get apartment by name (case-insensitive)
export const getApartmentByName = async (req, res) => {
  const { name } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM apartments WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching apartment by name:', err);
    res.status(500).json({ error: 'Failed to fetch apartment' });
  }
};

// 📥 Get all apartments
export const getAllApartments = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM apartments ORDER BY id');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching apartments:', err);
    res.status(500).json({ error: 'Failed to fetch apartments' });
  }
};

export const deleteApartment=async (req, res) => {
  const apartmentId = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM apartments WHERE id = $1 RETURNING id`,
      [apartmentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Apartment not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting apartment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

// ✏️ Edit apartment
// export const editApartment = async (req, res) => {
//   const { id } = req.params;
//   const { name, location, city_id } = req.body;

//   try {
//     const result = await pool.query(
//       'UPDATE apartments SET name = $1, location = $2, city_id = $3 WHERE id = $4 RETURNING *',
//       [name, location, city_id, id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Apartment not found' });
//     }

//     res.status(200).json(result.rows[0]);
//   } catch (err) {
//     console.error('Error updating apartment:', err);
//     res.status(500).json({ error: 'Failed to update apartment' });
//   }
// };


//this is not needed for now 
export const getApartmentsByCityIdGrouped = async (req, res) => {
  const { cityId } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        c.name AS city,
        a.id AS apartment_id,
        a.name AS apartment_name,
        CONCAT('https://maps.google.com/?q=', REPLACE(a.name, ' ', '+'), '+', REPLACE(c.name, ' ', '+')) AS google_maps_link,
        f.id AS flat_id,
        f.name AS door_number,
        f.is_booked,
        f.role AS blocked_by,
        (
          SELECT COUNT(*) FROM rooms r WHERE r.flat_id = f.id
        ) AS room_count,
        (
          SELECT COUNT(*) FROM cottages cot
          JOIN rooms r ON cot.room_id = r.id
          WHERE r.flat_id = f.id
        ) AS bed_count,
        cot.id AS cottage_id,
        cot.name AS cottage_name,
        cot.is_booked AS cottage_booked,
        cot.role AS cottage_blocked_by
      FROM cities c
      JOIN apartments a ON a.city_id = c.id
      JOIN flats f ON f.apartment_id = a.id
      LEFT JOIN rooms r ON r.flat_id = f.id
      LEFT JOIN cottages cot ON cot.room_id = r.id
      WHERE c.id = $1
      ORDER BY c.name, a.name, f.name;
    `, [cityId]);

    const grouped = {};

    for (const row of result.rows) {
      const cityKey = row.city.toLowerCase();

      if (!grouped[cityKey]) {
        grouped[cityKey] = [];
      }

      let apartment = grouped[cityKey].find(
        ap => ap.id === `APT_${row.apartment_id.toString().padStart(3, '0')}`
      );

      if (!apartment) {
        apartment = {
          id: `APT_${row.apartment_id.toString().padStart(3, '0')}`,
          name: row.apartment_name,
          city: row.city,
          googleMapsLink: row.google_maps_link,
          flats: []
        };
        grouped[cityKey].push(apartment);
      }

      let flat = apartment.flats.find(fl => fl.doorNumber === row.door_number);
      if (!flat) {
        let status = 'available';
        if (row.is_booked) status = 'booked';
        else if (row.blocked_by) status = 'partial';

        flat = {
          id: `FLAT_${row.door_number.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`,
          doorNumber: row.door_number,
          status: status,
          ...(row.blocked_by ? { blockedBy: row.blocked_by } : {}),
          roomCount: parseInt(row.room_count),
          bedCount: parseInt(row.bed_count),
          cottages: []
        };
        apartment.flats.push(flat);
      }

      if (row.cottage_id) {
        let cottageStatus = 'available';
        if (row.cottage_booked) cottageStatus = 'booked';
        else if (row.cottage_blocked_by) cottageStatus = 'partial';

        flat.cottages.push({
          id: `BED_${row.cottage_id}`,
          name: row.cottage_name,
          status: cottageStatus,
          ...(row.cottage_blocked_by ? { blockedBy: row.cottage_blocked_by } : {})
        });
      }
    }

    res.status(200).json(grouped);
  } catch (err) {
    console.error('Error fetching apartments by city ID:', err);
    res.status(500).json({ error: 'Failed to fetch apartment data' });
  }
};




import pool from '../db.js';
export const getApartmentsByCityIdGrouped = async (req, res) => {
     try {
    const client = await pool.connect();

    const [cities, apartments, flats, rooms, beds] = await Promise.all([
      client.query("SELECT id, name FROM cities"),
      client.query("SELECT id, name, city_id, google_map_link FROM apartments"),
      client.query("SELECT id, name, apartment_id FROM flats"),
      client.query("SELECT id, name, flat_id, beds FROM rooms"),
      client.query("SELECT id, name, room_id, is_booked AS status, blocked_by FROM beds")
    ]);

    client.release();

    res.json({
      success: true,
      hierarchy: {
        cities: cities.rows,
        apartments: apartments.rows,
        flats: flats.rows,
        rooms: rooms.rows,
        beds: beds.rows
      }
    });
  } catch (err) {
    console.error("Error fetching hierarchy:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


export const getHierarchy = async (req, res) => {
  try {
    const citiesResult = await pool.query('SELECT id, name FROM cities');
    const apartmentsResult = await pool.query('SELECT id, name, city_id, google_map_link FROM apartments');
    const flatsResult = await pool.query('SELECT id, name, apartment_id FROM flats');
    
    // For rooms, we count number of beds per room
    const roomsResult = await pool.query(`
      SELECT r.id, r.name, r.flat_id, COUNT(b.id) AS beds
      FROM rooms r
      LEFT JOIN beds b ON r.id = b.room_id
      GROUP BY r.id
    `);

    const bedsResult = await pool.query(`
      SELECT id, name, room_id, status, blocked_by
      FROM beds
    `);

    res.json({
      success: true,
      hierarchy: {
        cities: citiesResult.rows,
        apartments: apartmentsResult.rows.map(a => ({
          id: a.id,
          name: a.name,
          city_id: a.city_id,
          googleMapLink: a.google_map_link
        })),
        flats: flatsResult.rows.map(f => ({
          id: f.id,
          name: f.name,
          apartment_id: f.apartment_id
        })),
        rooms: roomsResult.rows.map(r => ({
          id: r.id,
          name: r.name,
          flat_id: r.flat_id,
          beds: parseInt(r.beds)
        })),
        beds: bedsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

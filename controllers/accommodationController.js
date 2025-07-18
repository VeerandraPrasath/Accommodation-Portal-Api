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
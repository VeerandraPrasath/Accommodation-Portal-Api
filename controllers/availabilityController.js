import pool from '../db.js';
import dayjs from 'dayjs';



export const getAvailabilityByCityId = async (req, res) => {
  const cityId = req.params.id;
  try {
    // Reset outdated bookings
    await pool.query(`
      UPDATE flats SET isbooked = false WHERE upto < NOW();
      UPDATE rooms SET isbooked = false WHERE upto < NOW();
      UPDATE cottages SET isbooked = false WHERE upto < NOW();
    `);

    const cityResult = await pool.query('SELECT * FROM cities WHERE id = $1', [cityId]);
    if (cityResult.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    const cityName = cityResult.rows[0].name;

    const apartmentsRes = await pool.query(
      `SELECT * FROM apartments WHERE city_id = $1`,
      [cityId]
    );
    const apartments = apartmentsRes.rows;

    const availableApartments = [];
    const flatsByApartment = {};
    const roomsByApartmentFlat = {};
    const cottagesByApartmentFlatRoom = {};

    for (const apt of apartments) {
      const flatsRes = await pool.query(
        'SELECT * FROM flats WHERE apartment_id = $1 AND (isbooked = false OR upto < NOW())',
        [apt.id]
      );
      const flats = flatsRes.rows;
      if (flats.length === 0) continue; // Apartment is unavailable if no available flats

      let apartmentHasAvailableUnit = false;
      const flatList = [];
      const roomMap = {};
      const cottageMap = {};

      for (const flat of flats) {
        const flatId = flat.id;
        flatList.push({ id: flatId, doorNumber: flat.name, status: 'available' });

        const roomsRes = await pool.query(
          'SELECT * FROM rooms WHERE flat_id = $1 AND (isbooked = false OR upto < NOW())',
          [flatId]
        );
        const rooms = roomsRes.rows;

        roomMap[flatId] = [];
        cottageMap[flatId] = {};

        for (const room of rooms) {
          roomMap[flatId].push({ id: room.id, name: room.name, status: 'available' });

          const cottagesRes = await pool.query(
            'SELECT * FROM cottages WHERE room_id = $1 AND (isbooked = false OR upto < NOW())',
            [room.id]
          );
          const cottages = cottagesRes.rows;

          cottageMap[flatId][room.id] = cottages.map(c => ({
            id: c.id,
            name: c.name,
            status: 'available'
          }));

          if (cottages.length > 0) apartmentHasAvailableUnit = true;
        }
        if (rooms.length > 0) apartmentHasAvailableUnit = true;
      }

      if (apartmentHasAvailableUnit) {
        availableApartments.push({
          id: apt.id,
          name: apt.name,
          city: cityName,
          googleMapsLink: `https://maps.google.com/?q=${encodeURIComponent(apt.name + ' ' + cityName)}`
        });
        flatsByApartment[apt.id] = flatList;
        roomsByApartmentFlat[apt.id] = roomMap;
        cottagesByApartmentFlatRoom[apt.id] = cottageMap;
      }
    }

    res.json({
      [cityName.toLowerCase()]: {
        apartments: availableApartments,
        flats: flatsByApartment,
        rooms: roomsByApartmentFlat,
        cottages: cottagesByApartmentFlatRoom
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
import pool from '../db.js';
// const ExcelJS = require('exceljs');
import ExcelJS from 'exceljs';

export const getOccupancy = async (req, res) => {
  const { city, apartment, is_booked } = req.query;

  const query = `
    SELECT 
      a.name AS apartment,
      f.name AS flat,
      r.name AS room,
      b.name AS bed,
      u.name AS occupant,
      b.check_in AS "checkIn",
      b.check_out AS "checkOut",
      b.is_booked,
      u.role
    FROM beds b
    JOIN rooms r ON b.room_id = r.id
    JOIN flats f ON r.flat_id = f.id
    JOIN apartments a ON f.apartment_id = a.id
    JOIN cities c ON a.city_id = c.id
    LEFT JOIN users u ON b.occupant_id = u.id
    WHERE 
      ($1::text IS NULL OR c.name = $1)
      AND ($2::text IS NULL OR a.name = $2)
      AND ($3::boolean IS NULL OR b.is_booked = $3)
    ORDER BY a.name, f.name, r.name, b.name
  `;

  try {
    const { rows } = await pool.query(query, [
      city || null,
      apartment || null,
      is_booked !== undefined ? is_booked === 'true' : null
    ]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};


export const exportOccupancy= async (req, res) => {
  const { city, apartment, status } = req.body.filters || {};

  const query = `
    SELECT 
      a.name AS apartment,
      f.name AS flat,
      r.name AS room,
      b.name AS bed,
      u.name AS occupant,
      b.check_in AS "checkIn",
      b.check_out AS "checkOut",
      b.status,
      u.role
    FROM beds b
    JOIN rooms r ON b.room_id = r.id
    JOIN flats f ON r.flat_id = f.id
    JOIN apartments a ON f.apartment_id = a.id
    JOIN cities c ON a.city_id = c.id
    LEFT JOIN users u ON b.occupant_id = u.id
    WHERE 
      ($1::text IS NULL OR c.name = $1)
      AND ($2::text IS NULL OR a.name = $2)
      AND ($3::text IS NULL OR b.status = $3)
    ORDER BY a.name, f.name, r.name, b.name
  `;

  try {
    const { rows } = await pool.query(query, [
      city || null,
      apartment || null,
      status || null,
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Occupancy');

    worksheet.columns = [
      { header: 'Apartment', key: 'apartment' },
      { header: 'Flat', key: 'flat' },
      { header: 'Room', key: 'room' },
      { header: 'Bed', key: 'bed' },
      { header: 'Occupant', key: 'occupant' },
      { header: 'Check In', key: 'checkIn' },
      { header: 'Check Out', key: 'checkOut' },
      { header: 'Status', key: 'status' },
      { header: 'Role', key: 'role' },
    ];

    rows.forEach(row => worksheet.addRow(row));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="occupancy_export.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to export Excel file' });
  }
}
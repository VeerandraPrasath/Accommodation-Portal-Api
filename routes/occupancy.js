// routes/cities.js
import express from 'express';
import { getOccupancy,exportOccupancy } from '../controllers/occupancyController.js';

const router = express.Router();

router.get('/', getOccupancy);
router.post('/export',exportOccupancy);
export default router;
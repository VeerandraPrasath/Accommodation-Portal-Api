import express from 'express';
import { getApartmentsByCityIdGrouped  } from '../controllers/accommodationController.js';

const router = express.Router();

router.get('/', getApartmentsByCityIdGrouped);

export default router;
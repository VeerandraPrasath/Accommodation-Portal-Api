import express from 'express';
import { getApartmentsByCityIdGrouped,getHierarchy  } from '../controllers/accommodationController.js';

const router = express.Router();

router.get('/', getApartmentsByCityIdGrouped);
router.get('/hierarchy',getHierarchy);

export default router;
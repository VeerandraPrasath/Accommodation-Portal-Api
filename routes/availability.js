import express from 'express';
import {
getAvailabilityByCityId
} from '../controllers/availabilityController.js';

const router = express.Router();


router.get('/city/:id', getAvailabilityByCityId);
export default router;
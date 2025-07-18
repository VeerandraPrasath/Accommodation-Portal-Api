// routes/flats.js
import express from 'express';
import { createFlat,getFlatByName,editFlat,deleteFlat } from '../controllers/flatsController.js';

const router = express.Router();

router.post('/', createFlat);
router.put('/:id',editFlat)
router.delete('/:id',deleteFlat)

router.get('/name/:flatName', getFlatByName);

export default router;

// routes/cities.js
import express from 'express';
import { createBed,editBed,deleteBed  } from '../controllers/bedController.js';

const router = express.Router();

router.post('/', createBed);
router.put('/:id',editBed);
router.delete('/:id',deleteBed);
export default router;
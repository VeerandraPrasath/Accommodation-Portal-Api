// routes/flats.js
import express from 'express';
import { createRoom,editRoom,deleteRoom } from '../controllers/roomController.js';

const router = express.Router();

router.post('/', createRoom);
router.put('/:id',editRoom)
router.delete('/:id',deleteRoom)


export default router;

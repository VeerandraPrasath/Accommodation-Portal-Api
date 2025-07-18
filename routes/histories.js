// routes/cities.js
import express from 'express';
import { getBookingHistory,exportBookingHistory,getAllRequests,approveRequest,rejectRequest  } from '../controllers/historyController.js';

const router = express.Router();

router.get('/',getAllRequests);
router.get('/history', getBookingHistory);
router.post('/history/export',exportBookingHistory);
router.post('/:id/approve',approveRequest);
router.post('/:id/reject',rejectRequest);

export default router;
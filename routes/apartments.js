// routes/apartments.js
import express from 'express';
import {
  createApartment,
  getApartmentById,
  getApartmentByName,
  getAllApartments,
  editApartment,
  deleteApartment,
  getApartmentsByCityIdGrouped
} from '../controllers/apartmentsController.js';

const router = express.Router();

router.post('/', createApartment);
router.put('/:id', editApartment);
router.delete('/:id',deleteApartment)

router.get('/', getAllApartments);
router.get('/id/:id', getApartmentById);
router.get('/name/:name', getApartmentByName);
router.get('/city/:cityId/grouped',getApartmentsByCityIdGrouped)

export default router;

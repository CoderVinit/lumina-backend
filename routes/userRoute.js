import express from 'express';
import { CreateAddressController, DeleteAddressController, GetAddressesController, GetUserOrdersController, UpdateAddressController } from '../controller/userController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/address', verifyToken, CreateAddressController);
router.get('/address', verifyToken, GetAddressesController);
router.put('/address/:id', verifyToken, UpdateAddressController);
router.delete('/address/:id', verifyToken, DeleteAddressController);
router.get('/orders', verifyToken, GetUserOrdersController);

export default router;
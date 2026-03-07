import express from 'express';
import { ToggleWishlistController, GetWishlistController, RemoveWishlistController } from '../controller/wishlistController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/toggle', verifyToken, ToggleWishlistController);
router.get('/', verifyToken, GetWishlistController);
router.delete('/:productId', verifyToken, RemoveWishlistController);

export default router;

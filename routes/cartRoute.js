import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
    GetCartController,
    AddToCartController,
    UpdateCartItemController,
    RemoveFromCartController,
    ClearCartController,
} from '../controller/cartController.js';

const router = express.Router();

router.get('/', verifyToken, GetCartController);           // fetch cart
router.post('/items', verifyToken, AddToCartController);          // add item
router.put('/items/:productId', verifyToken, UpdateCartItemController);   // update quantity
router.delete('/items/:productId', verifyToken, RemoveFromCartController); // remove item
router.delete('/', verifyToken, ClearCartController);     // clear cart

export default router;

import express from 'express';
import { GetPublicCategoriesController } from '../controller/categoryController.js';

const router = express.Router();

router.get('/', GetPublicCategoriesController);

export default router;

import { Router } from 'express';
import {
  getSales,
  getTopProducts,
  getOverview,
  getSalesByCategory,
  getCustomerLifetimeValue,
  getRecentActivities
} from '../controllers/analytics.controller';

const router = Router();

router.get('/sales', getSales);
router.get('/top-products', getTopProducts);
router.get('/overview', getOverview);
router.get('/sales-by-category', getSalesByCategory);

router.get('/recent', getRecentActivities);
router.get('/customer-lifetime-value', getCustomerLifetimeValue);

export default router;

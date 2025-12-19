import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { getNotifications, markAsRead, clearNotifications, getGroupInviteNotifications } from '../controllers/notification.controller.js';

const router = express.Router();

router.route('/').get(isAuthenticated, getNotifications);
router.route('/:id/read').post(isAuthenticated, markAsRead);
router.route('/clear').delete(isAuthenticated, clearNotifications);
router.route('/group-invites').get(isAuthenticated, getGroupInviteNotifications);

export default router;

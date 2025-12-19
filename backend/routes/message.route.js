import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { getMessage, sendMessage, sendGroupMessage, getGroupMessages } from "../controllers/message.controller.js";

const router = express.Router();

router.route('/send/:id').post(isAuthenticated, sendMessage);
router.route('/all/:id').get(isAuthenticated, getMessage);
router.route('/group/:groupId/send').post(isAuthenticated, sendGroupMessage);
router.route('/group/:groupId/all').get(isAuthenticated, getGroupMessages);
 
export default router;
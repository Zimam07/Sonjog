import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { createGroup, myGroups, joinGroup, leaveGroup, updateGroup, sendGroupInvite, getGroupInvites, acceptInvite, rejectInvite, removeMember } from '../controllers/group.controller.js';

const router = express.Router();

router.post('/', isAuthenticated, createGroup);
router.get('/mine', isAuthenticated, myGroups);
router.post('/:id/join', isAuthenticated, joinGroup);
router.post('/:id/leave', isAuthenticated, leaveGroup);
router.put('/:id', isAuthenticated, updateGroup);
router.post('/invite/send', isAuthenticated, sendGroupInvite);
router.get('/invites/pending', isAuthenticated, getGroupInvites);
router.post('/invite/:inviteId/accept', isAuthenticated, acceptInvite);
router.post('/invite/:inviteId/reject', isAuthenticated, rejectInvite);
router.post('/member/remove', isAuthenticated, removeMember);

export default router;

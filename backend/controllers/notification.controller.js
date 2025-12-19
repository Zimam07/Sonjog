import { Notification } from '../models/notification.model.js';
import { GroupInvite } from '../models/groupInvite.model.js';

export const getNotifications = async (req, res) => {
    try {
        const userId = req.id;
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('fromUser', 'username profilePicture')
            .populate('post', 'caption image');

        return res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getGroupInviteNotifications = async (req, res) => {
    try {
        const userId = req.id;
        const invites = await GroupInvite.find({ invitedUser: userId, status: 'pending' })
            .populate('groupId', 'name')
            .populate('invitedBy', 'username profilePicture')
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, invites });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const userId = req.id;
        const notifId = req.params.id;
        const notif = await Notification.findOne({ _id: notifId, user: userId });
        if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
        notif.read = true;
        await notif.save();
        return res.status(200).json({ success: true, message: 'Marked as read' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const clearNotifications = async (req, res) => {
    try {
        const userId = req.id;
        await Notification.deleteMany({ user: userId });
        return res.status(200).json({ success: true, message: 'Notifications cleared' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

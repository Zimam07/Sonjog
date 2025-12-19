import { Group } from '../models/group.model.js';
import { GroupInvite } from '../models/groupInvite.model.js';
import { getReceiverSocketId, io } from '../socket/socket.js';

export const createGroup = async (req, res) => {
  try {
    const ownerId = req.id;
    const { name, isPrivate = true, description = '', members = [] } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Group name required' });
    
    // Create initial members array with owner and selected members
    const initialMembers = [ownerId];
    if (Array.isArray(members) && members.length > 0) {
      // Add unique member IDs (excluding owner if already in the list)
      members.forEach(memberId => {
        if (memberId && String(memberId) !== String(ownerId) && !initialMembers.includes(memberId)) {
          initialMembers.push(memberId);
        }
      });
    }
    
    const group = await Group.create({ 
      name: name.trim(), 
      owner: ownerId, 
      isPrivate, 
      description,
      members: initialMembers
    });
    return res.status(201).json({ success: true, group });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const myGroups = async (req, res) => {
  try {
    const userId = req.id;
    const groups = await Group.find({ members: userId })
      .populate('members', 'username profilePicture')
      .populate('owner', 'username profilePicture')
      .sort({ updatedAt: -1 });
    return res.json({ success: true, groups });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.isPrivate && String(group.owner) !== String(userId)) {
      // TODO: invite/approval flow; for MVP allow join
    }
    if (!group.members.find(m => String(m) === String(userId))) {
      group.members.push(userId);
      await group.save();
    }
    return res.json({ success: true, group });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    group.members = group.members.filter(m => String(m) !== String(userId));
    await group.save();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (String(group.owner) !== String(userId)) return res.status(403).json({ success: false, message: 'Only owner can update' });
    const { name, description, isPrivate } = req.body || {};
    if (name) group.name = String(name).trim();
    if (typeof description === 'string') group.description = description;
    if (typeof isPrivate === 'boolean') group.isPrivate = isPrivate;
    await group.save();
    return res.json({ success: true, group });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendGroupInvite = async (req, res) => {
  try {
    const userId = req.id;
    const { groupId, invitedUserId } = req.body || {};
    if (!groupId || !invitedUserId) return res.status(400).json({ success: false, message: 'Group ID and invited user ID required' });
    
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (String(group.owner) !== String(userId)) return res.status(403).json({ success: false, message: 'Only owner can invite' });
    
    // Check if already invited or member
    const existingInvite = await GroupInvite.findOne({ groupId, invitedUser: invitedUserId });
    if (existingInvite) return res.status(400).json({ success: false, message: 'User already invited' });
    if (group.members.some(m => String(m) === String(invitedUserId))) return res.status(400).json({ success: false, message: 'User already member' });
    
    const invite = await GroupInvite.create({ groupId, invitedBy: userId, invitedUser: invitedUserId, status: 'pending' });
    
    // Emit socket notification to invited user
    const invitedUserSocketId = getReceiverSocketId(invitedUserId);
    if (invitedUserSocketId && io) {
      io.to(invitedUserSocketId).emit('groupInviteNotification', {
        inviteId: invite._id,
        groupName: group.name,
        invitedBy: userId,
      });
    }
    
    return res.status(201).json({ success: true, invite });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getGroupInvites = async (req, res) => {
  try {
    const userId = req.id;
    const invites = await GroupInvite.find({ invitedUser: userId, status: 'pending' }).populate('groupId').populate('invitedBy');
    return res.json({ success: true, invites });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const userId = req.id;
    const { inviteId } = req.params;
    
    const invite = await GroupInvite.findById(inviteId);
    if (!invite) return res.status(404).json({ success: false, message: 'Invite not found' });
    if (String(invite.invitedUser) !== String(userId)) return res.status(403).json({ success: false, message: 'Not invited' });
    if (invite.status !== 'pending') return res.status(400).json({ success: false, message: 'Invite already ' + invite.status });
    
    const group = await Group.findById(invite.groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    
    // Add user to group members
    if (!group.members.some(m => String(m) === String(userId))) {
      group.members.push(userId);
      await group.save();
    }
    
    invite.status = 'accepted';
    await invite.save();
    return res.json({ success: true, invite, group });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectInvite = async (req, res) => {
  try {
    const userId = req.id;
    const { inviteId } = req.params;
    
    const invite = await GroupInvite.findById(inviteId);
    if (!invite) return res.status(404).json({ success: false, message: 'Invite not found' });
    if (String(invite.invitedUser) !== String(userId)) return res.status(403).json({ success: false, message: 'Not invited' });
    if (invite.status !== 'pending') return res.status(400).json({ success: false, message: 'Invite already ' + invite.status });
    
    invite.status = 'rejected';
    await invite.save();
    return res.json({ success: true, invite });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const userId = req.id;
    const { groupId, memberId } = req.body || {};
    if (!groupId || !memberId) return res.status(400).json({ success: false, message: 'Group ID and member ID required' });
    
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (String(group.owner) !== String(userId)) return res.status(403).json({ success: false, message: 'Only owner can remove members' });
    if (String(group.owner) === String(memberId)) return res.status(400).json({ success: false, message: 'Cannot remove owner' });
    
    group.members = group.members.filter(m => String(m) !== String(memberId));
    await group.save();
    return res.json({ success: true, group });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

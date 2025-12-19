import { Server } from "socket.io";

let io = null;
const onlineUsers = new Map();

export const initSocket = (server, corsOrigins = null) => {
    if (io) return io; // already initialized

    io = new Server(server, {
        cors: {
            // allow any origin in development; Socket.IO will echo origin when true
            origin: true,
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        // register userId with socket id
        socket.on("register", (userId) => {
            try {
                onlineUsers.set(userId, socket.id);
            } catch (e) {
                // ignore
            }
        });

        // join group room: socket.on('joinGroup', { groupId })
        socket.on('joinGroup', ({ groupId }) => {
            try {
                socket.join(`group-${groupId}`);
            } catch (e) {
                console.error('Join group error:', e);
            }
        });

        // leave group room
        socket.on('leaveGroup', ({ groupId }) => {
            try {
                socket.leave(`group-${groupId}`);
            } catch (e) {
                console.error('Leave group error:', e);
            }
        });

        // typing indicator: forward typing events to recipient
        socket.on('typing', ({ toUserId, fromUserId }) => {
            try {
                const receiverSocketId = onlineUsers.get(toUserId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('typing', { fromUserId });
                }
            } catch (e) {
                // ignore
            }
        });

        socket.on('stopTyping', ({ toUserId, fromUserId }) => {
            try {
                const receiverSocketId = onlineUsers.get(toUserId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('stopTyping', { fromUserId });
                }
            } catch (e) {
                // ignore
            }
        });

        socket.on("disconnect", () => {
            // remove any entries that point to this socket
            for (const [userId, sid] of onlineUsers.entries()) {
                if (sid === socket.id) onlineUsers.delete(userId);
            }
        });
    });

    return io;
};

export const getReceiverSocketId = (userId) => {
    return onlineUsers.get(userId);
};

export { io };

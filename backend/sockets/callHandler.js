const User = require('../models/User');
const Call = require('../models/Call');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userName})`);

    // ─── Register User (mark online) ─────────────────────────────
    socket.on('register-user', async () => {
      try {
        await User.findByIdAndUpdate(socket.userId, {
          online: true,
          socketId: socket.id,
          inCall: false,
        });

        // Broadcast updated online users list to everyone
        const onlineUsers = await User.find({ online: true }).select(
          '_id name email online inCall socketId'
        );
        io.emit('online-users', onlineUsers);

        console.log(`✅ ${socket.userName} registered (online)`);
      } catch (error) {
        console.error('register-user error:', error);
      }
    });

    // ─── Call User ───────────────────────────────────────────────
    socket.on('call-user', async ({ targetUserId }) => {
      try {
        const caller = await User.findById(socket.userId);
        const target = await User.findById(targetUserId);

        if (!target || !target.online) {
          socket.emit('call-error', { message: 'User is offline' });
          return;
        }

        if (target.inCall) {
          socket.emit('call-error', { message: 'User is already in a call' });
          return;
        }

        if (caller.inCall) {
          socket.emit('call-error', {
            message: 'You are already in a call',
          });
          return;
        }

        // Mark both users as in-call
        await User.findByIdAndUpdate(socket.userId, { inCall: true });
        await User.findByIdAndUpdate(targetUserId, { inCall: true });

        // Create call log
        const call = await Call.create({
          caller: socket.userId,
          receiver: targetUserId,
          status: 'initiated',
        });

        // Send incoming call to target
        io.to(target.socketId).emit('incoming-call', {
          callId: call._id.toString(),
          callerId: socket.userId,
          callerName: socket.userName,
          callerSocketId: socket.id,
        });

        // Confirm to caller that the call is ringing
        socket.emit('call-ringing', {
          callId: call._id.toString(),
          targetUserId: targetUserId,
          targetName: target.name,
        });

        // Broadcast updated users (now both show inCall)
        const onlineUsers = await User.find({ online: true }).select(
          '_id name email online inCall socketId'
        );
        io.emit('online-users', onlineUsers);

        console.log(`📞 ${socket.userName} calling ${target.name}`);
      } catch (error) {
        console.error('call-user error:', error);
        socket.emit('call-error', { message: 'Failed to initiate call' });
      }
    });

    // ─── Accept Call ─────────────────────────────────────────────
    socket.on('accept-call', async ({ callId, callerSocketId }) => {
      try {
        await Call.findByIdAndUpdate(callId, { status: 'active' });

        // Tell the caller that the call was answered
        io.to(callerSocketId).emit('call-answered', {
          callId,
          receiverSocketId: socket.id,
          receiverName: socket.userName,
        });

        console.log(`✅ ${socket.userName} accepted call ${callId}`);
      } catch (error) {
        console.error('accept-call error:', error);
      }
    });

    // ─── Reject Call ─────────────────────────────────────────────
    socket.on('reject-call', async ({ callId, callerSocketId }) => {
      try {
        await Call.findByIdAndUpdate(callId, {
          status: 'rejected',
          endedAt: new Date(),
        });

        // Reset both users' call state
        const call = await Call.findById(callId);
        if (call) {
          await User.findByIdAndUpdate(call.caller, { inCall: false });
          await User.findByIdAndUpdate(call.receiver, { inCall: false });
        }

        io.to(callerSocketId).emit('call-rejected', {
          callId,
          rejectedBy: socket.userName,
        });

        // Broadcast updated users
        const onlineUsers = await User.find({ online: true }).select(
          '_id name email online inCall socketId'
        );
        io.emit('online-users', onlineUsers);

        console.log(`❌ ${socket.userName} rejected call ${callId}`);
      } catch (error) {
        console.error('reject-call error:', error);
      }
    });

    // ─── WebRTC Offer ────────────────────────────────────────────
    socket.on('offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('offer', {
        offer,
        callerSocketId: socket.id,
      });
    });

    // ─── WebRTC Answer ───────────────────────────────────────────
    socket.on('answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('answer', {
        answer,
        responderSocketId: socket.id,
      });
    });

    // ─── ICE Candidate ──────────────────────────────────────────
    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        from: socket.id,
      });
    });

    // ─── End Call ────────────────────────────────────────────────
    socket.on('end-call', async ({ targetSocketId, callId }) => {
      try {
        if (callId) {
          await Call.findByIdAndUpdate(callId, {
            status: 'ended',
            endedAt: new Date(),
          });
        }

        // Reset both users
        await User.findByIdAndUpdate(socket.userId, { inCall: false });

        // Find the other user by socketId and reset
        const otherUser = await User.findOne({ socketId: targetSocketId });
        if (otherUser) {
          await User.findByIdAndUpdate(otherUser._id, { inCall: false });
        }

        // Notify the other user
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-ended', {
            endedBy: socket.userName,
          });
        }

        // Broadcast updated users
        const onlineUsers = await User.find({ online: true }).select(
          '_id name email online inCall socketId'
        );
        io.emit('online-users', onlineUsers);

        console.log(`🔚 ${socket.userName} ended call`);
      } catch (error) {
        console.error('end-call error:', error);
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        const user = await User.findById(socket.userId);
        if (!user) return;

        // If user was in a call, end it
        if (user.inCall) {
          // Find the active call
          const activeCall = await Call.findOne({
            $or: [
              { caller: socket.userId, status: { $in: ['initiated', 'active'] } },
              { receiver: socket.userId, status: { $in: ['initiated', 'active'] } },
            ],
          });

          if (activeCall) {
            activeCall.status = 'ended';
            activeCall.endedAt = new Date();
            await activeCall.save();

            // Determine the other user
            const otherUserId =
              activeCall.caller.toString() === socket.userId
                ? activeCall.receiver
                : activeCall.caller;

            const otherUser = await User.findById(otherUserId);
            if (otherUser) {
              await User.findByIdAndUpdate(otherUserId, { inCall: false });
              if (otherUser.socketId) {
                io.to(otherUser.socketId).emit('call-ended', {
                  endedBy: socket.userName,
                  reason: 'disconnect',
                });
              }
            }
          }
        }

        // Mark user offline
        await User.findByIdAndUpdate(socket.userId, {
          online: false,
          socketId: null,
          inCall: false,
        });

        // Broadcast updated online users
        const onlineUsers = await User.find({ online: true }).select(
          '_id name email online inCall socketId'
        );
        io.emit('online-users', onlineUsers);

        console.log(`🔌 ${socket.userName} disconnected`);
      } catch (error) {
        console.error('disconnect error:', error);
      }
    });
  });
};

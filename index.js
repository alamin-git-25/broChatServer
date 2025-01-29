

import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

const rooms = {}; // Store rooms and messages

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', ({ room, username }) => {
        socket.join(room);
        console.log(`User ${username} joined Room ${room}`);

        if (rooms[room]) {
            rooms[room].forEach((msg) => {
                socket.emit('message', msg);
            });
        }

        socket.to(room).emit('user_joined', `${username} joined the chat`);
    });

    socket.on('message', ({ room, message, sender, repliedMessage }) => {
        console.log(`Message from ${sender} in Room ${room}: ${message}`);


        if (!rooms[room]) {
            rooms[room] = [];
        }

        const newMessage = {
            sender,
            message,
            time: new Date().toLocaleTimeString(),
            repliedMessage,
        };

        rooms[room].push(newMessage);

        socket.to(room).emit('message', newMessage);
    });

    socket.on('leave-room', ({ room, username }) => {
        console.log(`User ${username} left Room ${room}`);
        socket.leave(room);
        socket.to(room).emit('user_left', `${username} left the chat`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

httpServer.listen(port, () => {
    console.log(`Server is running on http://${hostname}:${port}`);
});


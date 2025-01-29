import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);
const mongoURI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB connection error:', err));

// Define the Message schema for MongoDB
const messageSchema = new mongoose.Schema({
    room: { type: String, required: true },
    message: { type: String, required: true },
    sender: { type: String, required: true },
    time: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: '*', // Allow all origins (you can restrict this in production)
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', ({ room, username }) => {
        socket.join(room);
        console.log(`User ${username} joined Room ${room}`);
        socket.to(room).emit('user_joined', `${username} joined the chat`);
    });

    socket.on('message', async ({ room, message, sender }) => {
        console.log(`Message from ${sender} in Room ${room}: ${message}`);

        // Save message to MongoDB
        const newMessage = new Message({
            room,
            message,
            sender,
        });
        await newMessage.save();

        socket.to(room).emit('message', { sender, message });
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

// Start the server
httpServer.listen(port, () => {
    console.log(`Server is running on http://${hostname}:${port}`);
});

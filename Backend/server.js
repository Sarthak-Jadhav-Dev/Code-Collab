const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const AIService = require('./aiService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 4000;

// Debug environment variables
console.log('Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
console.log('AI_API_KEY:', process.env.AI_API_KEY ? '*** EXISTS ***' : '*** MISSING ***');

// MongoDB Connection
console.log('Attempting to connect to MongoDB...');
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.log('❌ MongoDB connection error:', err));
} else {
  console.log('❌ MONGODB_URI is not defined in environment variables');
}

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for debugging
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());

// Routes
const fileExplorerRoutes = require('./routes/fileExplorer');
// We'll pass io to the routes after it's initialized
let fileExplorerRouter;
app.use('/api/explorer', (req, res, next) => {
  if (fileExplorerRouter) {
    fileExplorerRouter(req, res, next);
  } else {
    res.status(503).json({ error: 'Server initializing, please try again' });
  }
});

// Models
const User = require('./models/User');

// Auth & OTP Flow
// Auth & OTP Flow
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Explicit host
  port: 465,                // Explicit port (SSL)
  secure: true,             // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter connection
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Nodemailer connection error:", error);
  } else {
    console.log("✅ Nodemailer server is ready to take our messages");
  }
});

global.signupOtps = {};

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered." });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    if (!global.signupOtps) global.signupOtps = {};
    global.signupOtps[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email',
      text: `Your OTP code is ${otp}`
    });
    res.json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error('Error sending signup OTP:', error);
    res.status(500).json({ error: "Failed to send OTP. Please check your email configuration." });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;
    if (!email || !otp || !name || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const record = global.signupOtps[email];
    if (!record) {
      return res.status(400).json({ error: "OTP not found or expired. Please request a new one." });
    }

    if (Date.now() > record.expires) {
      delete global.signupOtps[email];
      return res.status(400).json({ error: "OTP expired." });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    // OTP is valid, create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verified: true
    });

    await newUser.save();

    // Clear OTP
    delete global.signupOtps[email];

    res.json({ success: true, message: "Email verified and account created successfully." });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: "Verification failed." });
  }
});

// Add a CORS middleware for specific routes
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Handle OPTIONS requests for login routes
app.options('/api/auth/login-send-otp', cors(corsOptions));
app.options('/api/auth/login', cors(corsOptions));

// Add login OTP route
app.post('/api/auth/login-send-otp', cors(corsOptions), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found." });
    if (!user.verified) return res.status(400).json({ error: "Email not verified." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    if (!global.signupOtps) global.signupOtps = {};
    global.signupOtps[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Login OTP',
      text: `Your login OTP code is ${otp}`
    });
    res.json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error('Error sending login OTP:', error);
    res.status(500).json({ error: "Failed to send OTP. Please check your email configuration." });
  }
});

app.post('/api/auth/login', cors(corsOptions), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found." });
    if (!user.verified) return res.status(400).json({ error: "Email not verified." });
    if (!user.password) return res.status(400).json({ error: "No password set for this user." });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid password." });
    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, name: user.name });
  } catch (error) {
    console.error('Error during password login:', error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// Code Execution Endpoint
app.post('/api/run', async (req, res) => {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, error: 'No code provided' });
  }

  console.log(`🎯 Code execution request for language: ${language}`);

  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Create a temporary directory for code execution
  const tempDir = path.join(os.tmpdir(), `code-exec-${Date.now()}`);

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let command = '';
    let filename = '';

    switch (language) {
      case 'javascript':
        filename = path.join(tempDir, 'code.js');
        fs.writeFileSync(filename, code);
        command = `node "${filename}"`;
        break;

      case 'python':
        filename = path.join(tempDir, 'code.py');
        fs.writeFileSync(filename, code);
        command = `python "${filename}"`;
        break;

      case 'java':
        // Extract class name from code
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Main';
        filename = path.join(tempDir, `${className}.java`);
        fs.writeFileSync(filename, code);
        command = `cd "${tempDir}" && javac "${className}.java" && java ${className}`;
        break;

      case 'cpp':
      case 'c':
        filename = path.join(tempDir, 'code.cpp');
        const outputFile = path.join(tempDir, 'code.exe');
        fs.writeFileSync(filename, code);
        command = `g++ "${filename}" -o "${outputFile}" && "${outputFile}"`;
        break;

      case 'go':
        filename = path.join(tempDir, 'code.go');
        fs.writeFileSync(filename, code);
        command = `go run "${filename}"`;
        break;

      default:
        // For unsupported languages, try to run as JavaScript
        filename = path.join(tempDir, 'code.js');
        fs.writeFileSync(filename, code);
        command = `node "${filename}"`;
    }

    console.log(`   Executing command: ${command}`);

    // Execute the code with a timeout
    exec(command, { timeout: 10000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      // Clean up temp files
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }

      if (error) {
        console.error(`   Execution error: ${error.message}`);
        if (stderr) {
          console.error(`   stderr: ${stderr}`);
        }

        // Return the actual error output to the user
        const errorOutput = stderr || error.message || 'An error occurred during execution';

        return res.json({
          success: false,
          error: errorOutput,  // Send the actual error message
          output: errorOutput   // Also include in output for display
        });
      }

      const output = stdout || stderr || 'Code executed successfully (no output)';
      console.log(`   ✅ Execution successful`);
      console.log(`   Output length: ${output.length} characters`);

      res.json({
        success: true,
        output: output
      });
    });

  } catch (error) {
    console.error('   ❌ Code execution error:', error);

    // Clean up on error
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    res.json({
      success: false,
      error: 'Failed to execute code',
      output: error.message
    });
  }
});

// Test Route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Start the Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// Socket.IO for user tracking
console.log('🔌 Initializing Socket.IO server...');
const io = require('socket.io')(server, {
  cors: {
    origin: '*', // Allow all origins for debugging
    methods: ["GET", "POST"],
    credentials: true
  }
});
console.log('✅ Socket.IO server initialized successfully');

// Initialize file explorer routes with Socket.IO instance
fileExplorerRouter = fileExplorerRoutes(io);
console.log('✅ File explorer routes initialized with Socket.IO');

let connectedUsers = 0;
const aiService = new AIService();
const rooms = new Map(); // Track room users

io.on('connection', (socket) => {
  connectedUsers++;
  console.log(`🔌 Socket.IO: New connection established`);
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Total connected users: ${connectedUsers}`);
  console.log(`   Transport: ${socket.conn.transport.name}`);

  // Log when transport upgrades
  socket.conn.on('upgrade', () => {
    console.log(`⬆️  Socket ${socket.id} upgraded to ${socket.conn.transport.name}`);
  });

  // Join room handler
  socket.on('joinRoom', ({ roomId, userName }) => {
    console.log(`📥 joinRoom event received:`);
    console.log(`   Room ID: ${roomId}`);
    console.log(`   User Name: ${userName}`);
    console.log(`   Socket ID: ${socket.id}`);

    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    // Track users in room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
      console.log(`   Created new room: ${roomId}`);
    }
    rooms.get(roomId).add(userName);

    // Notify room of user list
    const roomUsers = Array.from(rooms.get(roomId));
    console.log(`   Room users: ${roomUsers.join(', ')}`);

    io.to(roomId).emit('userList', roomUsers);
    io.to(roomId).emit('userJoined', { user: userName });

    console.log(`✅ ${userName} successfully joined room ${roomId}`);
    console.log(`   Emitted: userList, userJoined`);
  });

  // NEW: Voice Communication Handlers
  // NEW: Voice Communication Handlers
  socket.on("joinVoice", ({ roomId }) => {
    socket.join(roomId);

    // valid tracking of voice users
    if (!global.voiceRooms) global.voiceRooms = new Map();
    if (!global.voiceRooms.has(roomId)) global.voiceRooms.set(roomId, new Set());

    // Store user info
    const voiceUser = { id: socket.id, name: socket.userName || 'Anonymous' };
    global.voiceRooms.get(roomId).add(voiceUser);

    // Notify others
    socket.to(roomId).emit("voice-user-joined", { userId: socket.id, userName: socket.userName || 'Anonymous' });

    // Send list of current voice users to the joiner
    const usersInVoice = Array.from(global.voiceRooms.get(roomId));
    socket.emit("voice-connected-users", usersInVoice);

    console.log(`🎤 User ${socket.id} joined voice in room ${roomId}`);
  });

  socket.on("leaveVoice", ({ roomId }) => {
    socket.leave(roomId);

    // Remove from tracking
    if (global.voiceRooms && global.voiceRooms.has(roomId)) {
      const room = global.voiceRooms.get(roomId);
      // We have to find the object with matching ID since they are objects
      for (const user of room) {
        if (user.id === socket.id) {
          room.delete(user);
          break;
        }
      }
      if (room.size === 0) global.voiceRooms.delete(roomId);
    }

    // Notify others
    socket.to(roomId).emit("voice-user-left", { userId: socket.id });
    console.log(`🔇 User ${socket.id} left voice in room ${roomId}`);
  });

  socket.on("voice-offer", ({ to, offer }) => {
    // Forward the offer to the target user
    io.to(to).emit("voice-offer", { from: socket.id, offer });
  });

  socket.on("voice-answer", ({ to, answer }) => {
    // Forward the answer to the target user
    io.to(to).emit("voice-answer", { from: socket.id, answer });
  });

  socket.on("voice-candidate", ({ to, candidate }) => {
    // Forward the ICE candidate to the target user
    io.to(to).emit("voice-candidate", { from: socket.id, candidate });
  });

  // AI Chat Handler
  socket.on('askAI', async (data) => {
    const { roomId, prompt, selectedCode, filePath, language } = data;

    console.log(`🤖 AI request from room ${roomId}: ${prompt.substring(0, 50)}...`);

    // Emit thinking state
    io.to(roomId).emit('aiThinking', { roomId });

    try {
      // Get recent chat history for context
      const recentChat = [];

      const context = {
        files: [{ name: filePath, content: selectedCode }],
        language: language || 'javascript',
        recentChat: recentChat,
        activeFile: filePath
      };

      // Add the user's question to recent chat for context
      if (rooms.has(roomId)) {
        const roomUsers = Array.from(rooms.get(roomId));
        if (roomUsers.length > 0) {
          context.recentChat.push({ user: roomUsers[0], msg: prompt });
        }
      }

      const result = await aiService.askAI(roomId, prompt, context);

      console.log(`✅ AI responded successfully to room ${roomId}`);

      // Emit response to room
      io.to(roomId).emit('aiResponse', {
        success: result.success,
        message: result.message,
        roomId
      });
    } catch (error) {
      console.error('❌ AI Error:', error);
      io.to(roomId).emit('aiResponse', {
        success: false,
        message: 'AI service is temporarily busy. Please wait a moment and try again.',
        roomId
      });
    }
  });

  // Chat message handler
  socket.on('chatMessage', (data) => {
    console.log(`💬 Chat message in room ${data.roomId}: ${data.user}: ${data.msg.substring(0, 50)}...`);
    io.to(data.roomId).emit('chatMessage', data);
  });

  // Code change handler
  socket.on('codeChange', (data) => {
    console.log(`📝 Code change in room ${data.roomId}, file: ${data.fileName}`);
    socket.to(data.roomId).emit('codeChange', data);
  });

  // Language change handler
  socket.on('languageChange', (data) => {
    io.to(data.roomId).emit('languageChange', data);
  });

  socket.on('disconnect', () => {
    connectedUsers--;
    console.log(`👋 Socket disconnected:`);
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   User: ${socket.userName || 'Unknown'}`);
    console.log(`   Room: ${socket.roomId || 'None'}`);
    console.log(`   Total users: ${connectedUsers}`);

    // Notify others that this user has left voice and clean up tracking
    if (socket.roomId) {
      if (global.voiceRooms && global.voiceRooms.has(socket.roomId)) {
        const room = global.voiceRooms.get(socket.roomId);
        for (const user of room) {
          if (user.id === socket.id) {
            room.delete(user);
            break;
          }
        }
        if (room.size === 0) global.voiceRooms.delete(socket.roomId);
      }
      socket.to(socket.roomId).emit("voice-user-left", { userId: socket.id });
    }

    // Remove from room tracking
    if (socket.roomId && socket.userName) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.delete(socket.userName);
        if (room.size === 0) {
          rooms.delete(socket.roomId);
          console.log(`   Room ${socket.roomId} is now empty and removed`);
        } else {
          // Update user list for remaining users
          const roomUsers = Array.from(room);
          io.to(socket.roomId).emit('userList', roomUsers);
          console.log(`   Updated user list for room ${socket.roomId}: ${roomUsers.join(', ')}`);
        }
      }
    }
  });
});
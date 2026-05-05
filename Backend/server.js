const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const AIService = require('./aiService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 4000;

console.log('Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
console.log('AI_API_KEY:', process.env.AI_API_KEY ? '*** EXISTS ***' : '*** MISSING ***');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '*** EXISTS ***' : '*** MISSING ***');
console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || '*** MISSING ***');

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
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());

const fileExplorerRoutes = require('./routes/fileExplorer');
let fileExplorerRouter;
app.use('/api/explorer', (req, res, next) => {
  if (fileExplorerRouter) {
    fileExplorerRouter(req, res, next);
  } else {
    res.status(503).json({ error: 'Server initializing, please try again' });
  }
});

const User = require('./models/User');


let resend;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log("Resend API key is configured");
} else {
  console.log("RESEND_API_KEY is not defined in environment variables");
  console.log("Email functionality will be disabled");
}

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

    if (!resend) {
      return res.status(500).json({ error: "Email service is not configured. Please set RESEND_API_KEY." });
    }

    console.log(`📧 Sending OTP to ${email} using Resend...`);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [email],
      subject: 'Verify your email',
      text: `Your OTP code is ${otp}`
    });
    
    console.log('Resend response:', result);
    res.json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error('Error sending signup OTP:', error);
    console.error('Error details:', error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to send OTP. Please check your email configuration.",
      details: error.response?.data?.message || error.message
    });
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verified: true
    });

    await newUser.save();

    delete global.signupOtps[email];

    res.json({ success: true, message: "Email verified and account created successfully." });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: "Verification failed." });
  }
});

const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.options('/api/auth/login-send-otp', cors(corsOptions));
app.options('/api/auth/login', cors(corsOptions));

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

    if (!resend) {
      return res.status(500).json({ error: "Email service is not configured. Please set RESEND_API_KEY." });
    }

    console.log(`📧 Sending login OTP to ${email} using Resend...`);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [email],
      subject: 'Login OTP',
      text: `Your login OTP code is ${otp}`
    });
    
    console.log('Resend login OTP response:', result);
    res.json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error('Error sending login OTP:', error);
    console.error('Error details:', error.response?.data || error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: "Failed to send OTP. Please check your email configuration.",
      details: error.response?.data?.message || error.message
    });
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

app.post('/api/auth/login-otp', cors(corsOptions), async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found." });

    const record = global.signupOtps?.[email];
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

    delete global.signupOtps[email];

    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, name: user.name });
  } catch (error) {
    console.error('Error during OTP login:', error);
    res.status(500).json({ error: "An unexpected error occurred during OTP verification." });
  }
});

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

  const tempDir = path.join(os.tmpdir(), `code-exec-${Date.now()}`);

  try {
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
        filename = path.join(tempDir, 'code.js');
        fs.writeFileSync(filename, code);
        command = `node "${filename}"`;
    }

    console.log(`   Executing command: ${command}`);

    exec(command, { timeout: 10000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
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

        const errorOutput = stderr || error.message || 'An error occurred during execution';

        return res.json({
          success: false,
          error: errorOutput,  
          output: errorOutput   
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

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// ============ KEEP-ALIVE ENDPOINT ============
app.get("/keep-alive", (req, res) => {
  console.log("⏰ Keep-alive ping received at", new Date().toLocaleTimeString());
  res.json({ status: "alive", timestamp: new Date(), message: "Server is still running!" });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

console.log('Initializing Socket.IO server...');
const io = require('socket.io')(server, {
  cors: {
    origin: '*', 
    methods: ["GET", "POST"],
    credentials: true
  }
});
console.log('Socket.IO server initialized successfully');

// Initialize file explorer routes with Socket.IO instance
fileExplorerRouter = fileExplorerRoutes(io);
console.log('File explorer routes initialized with Socket.IO');

// ============ RENDER KEEP-ALIVE CRON JOB ============
// This prevents the server from going to sleep on Render.com (free tier)
// Runs every 10 minutes to keep the server active
const keepAliveCron = cron.schedule('*/10 * * * *', async () => {
  try {
    const currentTime = new Date().toLocaleTimeString();
    console.log(`🔄 [CRON] Keep-alive task running at ${currentTime}`);
    
    // Make a request to the keep-alive endpoint
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`http://localhost:${PORT}/keep-alive`);
    const data = await response.json();
    
    console.log(`✅ [CRON] Keep-alive successful:`, data.message);
  } catch (error) {
    console.error(`❌ [CRON] Keep-alive failed:`, error.message);
  }
});

console.log('✅ Keep-alive cron job initialized (runs every 10 minutes)');

let connectedUsers = 0;
const aiService = new AIService();
const rooms = new Map();

io.on('connection', (socket) => {
  connectedUsers++;
  console.log(`Socket.IO: New connection established`);
  console.log(`Socket ID: ${socket.id}`);
  console.log(`Total connected users: ${connectedUsers}`);
  console.log(`Transport: ${socket.conn.transport.name}`);

  socket.conn.on('upgrade', () => {
    console.log(`⬆️  Socket ${socket.id} upgraded to ${socket.conn.transport.name}`);
  });


  socket.on('joinRoom', ({ roomId, userName }) => {
    console.log(`joinRoom event received:`);
    console.log(`Room ID: ${roomId}`);
    console.log(`User Name: ${userName}`);
    console.log(`Socket ID: ${socket.id}`);

    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
      console.log(`   Created new room: ${roomId}`);
    }
    rooms.get(roomId).add(userName);

    const roomUsers = Array.from(rooms.get(roomId));
    console.log(`   Room users: ${roomUsers.join(', ')}`);

    io.to(roomId).emit('userList', roomUsers);
    io.to(roomId).emit('userJoined', { user: userName });

    console.log(`✅ ${userName} successfully joined room ${roomId}`);
    console.log(`   Emitted: userList, userJoined`);
  });

  socket.on("joinVoice", ({ roomId }) => {
    socket.join(roomId);

    if (!global.voiceRooms) global.voiceRooms = new Map();
    if (!global.voiceRooms.has(roomId)) global.voiceRooms.set(roomId, new Set());

    const voiceUser = { id: socket.id, name: socket.userName || 'Anonymous' };
    global.voiceRooms.get(roomId).add(voiceUser);

    socket.to(roomId).emit("voice-user-joined", { userId: socket.id, userName: socket.userName || 'Anonymous' });

    const usersInVoice = Array.from(global.voiceRooms.get(roomId));
    socket.emit("voice-connected-users", usersInVoice);

    console.log(`🎤 User ${socket.id} joined voice in room ${roomId}`);
  });

  socket.on("leaveVoice", ({ roomId }) => {
    socket.leave(roomId);

    if (global.voiceRooms && global.voiceRooms.has(roomId)) {
      const room = global.voiceRooms.get(roomId);
      for (const user of room) {
        if (user.id === socket.id) {
          room.delete(user);
          break;
        }
      }
      if (room.size === 0) global.voiceRooms.delete(roomId);
    }

    socket.to(roomId).emit("voice-user-left", { userId: socket.id });
    console.log(` User ${socket.id} left voice in room ${roomId}`);
  });

  socket.on("voice-offer", ({ to, offer }) => {
    io.to(to).emit("voice-offer", { from: socket.id, offer });
  });

  socket.on("voice-answer", ({ to, answer }) => {
    io.to(to).emit("voice-answer", { from: socket.id, answer });
  });

  socket.on("voice-candidate", ({ to, candidate }) => {
    io.to(to).emit("voice-candidate", { from: socket.id, candidate });
  });

  socket.on('askAI', async (data) => {
    const { roomId, prompt, selectedCode, filePath, language } = data;

    console.log(`🤖 AI request from room ${roomId}: ${prompt.substring(0, 50)}...`);

    io.to(roomId).emit('aiThinking', { roomId });

    try {
      const recentChat = [];

      const context = {
        files: [{ name: filePath, content: selectedCode }],
        language: language || 'javascript',
        recentChat: recentChat,
        activeFile: filePath
      };

      if (rooms.has(roomId)) {
        const roomUsers = Array.from(rooms.get(roomId));
        if (roomUsers.length > 0) {
          context.recentChat.push({ user: roomUsers[0], msg: prompt });
        }
      }

      const result = await aiService.askAI(roomId, prompt, context);

      console.log(`✅ AI responded successfully to room ${roomId}`);

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

  socket.on('chatMessage', (data) => {
    console.log(`💬 Chat message in room ${data.roomId}: ${data.user}: ${data.msg.substring(0, 50)}...`);
    io.to(data.roomId).emit('chatMessage', data);
  });

  socket.on('codeChange', (data) => {
    console.log(`📝 Code change in room ${data.roomId}, file: ${data.fileName}`);
    socket.to(data.roomId).emit('codeChange', data);
  });

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

    if (socket.roomId && socket.userName) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.delete(socket.userName);
        if (room.size === 0) {
          rooms.delete(socket.roomId);
          console.log(`   Room ${socket.roomId} is now empty and removed`);
        } else {
          const roomUsers = Array.from(room);
          io.to(socket.roomId).emit('userList', roomUsers);
          console.log(`   Updated user list for room ${socket.roomId}: ${roomUsers.join(', ')}`);
        }
      }
    }
  });
});
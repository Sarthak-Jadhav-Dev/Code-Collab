# 🚀 LiveCode - Real-Time Collaborative Code Editor

<div align="center">

![LiveCode Banner](https://img.shields.io/badge/LiveCode-Collaborative%20Coding-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

**A powerful, real-time collaborative code editor with AI assistance, built for teams who code together.**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Demo](#-demo)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🎯 About

**LiveCode** is a modern, feature-rich collaborative code editor that enables multiple developers to write, edit, and debug code together in real-time. Built with cutting-edge technologies, it provides seamless synchronization, AI-powered assistance, and an intuitive interface that makes pair programming and team collaboration effortless.

### Why LiveCode?

- **🔄 Real-Time Sync**: See changes instantly as your teammates type
- **🤖 AI Assistant**: Get intelligent code suggestions and debugging help
- **💬 Built-in Chat**: Communicate without leaving your editor
- **📁 File Management**: Create, edit, and organize project files collaboratively
- **🎨 Modern UI**: Clean, responsive interface inspired by VS Code
- **🔒 Secure**: JWT authentication and encrypted connections

---

## ✨ Features

### 🌐 Real-Time Collaboration
- **Live Code Synchronization**: Changes appear instantly for all users in the room
- **Cursor Tracking**: See where your teammates are editing
- **User Presence**: Know who's online and active in your session
- **Room-based Sessions**: Create or join coding rooms with unique IDs

### 💻 Code Editor
- **Syntax Highlighting**: Support for JavaScript, Python, Java, C++, Go, and more
- **Auto-completion**: Intelligent code suggestions
- **Multi-file Support**: Work with multiple files simultaneously
- **File Explorer**: Intuitive file and folder management
- **Code Execution**: Run code directly in the browser

### 🤖 AI-Powered Features
- **AI Code Assistant**: Get help with debugging, code review, and suggestions
- **Context-Aware**: AI understands your project structure and current file
- **Multiple AI Providers**: Support for Google Gemini and OpenAI
- **Smart Responses**: Formatted code blocks with syntax highlighting

### 💬 Communication
- **Group Chat**: WhatsApp-style chat interface for team communication
- **AI Chat**: Dedicated channel for AI assistance
- **Real-time Messaging**: Instant message delivery
- **User Identification**: See who sent each message

### 🔐 Authentication & Security
- **Email/Password Login**: Secure authentication system
- **OTP Verification**: Email-based OTP for signup and password recovery
- **JWT Tokens**: Secure session management
- **Password Encryption**: Bcrypt hashing for password security

### 📁 File Management
- **Create/Delete Files**: Full CRUD operations on files and folders
- **File Upload**: Upload existing projects
- **Auto-save**: Automatic saving of changes
- **Project Persistence**: All files stored in MongoDB

---

## 🎬 Demo

### Screenshots

#### Home Page
![Home Page](https://via.placeholder.com/800x400?text=Home+Page+Screenshot)

#### Collaborative Editor
![Editor](https://via.placeholder.com/800x400?text=Editor+Screenshot)

#### AI Assistant
![AI Chat](https://via.placeholder.com/800x400?text=AI+Chat+Screenshot)

### Live Demo
🔗 [Try LiveCode Now](https://your-demo-link.com) *(Coming Soon)*

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Socket.IO Client** - Real-time communication
- **CodeMirror** - Code editor component
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Icons** - Icon library
- **React Toastify** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **Socket.IO** - WebSocket server
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Google Generative AI** - AI integration
- **Multer** - File uploads

### DevOps & Tools
- **Git** - Version control
- **npm/pnpm** - Package management
- **dotenv** - Environment configuration

---

## 📦 Installation

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **pnpm**
- **MongoDB Atlas** account (or local MongoDB)
- **Git**

### Step 1: Clone the Repository

```bash
git clone https://github.com/Sarthak-Jadhav-Dev/EDIProject.git
cd EDIProject
```

### Step 2: Install Dependencies

#### Backend
```bash
cd Backend
npm install
# or
pnpm install
```

#### Frontend
```bash
cd ../Frontend
npm install
# or
pnpm install
```

### Step 3: Configure Environment Variables

#### Backend `.env`
Create a `.env` file in the `Backend` directory:

```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.0-flash-exp
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
JWT_SECRET=your_jwt_secret_key
```

#### Frontend `.env`
Create a `.env` file in the `Frontend` directory:

```env
VITE_BACKEND_URL=http://localhost:4000
```

### Step 4: Start the Application

#### Start Backend Server
```bash
cd Backend
npm start
```

The backend will run on `http://localhost:4000`

#### Start Frontend Development Server
```bash
cd Frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

---

## 🚀 Usage

### Creating a Room

1. **Sign Up/Login**: Create an account or login with existing credentials
2. **Create Room**: Click "Create Room" to generate a unique room ID
3. **Share Room ID**: Share the room ID with your teammates
4. **Start Coding**: Begin collaborative coding!

### Joining a Room

1. **Login**: Sign in to your account
2. **Join Room**: Enter the room ID shared by your teammate
3. **Collaborate**: Start coding together in real-time

### Using AI Assistant

1. **Open AI Chat**: Click the AI chat tab in the right panel
2. **Ask Questions**: Type your coding question or request
3. **Get Responses**: Receive AI-powered suggestions and solutions

### File Management

- **Create File**: Click the "+" icon in the file explorer
- **Create Folder**: Click the folder icon
- **Delete**: Right-click on file/folder and select delete
- **Upload**: Click upload to import existing projects

---

## 🔑 Environment Variables

### Backend Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PORT` | Server port | Yes | `4000` |
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb+srv://...` |
| `AI_PROVIDER` | AI service provider | Yes | `gemini` or `openai` |
| `AI_API_KEY` | API key for AI service | Yes | `AIza...` |
| `AI_MODEL` | AI model to use | No | `gemini-2.0-flash-exp` |
| `AI_MAX_TOKENS` | Max tokens for AI response | No | `2000` |
| `AI_TEMPERATURE` | AI creativity level (0-1) | No | `0.7` |
| `EMAIL_USER` | Gmail address for OTP | Yes | `your@gmail.com` |
| `EMAIL_PASS` | Gmail app password | Yes | `xxxx xxxx xxxx xxxx` |
| `JWT_SECRET` | Secret key for JWT | Yes | `your-secret-key` |

### Frontend Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_BACKEND_URL` | Backend API URL | Yes | `http://localhost:4000` |

---

## 📁 Project Structure

```
EDIProject/
├── Backend/
│   ├── models/              # MongoDB schemas
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Code.js
│   ├── routes/              # API routes
│   │   └── fileExplorer.js
│   ├── uploads/             # User uploaded files
│   ├── aiService.js         # AI integration service
│   ├── server.js            # Main server file
│   ├── package.json
│   └── .env.example
│
├── Frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── FileExplorer.jsx
│   │   │   └── ...
│   │   ├── pages/           # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── CreateJoinRoom.jsx
│   │   ├── CollaborativeEditor.jsx  # Main editor
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/send-otp`
Send OTP for signup verification
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/verify-otp`
Verify OTP and create account
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "name": "John Doe",
  "password": "password123"
}
```

#### POST `/api/auth/login`
Login with email and password
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### File Explorer Endpoints

#### GET `/api/explorer/project/:roomId`
Get project structure for a room

#### POST `/api/explorer/create-item`
Create a new file or folder
```json
{
  "roomId": "ABC123",
  "path": "/",
  "name": "newfile.js",
  "type": "file"
}
```

#### POST `/api/explorer/delete-item`
Delete a file or folder

#### POST `/api/explorer/rename-item`
Rename a file or folder

#### POST `/api/explorer/save-file`
Save file content

### Code Execution

#### POST `/api/run`
Execute code
```json
{
  "code": "console.log('Hello World')",
  "language": "javascript"
}
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### How to Contribute

1. **Fork the Repository**
   ```bash
   git clone https://github.com/Sarthak-Jadhav-Dev/EDIProject.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```

3. **Commit Your Changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```

4. **Push to the Branch**
   ```bash
   git push origin feature/AmazingFeature
   ```

5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

- **Sarthak Jadhav** - *Lead Developer* - [@Sarthak-Jadhav-Dev](https://github.com/Sarthak-Jadhav-Dev)

---

## 📧 Contact

For questions, suggestions, or support:

- **Email**: thinkfi77@gmail.com
- **GitHub**: [@Sarthak-Jadhav-Dev](https://github.com/Sarthak-Jadhav-Dev)
- **Project Link**: [https://github.com/Sarthak-Jadhav-Dev/EDIProject](https://github.com/Sarthak-Jadhav-Dev/EDIProject)

---

## 🙏 Acknowledgments

- [Socket.IO](https://socket.io/) - Real-time communication
- [CodeMirror](https://codemirror.net/) - Code editor component
- [Google Gemini](https://ai.google.dev/) - AI integration
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database hosting
- [Vite](https://vitejs.dev/) - Frontend tooling

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by [Sarthak Jadhav](https://github.com/Sarthak-Jadhav-Dev)

</div>

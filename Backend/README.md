# Live Code Editor with AI Teammate 🤖

A collaborative real-time code editor designed for technical interviews and team coding sessions, featuring an AI teammate that helps with code review, explanations, and problem-solving.

## ✨ Features

### 🚀 Core Collaboration
- **Real-time code editing** with multiple users
- **Live cursor tracking** and selection sharing
- **Multi-language support** (JavaScript, Python, C++, Java, Go, and 40+ more)
- **File management** with tabs, create, rename, delete
- **Chat system** for team communication
- **Session persistence** - save and load coding sessions

### 🤖 AI Teammate Integration
- **Smart code assistance** - ask questions, get explanations, receive suggestions
- **Context-aware responses** - AI understands your current code and project structure
- **Multiple interaction methods**:
  - Chat commands: `@AI` or `/ai` followed by your question
  - Right-click context menu in the editor
  - Dedicated "Ask AI" button
- **Code analysis** - get improvement suggestions, bug identification, and optimization tips
- **Learning support** - explanations tailored to your skill level

### 🛠️ Development Tools
- **Code execution** via Judge0 API (supports 40+ programming languages)
- **Syntax highlighting** for popular languages
- **File operations** - copy, download, share room links
- **Cross-platform** - works on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MongoDB instance (local or cloud)
- OpenAI API key (for AI features)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd live-code-editor-main

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
MONGODB_URI=mongodb://localhost:27017/live-editor
AI_API_KEY=your_openai_api_key_here
CLIENT_ORIGIN=http://localhost:3000
PORT=3001
```

### 3. Start the Application
```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000

## 🤖 Using the AI Teammate

### Chat Commands
- **`@AI How do I implement a binary search?`** - Ask for algorithm help
- **`/ai Can you review this code for bugs?`** - Get code review
- **`@AI Explain this function`** - Get code explanations

### Right-Click Menu
- **Ask AI about selection** - Get help with specific code
- **Ask AI for help** - General assistance with current file
- **Copy selection** - Quick copy of selected text

### AI Capabilities
- **Code Review**: Identify bugs, suggest improvements, optimize performance
- **Problem Solving**: Break down complex problems, suggest algorithms
- **Learning**: Explain concepts, provide examples, teach best practices
- **Project Guidance**: Suggest structure, dependencies, next steps

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Socket.IO** for real-time collaboration
- **MongoDB** for chat persistence and session storage
- **OpenAI API** integration for AI assistance
- **Judge0 API** for code execution
- **Modular design** with separate AI service

### Frontend (React + Vite)
- **CodeMirror 6** for code editing
- **Socket.IO client** for real-time updates
- **Responsive UI** with VS Code-like theme
- **Context menus** and keyboard shortcuts

### AI Integration
- **Context-aware prompts** including current files and chat history
- **Tool calling** for code execution and file operations
- **Streaming responses** for better user experience
- **Error handling** and fallback responses

## 🔧 Configuration

### Environment Variables
```bash
# Required
MONGODB_URI=mongodb://localhost:27017/live-editor
AI_API_KEY=your_openai_api_key

# Optional
PORT=3001
CLIENT_ORIGIN=http://localhost:3000
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
```

### AI Model Options
- **gpt-4o-mini** (recommended) - Fast, cost-effective
- **gpt-4o** - More capable, higher cost
- **gpt-3.5-turbo** - Budget option

## 🚀 Deployment

### Docker (Recommended)
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "index.cjs"]
```

### Environment Setup
1. Set production environment variables
2. Configure MongoDB connection (consider MongoDB Atlas)
3. Set up reverse proxy (nginx) for HTTPS
4. Configure domain and SSL certificates

## 🧪 Testing

### Manual Testing
1. Create a room and invite team members
2. Test real-time collaboration features
3. Verify AI responses with various prompts
4. Test code execution across different languages

### AI Testing Scenarios
- **Code explanation**: Ask AI to explain complex functions
- **Bug finding**: Present code with intentional bugs
- **Optimization**: Request performance improvements
- **Learning**: Ask for concept explanations

## 🔒 Security Considerations

- **Input sanitization** for chat messages
- **Rate limiting** for AI API calls
- **Environment variable protection**
- **CORS configuration** for production
- **MongoDB connection security**

## 🚧 Troubleshooting

### Common Issues
1. **MongoDB connection failed**
   - Check connection string and network access
   - Verify MongoDB service is running

2. **AI not responding**
   - Verify OpenAI API key is valid
   - Check API quota and billing status
   - Review server logs for errors

3. **Code execution fails**
   - Verify Judge0 API is accessible
   - Check language support in `langMap`

4. **Real-time updates not working**
   - Check Socket.IO connection
   - Verify CORS configuration
   - Check browser console for errors

### Debug Mode
```bash
# Enable detailed logging
DEBUG=socket.io:* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

ISC License - see LICENSE file for details

## 🙏 Acknowledgments

- **CodeMirror** for the excellent code editor
- **Socket.IO** for real-time communication
- **OpenAI** for AI capabilities
- **Judge0** for code execution
- **MongoDB** for data persistence

## 📞 Support

- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check this README and code comments

---

**Happy coding with your AI teammate! 🚀🤖**


# UML Structure — EDI Collaborative Code Editor

> **Project**: Real-Time Collaborative Code Editor with AI Assistance
> **Tech Stack**: React (Vite) + Node.js (Express) + MongoDB (Mongoose) + Socket.IO + WebRTC

---

## 1. 📦 Package Diagram (High-Level Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EDI_MIC_COLLAB_UPLOAD                                 │
│                                                                                 │
│  ┌──────────────────────────────┐       ┌──────────────────────────────────┐    │
│  │       «package»              │       │          «package»               │    │
│  │       Frontend               │       │          Backend                 │    │
│  │       (React + Vite)         │◄─────►│       (Express + Socket.IO)      │    │
│  │                              │ HTTP  │                                  │    │
│  │  ┌─────────┐ ┌───────────┐  │ WS    │  ┌──────────┐ ┌──────────────┐  │    │
│  │  │ pages/  │ │components/│  │       │  │ models/  │ │  routes/     │  │    │
│  │  └─────────┘ └───────────┘  │       │  └──────────┘ └──────────────┘  │    │
│  │  ┌─────────────────────┐    │       │  ┌──────────┐ ┌──────────────┐  │    │
│  │  │ CollaborativeEditor │    │       │  │aiService │ │  server.js   │  │    │
│  │  └─────────────────────┘    │       │  └──────────┘ └──────────────┘  │    │
│  └──────────────────────────────┘       └──────────────┬───────────────────┘    │
│                                                        │                        │
│                                               ┌────────▼────────┐               │
│                                               │   «database»    │               │
│                                               │    MongoDB      │               │
│                                               │   (Mongoose)    │               │
│                                               └─────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 📐 Class Diagram (Data Models & Services)

### 2.1 Mongoose Data Models

```
┌──────────────────────────────────────────────┐
│              «Mongoose Model»                │
│                  User                        │
│──────────────────────────────────────────────│
│  - email        : String  «unique»           │
│  - phone        : String  «unique, sparse»   │
│  - password     : String                     │
│  - name         : String                     │
│  - otp          : String                     │
│  - otpExpires   : Date                       │
│  - verified     : Boolean = false            │
│──────────────────────────────────────────────│
│                  (none)                       │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│             «Mongoose Schema»                │
│               FileItem                       │
│──────────────────────────────────────────────│
│  - name         : String  «required»         │
│  - path         : String  «required»         │
│  - type         : String  «enum: file|folder»│
│  - content      : String  = ''               │
│  - size         : Number  = 0                │
│  - lastModified : Date    = Date.now         │
│  - children     : FileItem[]  «recursive»    │
│  - isExpanded   : Boolean = false            │
│──────────────────────────────────────────────│
│                  (none)                       │
└──────────────────────────────────────────────┘
         ▲ composition (recursive self-ref)
         │
         │ 1..*
┌──────────────────────────────────────────────┐
│              «Mongoose Model»                │
│                Project                       │
│──────────────────────────────────────────────│
│  - roomId         : String   «required, unique» │
│  - projectName    : String   = 'Untitled Project'│
│  - rootFolder     : FileItem                 │
│  - fileStructure  : FileItem[]               │
│  - uploadedBy     : String   = 'Unknown'     │
│  - uploadedAt     : Date     = Date.now      │
│  - lastModified   : Date     = Date.now      │
│  - activeFile     : String   (nullable)      │
│  - settings       : Object                   │
│  │   ├─ allowFileOperations : Boolean = true │
│  │   └─ allowFolderUpload   : Boolean = true │
│  - createdAt      : Date     «auto»          │
│  - updatedAt      : Date     «auto»          │
│──────────────────────────────────────────────│
│  + findFileByPath(path) : FileItem | null    │
│  + updateFileContent(path, content) : Boolean│
│  + addFileItem(parentPath, item) : Boolean   │
│  + deleteFileItem(path) : Boolean            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│              «Mongoose Model»                │
│                  Code                        │
│──────────────────────────────────────────────│
│  - roomId    : String                        │
│  - fileName  : String                        │
│  - code      : String                        │
│  - updatedAt : Date = Date.now               │
│──────────────────────────────────────────────│
│                  (none)                       │
└──────────────────────────────────────────────┘
```

### 2.2 Relationships Between Models

```
  ┌──────┐         ┌─────────┐         ┌──────┐
  │ User │─ ─ ─ ─ ─│ Project │◆────────│ Code │
  └──────┘ creates └────┬────┘ stores  └──────┘
                        │
                   ◆ contains
                   1..*│
                  ┌────┴────┐
                  │FileItem │
                  └────┬────┘
                       │ ◆ recursive
                       │   children
                  ┌────┴────┐
                  │FileItem │
                  └─────────┘
```

**Legend:**
- `◆────` = Composition (strong ownership)
- `─ ─ ─` = Dependency / loose association
- `1..*` = One-to-many

### 2.3 Service Class

```
┌──────────────────────────────────────────────────────────────┐
│                        «class»                               │
│                       AIService                              │
│──────────────────────────────────────────────────────────────│
│  - genAI        : GoogleGenerativeAI                         │
│  - model        : GenerativeModel                            │
│  - openai       : OpenAI                                     │
│  - provider     : String  ('gemini' | 'openai')              │
│  - chatHistory  : Map<roomId, Array>                         │
│──────────────────────────────────────────────────────────────│
│  + constructor()                                             │
│  + initializeOpenAI() : void                                 │
│  + askAI(roomId, prompt, context, retryCount) : Object       │
│  + buildSystemPrompt(context) : String                       │
│  + generateCodeSuggestion(prompt, language, context) : Object│
│  + explainCode(code, language) : Object                      │
│  + suggestImprovements(code, language) : Object              │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 Frontend Widget Class

```
┌───────────────────────────────────────────────┐
│         «class» extends WidgetType            │
│           RemoteCursorWidget                  │
│───────────────────────────────────────────────│
│  - color : String                             │
│  - label : String                             │
│───────────────────────────────────────────────│
│  + constructor(color, label)                  │
│  + toDOM() : HTMLElement                      │
└───────────────────────────────────────────────┘
```

---

## 3. 🧩 Component Diagram (Frontend React Components)

```
                              ┌──────────┐
                              │   App    │
                              │ (Router) │
                              └────┬─────┘
                                   │
            ┌──────────────────────┼─────────────────────────┐
            │                      │                         │
      ┌─────▼──────┐        ┌─────▼──────┐           ┌──────▼──────┐
      │  AppLayout  │        │ RequireAuth│           │  (Routes)   │
      │  (Navbar    │        │ (Auth Gate)│           │             │
      │   toggle)   │        └────────────┘           └──────┬──────┘
      └─────────────┘                                        │
                                                             │
         ┌──────────┬──────────┬──────────┬──────────────────┼────────┐
         │          │          │          │                   │        │
    ┌────▼───┐ ┌───▼───┐ ┌───▼────┐ ┌───▼─────┐  ┌─────────▼──────┐ │
    │  Home  │ │Signup │ │ Login  │ │CreateJoin│  │Collaborative   │ │
    │        │ │       │ │        │ │  Room    │  │    Editor      │ │
    └────────┘ └───────┘ └────────┘ └─────────┘  └───────┬────────┘ │
                                                         │          │
                          ┌──────────────────────────────┐│          │
                          │                              ││          │
                   ┌──────▼──────┐  ┌──────────────┐  ┌──▼────────┐ │
                   │FileExplorer │  │ContextMenu   │  │ CodeMirror│ │
                   │             │  │              │  │  Editor   │ │
                   └──────┬──────┘  └──────────────┘  └───────────┘ │
                          │                                         │
                   ┌──────▼──────┐                                  │
                   │  FileItem   │                            ┌─────▼─────┐
                   │ (recursive) │                            │  Other    │
                   └─────────────┘                            │  Pages:   │
                                                              │ About,   │
                                                              │ Blog,    │
                                                              │Features, │
                                                              │ Pricing, │
                                                              │ Contact  │
                                                              └───────────┘

    ┌───────────────── Shared Components ─────────────────┐
    │                                                     │
    │  ┌────────┐  ┌────────┐  ┌──────────────┐           │
    │  │ Navbar │  │ Footer │  │AnimatedHero  │           │
    │  └────────┘  └────────┘  └──────────────┘           │
    │  ┌────────────┐  ┌───────────┐  ┌──────────────┐    │
    │  │ BlogCard   │  │ContactForm│  │PricingCards  │    │
    │  └────────────┘  └───────────┘  └──────────────┘    │
    │  ┌──────────────────┐  ┌─────────┐                  │
    │  │FeaturesSlideshow │  │ Spinner │                  │
    │  └──────────────────┘  └─────────┘                  │
    └─────────────────────────────────────────────────────┘
```

---

## 4. 🔄 Sequence Diagrams

### 4.1 User Authentication (Signup Flow)

```
  ┌──────┐          ┌──────────┐         ┌────────┐       ┌─────────┐       ┌───────┐
  │Client│          │Signup.jsx│         │Server  │       │Nodemailer│       │MongoDB│
  └──┬───┘          └────┬─────┘         └───┬────┘       └────┬────┘       └───┬───┘
     │  Fill form         │                   │                 │                │
     │───────────────────►│                   │                 │                │
     │                    │  POST /send-otp   │                 │                │
     │                    │──────────────────►│                 │                │
     │                    │                   │  Check existing │                │
     │                    │                   │─────────────────────────────────►│
     │                    │                   │◄────────────────────────────────│
     │                    │                   │  Send email     │                │
     │                    │                   │────────────────►│                │
     │                    │                   │◄───────────────│                │
     │                    │  {success: true}  │                 │                │
     │                    │◄─────────────────│                 │                │
     │  Show OTP input    │                   │                 │                │
     │◄──────────────────│                   │                 │                │
     │  Enter OTP         │                   │                 │                │
     │───────────────────►│                   │                 │                │
     │                    │POST /verify-otp   │                 │                │
     │                    │──────────────────►│                 │                │
     │                    │                   │  bcrypt hash    │                │
     │                    │                   │  Create User    │                │
     │                    │                   │─────────────────────────────────►│
     │                    │                   │◄────────────────────────────────│
     │                    │  {success: true}  │                 │                │
     │                    │◄─────────────────│                 │                │
     │  Redirect /login   │                   │                 │                │
     │◄──────────────────│                   │                 │                │
```

### 4.2 Login Flow (Password-based)

```
  ┌──────┐          ┌─────────┐         ┌────────┐       ┌───────┐
  │Client│          │Login.jsx│         │Server  │       │MongoDB│
  └──┬───┘          └────┬────┘         └───┬────┘       └───┬───┘
     │  Submit form       │                  │                │
     │───────────────────►│                  │                │
     │                    │  POST /login     │                │
     │                    │─────────────────►│                │
     │                    │                  │  Find User     │
     │                    │                  │───────────────►│
     │                    │                  │◄──────────────│
     │                    │                  │  bcrypt compare│
     │                    │                  │  jwt.sign()    │
     │                    │  {token, name}   │                │
     │                    │◄────────────────│                │
     │  localStorage.set  │                  │                │
     │  Redirect /        │                  │                │
     │◄──────────────────│                  │                │
```

### 4.3 Real-Time Collaboration (Join Room + Code Editing)

```
  ┌───────┐      ┌──────────────────┐      ┌──────────┐       ┌───────┐
  │User A │      │CollaborativeEditor│      │Socket.IO │       │User B │
  └──┬────┘      └────────┬─────────┘      └────┬─────┘       └──┬────┘
     │  Navigate /editor/X │                     │                 │
     │────────────────────►│                     │                 │
     │                     │  emit('joinRoom')   │                 │
     │                     │  {roomId, userName}  │                 │
     │                     │────────────────────►│                 │
     │                     │                     │  emit('userList')│
     │                     │                     │────────────────►│
     │                     │  on('userList')      │                 │
     │                     │◄───────────────────│                 │
     │  Type code          │                     │                 │
     │────────────────────►│                     │                 │
     │                     │emit('codeChange')   │                 │
     │                     │────────────────────►│                 │
     │                     │                     │on('codeChange') │
     │                     │                     │────────────────►│
     │                     │                     │                 │  Updated!
```

### 4.4 AI Chat Interaction

```
  ┌──────┐     ┌──────────────────┐    ┌──────────┐     ┌──────────┐
  │Client│     │CollaborativeEditor│    │Socket.IO │     │AIService │
  └──┬───┘     └────────┬─────────┘    └────┬─────┘     └────┬─────┘
     │  Ask AI question  │                   │                 │
     │──────────────────►│                   │                 │
     │                   │  emit('askAI')    │                 │
     │                   │  {roomId, prompt, │                 │
     │                   │   selectedCode,   │                 │
     │                   │   filePath, lang}  │                 │
     │                   │──────────────────►│                 │
     │                   │                   │ aiService.askAI()│
     │                   │                   │────────────────►│
     │                   │                   │                 │ Call Gemini/
     │                   │                   │                 │ OpenAI API
     │                   │                   │                 │────────┐
     │                   │                   │                 │◄───────┘
     │                   │                   │ {success, msg}  │
     │                   │                   │◄───────────────│
     │                   │ on('aiResponse')  │                 │
     │                   │◄─────────────────│                 │
     │  Display response │                   │                 │
     │  (typing effect)  │                   │                 │
     │◄─────────────────│                   │                 │
```

### 4.5 Voice Communication (WebRTC Signaling)

```
  ┌───────┐       ┌──────────┐       ┌───────┐
  │User A │       │Socket.IO │       │User B │
  └──┬────┘       └────┬─────┘       └──┬────┘
     │ joinVoice        │                │
     │─────────────────►│                │
     │                  │ voice-user-    │
     │                  │ joined         │
     │                  │───────────────►│
     │  createOffer()   │                │
     │─────────────────►│                │
     │  voice-offer     │                │
     │                  │  voice-offer   │
     │                  │───────────────►│
     │                  │                │  createAnswer()
     │                  │  voice-answer  │
     │                  │◄──────────────│
     │  voice-answer    │                │
     │◄────────────────│                │
     │                  │                │
     │  ICE candidates  │                │
     │◄───────────────►│◄──────────────►│
     │                  │                │
     │  ═══════ Peer-to-Peer Audio ═════│
```

### 4.6 File Upload & Exploration

```
  ┌──────┐    ┌────────────┐    ┌────────────────┐    ┌───────┐    ┌───────┐
  │Client│    │FileExplorer│    │/api/explorer    │    │Multer │    │MongoDB│
  └──┬───┘    └─────┬──────┘    └───────┬────────┘    └──┬────┘    └──┬────┘
     │ Upload folder │                   │                │            │
     │──────────────►│                   │                │            │
     │               │ POST /upload-     │                │            │
     │               │ folder (FormData) │                │            │
     │               │─────────────────►│                │            │
     │               │                   │ Parse files    │            │
     │               │                   │───────────────►│            │
     │               │                   │◄──────────────│            │
     │               │                   │ buildFileTree()│            │
     │               │                   │ Save to disk   │            │
     │               │                   │                │            │
     │               │                   │ Save Project   │            │
     │               │                   │───────────────────────────►│
     │               │                   │◄──────────────────────────│
     │               │ {project data}    │                │            │
     │               │◄────────────────│                │            │
     │ Render tree   │                   │                │            │
     │◄─────────────│                   │                │            │
```

---

## 5. 📊 State Diagram (User Session Lifecycle)

```
                    ┌─────────┐
                    │  START  │
                    └────┬────┘
                         │
                         ▼
                ┌────────────────┐
                │  Unauthenticated│
                │  (Home Page)   │
                └───────┬────────┘
                        │
              ┌─────────┼──────────┐
              ▼                    ▼
      ┌──────────────┐    ┌──────────────┐
      │   Signing Up │    │  Logging In  │
      │  (OTP Flow)  │    │  (Pwd/OTP)   │
      └──────┬───────┘    └──────┬───────┘
             │                   │
             └────────┬──────────┘
                      ▼
             ┌────────────────┐
             │ Authenticated  │
             │ (JWT in        │
             │  localStorage) │
             └───────┬────────┘
                     │
                     ▼
          ┌──────────────────┐
          │  Create/Join     │
          │  Room            │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │  In Collaboration│
          │  Room            │
          │                  │
          │  ┌────────────┐  │
          │  │Code Editing │  │
          │  └────────────┘  │
          │  ┌────────────┐  │
          │  │  AI Chat    │  │
          │  └────────────┘  │
          │  ┌────────────┐  │
          │  │  Team Chat  │  │
          │  └────────────┘  │
          │  ┌────────────┐  │
          │  │ Voice Call  │  │
          │  └────────────┘  │
          │  ┌────────────┐  │
          │  │File Explorer│  │
          │  └────────────┘  │
          └────────┬─────────┘
                   │
                   ▼
             ┌──────────┐
             │Disconnect │
             │ / Logout  │
             └──────────┘
```

---

## 6. 🗃️ Deployment Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        «cloud»                                   │
│                                                                  │
│  ┌─────────────────┐    HTTP/WS     ┌──────────────────────┐    │
│  │  «server»       │◄──────────────►│  «server»            │    │
│  │  Vercel /       │                │  Render / Railway     │    │
│  │  Netlify        │                │                       │    │
│  │                 │                │  ┌─────────────────┐  │    │
│  │  Frontend       │                │  │  Express.js     │  │    │
│  │  (React SPA)    │                │  │  + Socket.IO    │  │    │
│  │                 │                │  │  + AIService    │  │    │
│  └─────────────────┘                │  └────────┬────────┘  │    │
│                                     │           │           │    │
│                                     └───────────┼───────────┘    │
│                                                 │                │
│  ┌───────────────────────┐          ┌───────────▼──────────┐     │
│  │  «external service»   │          │  «database»          │     │
│  │  Google Gemini /      │◄────────►│  MongoDB Atlas       │     │
│  │  OpenAI API           │  API     │                      │     │
│  └───────────────────────┘          └──────────────────────┘     │
│                                                                  │
│  ┌───────────────────────┐                                       │
│  │  «external service»   │                                       │
│  │  Gmail SMTP           │                                       │
│  │  (Nodemailer)         │                                       │
│  └───────────────────────┘                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. 📋 Complete Entity-Relationship (ER) Diagram

```
┌──────────────────┐        ┌──────────────────────┐        ┌──────────────┐
│      USER        │        │       PROJECT         │        │     CODE     │
├──────────────────┤        ├──────────────────────┤        ├──────────────┤
│ _id       :ObjId │        │ _id          :ObjId  │        │ _id    :ObjId│
│ email     :String│──┐     │ roomId       :String │◄───────│ roomId :Str  │
│ phone     :String│  │     │ projectName  :String │        │ fileName:Str │
│ password  :String│  │     │ rootFolder   :FileItem│       │ code    :Str │
│ name      :String│  │     │ fileStructure:FI[]   │        │ updatedAt:Dt │
│ otp       :String│  └────►│ uploadedBy   :String │        └──────────────┘
│ otpExpires:Date  │creates │ uploadedAt   :Date   │
│ verified  :Bool  │        │ lastModified :Date   │        ┌──────────────┐
└──────────────────┘        │ activeFile   :String │        │   FILEITEM   │
                            │ settings     :Object │        │  (embedded)  │
                            │ createdAt    :Date   │◆───────├──────────────┤
                            │ updatedAt    :Date   │        │ name    :Str │
                            └──────────────────────┘        │ path    :Str │
                                                            │ type    :Str │
                                                            │ content :Str │
                                                            │ size    :Num │
                                                            │ lastMod :Dt  │
                                                            │ children:FI[]│
                                                            │ isExpanded:Bl│
                                                            └──────┬───────┘
                                                                   │ ◆
                                                                   │ recursive
                                                                   ▼
                                                            ┌──────────────┐
                                                            │  FILEITEM    │
                                                            │  (children)  │
                                                            └──────────────┘
```

---

## 8. 📡 Communication Protocol Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Communication Channels                               │
│                                                                         │
│  ┌─── REST API (HTTP) ────────────────────────────────────────────┐    │
│  │                                                                 │    │
│  │  Auth Endpoints:                                                │    │
│  │    POST /api/auth/send-otp          → Send signup OTP           │    │
│  │    POST /api/auth/verify-otp        → Verify OTP & create user  │    │
│  │    POST /api/auth/login             → Password login (→ JWT)    │    │
│  │    POST /api/auth/login-send-otp    → Send login OTP            │    │
│  │                                                                 │    │
│  │  Code Execution:                                                │    │
│  │    POST /api/run                    → Execute code server-side  │    │
│  │                                                                 │    │
│  │  File Explorer:                                                 │    │
│  │    POST /api/explorer/upload-folder → Upload project folder     │    │
│  │    GET  /api/explorer/project/:id   → Get file structure        │    │
│  │    POST /api/explorer/file-content  → Get file content          │    │
│  │    POST /api/explorer/save-file     → Save file content         │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─── WebSocket (Socket.IO) ──────────────────────────────────────┐    │
│  │                                                                 │    │
│  │  Room Management:                                               │    │
│  │    joinRoom, userList, userJoined                               │    │
│  │                                                                 │    │
│  │  Collaboration:                                                 │    │
│  │    codeChange, languageChange, chatMessage                      │    │
│  │                                                                 │    │
│  │  AI Assistance:                                                 │    │
│  │    askAI, aiThinking, aiResponse                                │    │
│  │                                                                 │    │
│  │  Voice (WebRTC Signaling):                                      │    │
│  │    joinVoice, leaveVoice, voice-offer,                          │    │
│  │    voice-answer, voice-candidate,                               │    │
│  │    voice-user-joined, voice-user-left,                          │    │
│  │    voice-connected-users                                        │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─── WebRTC (Peer-to-Peer) ─────────────────────────────────────┐    │
│  │                                                                 │    │
│  │    Direct audio streaming between peers                         │    │
│  │    (after signaling via Socket.IO)                              │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Summary Table

| Diagram Type         | What It Shows                                              |
|---------------------|------------------------------------------------------------|
| Package Diagram      | High-level architecture (Frontend, Backend, Database)      |
| Class Diagram        | Data models (User, Project, FileItem, Code, AIService)     |
| Component Diagram    | React component hierarchy & relationships                  |
| Sequence Diagrams    | Auth, Collaboration, AI, Voice, File Upload flows          |
| State Diagram        | User session lifecycle                                     |
| Deployment Diagram   | Cloud infrastructure & external services                   |
| ER Diagram           | Database entity relationships                              |
| Communication Diagram| REST, WebSocket, and WebRTC protocol overview              |

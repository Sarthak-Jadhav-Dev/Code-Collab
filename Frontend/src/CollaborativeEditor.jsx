﻿import React, { useEffect, useRef, useState, useMemo, memo } from "react"; // Added 'memo'
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { go } from "@codemirror/lang-go";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { keymap, EditorView } from "@codemirror/view";
import io from "socket.io-client";
import { Decoration, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import Spinner from "./Spinner";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  VscFiles,
  VscChevronLeft,
  VscChevronRight,
  VscClose,
  VscCommentDiscussion,
  VscSymbolKeyword,
  VscNewFile,
  VscTrash,
  VscEdit,
  VscCopy,
  VscSend,
} from "react-icons/vsc";
import { FaUserCircle, FaRobot } from "react-icons/fa";
import axios from "axios";
import FileExplorer from "./components/FileExplorer";
import "./PanelStyles.css";
import API_URL from "./config";

// --- NEW: Import react-markdown and the syntax highlighter ---
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark as prismOneDark } from "react-syntax-highlighter/dist/esm/styles/prism"; // Use a theme that matches

// Using API_URL from config
const backendUrl = API_URL;

// Improve socket connection with better configuration
const socket = io(backendUrl, {
  transports: ["websocket", "polling"], // Try both transports
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  upgrade: true,
  rememberUpgrade: true, // Remember the best transport method
  autoConnect: true,
  forceNew: false, // Reuse existing connection if available
});

// Add connection event listeners for debugging
socket.on('connect', () => {
  console.log('✅ Socket.IO connected successfully');
  console.log('   Socket ID:', socket.id);
  console.log('   Transport:', socket.io.engine.transport.name);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection error:', error.message);
  console.error('   Attempted URL:', backendUrl);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket.IO disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
});

socket.io.engine.on('upgrade', (transport) => {
  console.log('⬆️  Socket.IO upgraded to:', transport.name);
});

const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "C++", value: "cpp" },
  { label: "Java", value: "java" },
  { label: "Go", value: "go" },
  { label: "C", value: "c" },
  { label: "C#", value: "csharp" },
  { label: "Ruby", value: "ruby" },
  { label: "Swift", value: "swift" },
  { label: "Kotlin", value: "kotlin" },
  { label: "Rust", value: "rust" },
  { label: "TypeScript", value: "typescript" },
  { label: "PHP", value: "php" },
  { label: "Perl", value: "perl" },
  { label: "Scala", value: "scala" },
  { label: "R", value: "r" },
  { label: "Dart", value: "dart" },
  { label: "Pascal", value: "pascal" },
  { label: "Fortran", value: "fortran" },
  { label: "Lua", value: "lua" },
  { label: "Bash", value: "bash" },
  { label: "SQL", value: "sql" },
  { label: "Objective-C", value: "objectivec" },
  { label: "Groovy", value: "groovy" },
  { label: "OCaml", value: "ocaml" },
  { label: "VB.NET", value: "vbnet" },
  { label: "Haskell", value: "haskell" },
  { label: "Clojure", value: "clojure" },
  { label: "Erlang", value: "erlang" },
  { label: "Elixir", value: "elixir" },
  { label: "COBOL", value: "cobol" },
  { label: "Julia", value: "julia" },
  { label: "Crystal", value: "crystal" },
  { label: "Nim", value: "nim" },
  { label: "Lisp", value: "lisp" },
  { label: "Prolog", value: "prolog" },
  { label: "Scheme", value: "scheme" },
];

const EXTENSIONS = {
  javascript: [
    javascript(),
    oneDark,
    autocompletion({ activateOnTyping: true }),
    keymap.of(completionKeymap),
  ],
  python: [
    python(),
    oneDark,
    autocompletion({ activateOnTyping: true }),
    keymap.of(completionKeymap),
  ],
  c: [
    cpp(),
    oneDark,
    autocompletion({ activateOnTyping: true }),
    keymap.of(completionKeymap),
  ],
  cpp: [
    cpp(),
    oneDark,
    autocompletion({ activateOnTyping: true }),
    keymap.of(completionKeymap),
  ],
  java: [
    java(),
    oneDark,
    autocompletion({ activateOnTyping: true }),
    keymap.of(completionKeymap),
  ],
  go: [
    go(),
    oneDark,
    autocompletion({ activateOnTyping: true }),
    keymap.of(completionKeymap),
  ],
};

// --- Remote Cursor Widget ---
class RemoteCursorWidget extends WidgetType {
  constructor(color, label) {
    super();
    this.color = color;
    this.label = label;
  }
  toDOM() {
    const span = document.createElement("span");
    span.style.borderLeft = `2.5px solid ${this.color}`;
    span.style.marginLeft = "-2px";
    span.style.height = "1.2em";
    span.style.display = "inline-block";
    span.style.position = "relative";
    span.style.zIndex = "10";
    span.style.boxShadow = `0 0 6px 2px ${this.color}55`;
    span.title = this.label;
    return span;
  }
}
function remoteCursorExtension(cursors) {
  return EditorView.decorations.compute([], (state) => {
    const builder = new RangeSetBuilder();
    const sortedCursors = Object.entries(cursors)
      .filter(
        ([userId, { cursor }]) =>
          typeof cursor === "number" &&
          cursor >= 0 &&
          cursor <= state.doc.length
      )
      .sort((a, b) => a[1].cursor - b[1].cursor);
    sortedCursors.forEach(([userId, { cursor }], i) => {
      builder.add(
        cursor,
        cursor,
        Decoration.widget({
          widget: new RemoteCursorWidget(
            ["#e06c75", "#98c379", "#61afef", "#c678dd", "#56b6c2"][i % 5],
            userId.slice(0, 6)
          ),
          side: 1,
        })
      );
    });
    return builder.finish();
  });
}

// --- NEW: Custom hook for typing animation ---
const useTypingAnimation = (textToType) => {
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [completedText, setCompletedText] = useState("");

  useEffect(() => {
    if (!textToType) {
      setTypedText("");
      setCompletedText("");
      setIsTyping(false);
      return;
    }

    // If we've already completed typing this message, don't restart
    if (completedText === textToType) {
      setTypedText(textToType); // Ensure full text is shown
      setIsTyping(false);
      return;
    }

    // If we're already typing the same message, don't restart
    if (isTyping && typedText && textToType.startsWith(typedText)) {
      return;
    }

    // Performance optimization: For very long messages, type faster
    const speedFactor = textToType.length > 500 ? 2 : 1;

    // For extremely long messages, type in chunks to reduce re-renders
    const chunkSize = textToType.length > 1000 ? 3 : 1;

    // If this is a new message, start typing
    setTypedText("");
    setIsTyping(true);
    setCompletedText(textToType);

    let i = 0;
    const timer = setInterval(() => {
      // Type in chunks for long messages
      const nextChunk = textToType.substring(i, i + chunkSize);
      setTypedText((prev) => prev + nextChunk);
      i += chunkSize;

      if (i >= textToType.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 20 / speedFactor); // Base typing speed

    return () => clearInterval(timer);
  }, [textToType, isTyping, typedText, completedText]);

  return { typedText, isTyping };
};

// --- FIXED: MessageContent component for rendering Markdown and Code ---
const MessageContent = memo(({ content }) => {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
                style={prismOneDark}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

// --- FIXED: Component for AI message with typing effect (wrapped in memo) ---
const AiTypingComponent = memo(({ message, chatBoxRef }) => {
  const { typedText } = useTypingAnimation(message);

  // Effect to scroll down as text is being typed (throttled for performance)
  useEffect(() => {
    if (chatBoxRef.current) {
      // Throttle scroll updates to reduce lag
      const scrollTimeout = setTimeout(() => {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }, 50);

      return () => clearTimeout(scrollTimeout);
    }
  }, [typedText, chatBoxRef]);

  return <MessageContent content={typedText} />;
});

// --- Main Component ---
const CollaborativeEditor = () => {
  const { roomId } = useParams();
  console.log("Current room ID:", roomId); // Log the room ID

  const [files, setFiles] = useState([
    { name: "main.js", content: "// Start coding..." },
  ]);
  const [activeFile, setActiveFile] = useState("main.js");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [chat, setChat] = useState([]);
  const [aiChat, setAiChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [users, setUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiRetryCount, setAiRetryCount] = useState(0);
  const [aiLastError, setAiLastError] = useState("");
  const [processedMessages, setProcessedMessages] = useState(new Set());
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0 });
  const [showUserJoinNotification, setShowUserJoinNotification] = useState(false);
  const [joinedUser, setJoinedUser] = useState("");
  const [chatMode, setChatMode] = useState("ai");
  const textareaRef = useRef(null); // Ref for the multi-line input box

  // File structure states
  const [fileStructure, setFileStructure] = useState([]);

  const [projectName, setProjectName] = useState("No Project");
  const [explorerActiveFile, setExplorerActiveFile] = useState("");
  const [localSyncPath, setLocalSyncPath] = useState(""); // New state for local sync path

  // --- NEW: Voice Communication States ---
  const [isMicOn, setIsMicOn] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null); // Ref to access stream in callbacks
  const peersRef = useRef({});
  const audioRefs = useRef({});
  const [voiceUsers, setVoiceUsers] = useState([]); // Track users in voice chat

  // --- Resizer logic for bottom panel ---
  const [outputPanelHeight, setOutputPanelHeight] = useState(180);
  const [isResizing, setIsResizing] = useState(false);
  const minOutputPanelHeight = 90;
  const maxOutputPanelHeight = 500;

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // --- Resizer logic for right panel ---
  const [rightPanelWidth, setRightPanelWidth] = useState(350); // Increased default width
  const [isResizingRight, setIsResizingRight] = useState(false);
  const minRightPanelWidth = 280; // Increased min width
  const maxRightPanelWidth = 600;

  const startResizingRight = (e) => {
    e.preventDefault();
    setIsResizingRight(true);
  };

  // --- Resizer logic for left panel ---
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [isResizingExplorer, setIsResizingExplorer] = useState(false);
  const minExplorerWidth = 40;
  const maxExplorerWidth = 400;

  const startResizingExplorer = (e) => {
    e.preventDefault();
    setIsResizingExplorer(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
    setIsResizingRight(false);
    setIsResizingExplorer(false);
  };

  const resizePanels = (e) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY - 40; // 40px for the top bar
      if (
        newHeight >= minOutputPanelHeight &&
        newHeight <= maxOutputPanelHeight
      ) {
        setOutputPanelHeight(newHeight);
      }
    }
    if (isResizingRight) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= minRightPanelWidth && newWidth <= maxRightPanelWidth) {
        setRightPanelWidth(newWidth);
      }
    }
    if (isResizingExplorer) {
      const newWidth = e.clientX;
      if (newWidth >= minExplorerWidth && newWidth <= maxExplorerWidth) {
        setExplorerWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    document.addEventListener("mousemove", resizePanels);
    document.addEventListener("mouseup", stopResizing);
    return () => {
      document.removeEventListener("mousemove", resizePanels);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, isResizingRight, isResizingExplorer]);

  // --- Collapsible Sidebars ---
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const chatBoxRef = useRef(null);
  const aiChatBoxRef = useRef(null);

  const currentFile = files.find((f) => f.name === activeFile) || {
    content: "",
  };

  // --- Socket Event Listeners ---
  useEffect(() => {
    // Join room when component mounts
    const userName = localStorage.getItem("name") || "Anonymous";
    socket.emit("joinRoom", { roomId, userName });

    // Listen for user joined notifications
    socket.on("userJoined", (data) => {
      setJoinedUser(data.user);
      setShowUserJoinNotification(true);
      setTimeout(() => setShowUserJoinNotification(false), 3000);
    });

    // Listen for user list updates
    socket.on("userList", (userList) => {
      console.log('📝 userList event received:', userList);
      console.log('   Number of users:', userList.length);
      console.log('   Users:', userList.join(', '));
      setUsers(userList);
    });

    // Listen for code changes from other users
    socket.on("codeChange", (data) => {
      if (data.roomId === roomId) {
        // Update the file content in state
        setFiles((files) =>
          files.map((f) =>
            f.name === data.fileName ? { ...f, content: data.code } : f
          )
        );

        // If this is the active file, update the editor
        if (activeFile === data.fileName) {
          // The CodeMirror editor will automatically update when the value prop changes
        }
      }
    });

    // Listen for AI responses
    socket.on("aiResponse", (data) => {
      if (data.roomId === roomId) {
        setAiThinking(false);
        if (data.success) {
          const newMessage = {
            user: "AI",
            msg: data.message,
            timestamp: new Date(),
          };

          // Create a unique identifier for this message
          const messageKey = `${newMessage.user
            }-${newMessage.timestamp.getTime()}-${newMessage.msg.substring(0, 30)}`;

          // Additional check for content similarity to prevent repetitive responses
          const isSimilarToLast =
            aiChat.length > 0 &&
            aiChat[aiChat.length - 1].user === "AI" &&
            Math.abs(aiChat[aiChat.length - 1].msg.length - newMessage.msg.length) <
            20 &&
            (aiChat[aiChat.length - 1].msg.includes(
              newMessage.msg.substring(0, 20)
            ) ||
              newMessage.msg.includes(
                aiChat[aiChat.length - 1].msg.substring(0, 20)
              ));

          // Only add the message if it hasn't been processed yet and isn't repetitive
          if (!processedMessages.has(messageKey) && !isSimilarToLast) {
            setProcessedMessages((prev) => new Set(prev).add(messageKey));
            setAiChat((prev) => [...prev, newMessage]);
            // Reset retry count on successful response
            setAiRetryCount(0);
            setAiLastError("");
          }
        } else {
          // Handle retry logic for busy AI service
          if (data.message.includes("temporarily busy") && aiRetryCount < 3) {
            setAiLastError(data.message);
            // Auto-retry after a delay
            setTimeout(() => {
              setAiRetryCount((prev) => prev + 1);
              setAiThinking(true);
              // Resend the last user message
              if (lastUserMessage) {
                socket.emit("askAI", {
                  roomId,
                  prompt: lastUserMessage,
                  selectedCode: selectedCode || currentFile.content,
                  filePath: activeFile,
                  language,
                });
              }
            }, 3000 * (aiRetryCount + 1)); // Exponential backoff
          } else {
            const errorMessage = {
              user: "AI",
              msg:
                data.message +
                (aiRetryCount > 0 ? ` (Retried ${aiRetryCount} times)` : ""),
              timestamp: new Date(),
              type: "error",
            };

            // Create a unique identifier for this error message
            const errorKey = `${errorMessage.user
              }-${errorMessage.timestamp.getTime()}-${errorMessage.msg.substring(
                0,
                30
              )}`;

            // Only add the error message if it hasn't been processed yet
            if (!processedMessages.has(errorKey)) {
              setProcessedMessages((prev) => new Set(prev).add(errorKey));
              setAiChat((prev) => [...prev, errorMessage]);
              // Reset retry count after final failure
              setAiRetryCount(0);
              setAiLastError("");
            }
          }
        }
      }
    });

    // Listen for AI thinking state
    socket.on("aiThinking", (data) => {
      if (data.roomId === roomId) {
        setAiThinking(true);
      }
    });

    // Listen for chat messages
    socket.on("chatMessage", (data) => {
      if (data.roomId === roomId) {
        setChat((prev) => [
          ...prev,
          {
            user: data.user,
            msg: data.msg,
            timestamp: new Date(),
          },
        ]);
      }
    });

    // Listen for language changes
    socket.on("languageChange", (data) => {
      if (data.roomId === roomId) {
        setLanguage(data.language);
      }
    });

    // Listen for cursor changes
    socket.on("cursorChange", (data) => {
      if (data.roomId === roomId && data.userId !== socket.id) {
        setRemoteCursors((prev) => ({
          ...prev,
          [data.userId]: { cursor: data.cursor, selection: data.selection },
        }));
      }
    });

    // Listen for file structure updates
    socket.on("fileStructureUpdate", (data) => {
      console.log('📁 fileStructureUpdate event received:', data);
      if (data.roomId === roomId) {
        console.log('   Updating file structure with', data.fileStructure?.length || 0, 'items');
        setFileStructure(data.fileStructure || []);
        setProjectName(data.projectName || "Uploaded Project");
        setExplorerActiveFile(data.activeFile || "");
      }
    });

    // --- NEW: Voice Communication Event Listeners ---

    // Handle initial list of voice users
    socket.on("voice-connected-users", (users) => {
      console.log("🎤 Received voice user list:", users);
      setVoiceUsers(users);
    });

    // Handle incoming voice offer
    socket.on("voice-offer", async ({ from, offer }) => {
      try {
        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ]
        });
        peersRef.current[from] = peer;

        peer.ontrack = (event) => {
          console.log(`🎤 Received audio track from ${from}`);
          const audio = document.createElement("audio");
          audio.srcObject = event.streams[0];
          audio.autoplay = true;
          audio.controls = false; // Hidden audio control
          audioRefs.current[from] = audio;
          document.body.appendChild(audio);

          // Attempt to play if autoplay matches blocked
          audio.play().catch(e => console.error("Audio play error:", e));
        };

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("voice-candidate", { to: from, candidate: event.candidate });
          }
        };

        peer.onconnectionstatechange = () => {
          console.log(`🎤 Peer connection state with ${from}:`, peer.connectionState);
        };

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current));
        }

        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("voice-answer", { to: from, answer });
      } catch (error) {
        console.error("Error handling voice offer:", error);
      }
    });

    // Handle voice answer
    socket.on("voice-answer", async ({ from, answer }) => {
      try {
        const peer = peersRef.current[from];
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (error) {
        console.error("Error handling voice answer:", error);
      }
    });

    // Handle ICE candidates
    socket.on("voice-candidate", async ({ from, candidate }) => {
      try {
        const peer = peersRef.current[from];
        if (peer) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error);
      }
    });

    // Handle new user joining voice
    socket.on("voice-user-joined", async ({ userId, userName }) => {
      console.log(`🎤 User joined voice: ${userId} (${userName})`);

      // Add to UI list
      setVoiceUsers(prev => {
        if (prev.some(u => u.id === userId)) return prev;
        return [...prev, { id: userId, name: userName || 'User' }];
      });

      toast.info(`${userName || 'A user'} joined voice chat`);

      try {
        if (userId === socket.id || !localStreamRef.current) return;

        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ]
        });
        peersRef.current[userId] = peer;

        localStreamRef.current.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current));

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("voice-candidate", { to: userId, candidate: event.candidate });
          }
        };

        peer.ontrack = (event) => {
          console.log(`🎤 Received audio track from ${userId}`);
          const audio = document.createElement("audio");
          audio.srcObject = event.streams[0];
          audio.autoplay = true;
          audioRefs.current[userId] = audio;
          document.body.appendChild(audio);
          audio.play().catch(e => console.error("Audio play error:", e));
        };

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("voice-offer", { to: userId, offer });
      } catch (error) {
        console.error("Error creating voice offer:", error);
      }
    });

    // Handle user leaving voice
    socket.on("voice-user-left", ({ userId }) => {
      console.log(`🎤 User left voice: ${userId}`);

      // Remove from UI list
      setVoiceUsers(prev => prev.filter(u => u.id !== userId));

      try {
        if (audioRefs.current[userId]) {
          audioRefs.current[userId].remove();
          delete audioRefs.current[userId];
        }
        if (peersRef.current[userId]) {
          peersRef.current[userId].close();
          delete peersRef.current[userId];
        }
      } catch (error) {
        console.error("Error handling user left:", error);
      }
    });

    // Cleanup function to remove event listeners
    return () => {
      socket.off("userJoined");
      socket.off("userList");
      socket.off("codeChange");
      socket.off("aiResponse");
      socket.off("aiThinking");
      socket.off("chatMessage");
      socket.off("languageChange");
      socket.off("cursorChange");
      socket.off("fileStructureUpdate");
      // Remove voice communication listeners
      socket.off("voice-connected-users");
      socket.off("voice-offer");
      socket.off("voice-answer");
      socket.off("voice-candidate");
      socket.off("voice-user-joined");
      socket.off("voice-user-left");
    };
  }, [roomId]); // Only re-run when roomId changes - prevents infinite loop

  // --- NEW: WebRTC Connection Cleanup ---
  useEffect(() => {
    // Cleanup function for WebRTC connections
    return () => {
      // Clean up all audio elements
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.remove();
        }
      });

      // Close all peer connections
      Object.values(peersRef.current).forEach(peer => {
        if (peer) {
          peer.close();
        }
      });

      // Reset refs
      peersRef.current = {};
      audioRefs.current = {};

      // Stop local stream if active
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  // --- File Structure Functions ---
  const fetchFileStructure = async () => {
    try {
      console.log("Fetching file structure for room:", roomId);
      const response = await axios.get(
        `${backendUrl}/api/explorer/project/${roomId}`
      );
      console.log("Project response:", response.data);

      if (response.data.success && response.data.project) {
        setFileStructure(response.data.project.fileStructure || []);
        setProjectName(response.data.project.projectName || "Uploaded Project");
        setExplorerActiveFile(response.data.project.activeFile || "");

        // If there's an active file in the project, load it
        if (response.data.project.activeFile) {
          // Find the file in the file structure
          const findFile = (items, filePath) => {
            for (const item of items) {
              if (item.type === "file" && item.path === filePath) {
                return item;
              }
              if (item.children) {
                const found = findFile(item.children, filePath);
                if (found) return found;
              }
            }
            return null;
          };

          const activeFileItem = findFile(
            response.data.project.fileStructure || [],
            response.data.project.activeFile
          );
          if (activeFileItem) {
            // Replace the current file with the active file content
            setFiles([
              { name: activeFileItem.name, content: activeFileItem.content || "" },
            ]);
            setActiveFile(activeFileItem.name);
          }
        }
      } else {
        // No project found, but keep any existing files
        setFileStructure([]);
        setProjectName("No Project");
        setExplorerActiveFile("");
      }
    } catch (error) {
      console.error("Error fetching file structure:", error);
      setFileStructure([]);
      setProjectName("No Project");
      setExplorerActiveFile("");
    }
  };

  const handleFileStructureUpload = async (formData, projectName) => {
    try {
      formData.append("roomId", roomId);
      formData.append("projectName", projectName);
      formData.append("uploadedBy", localStorage.getItem("name") || "Unknown");

      const response = await axios.post(
        `${backendUrl}/api/explorer/upload-folder`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success("Folder uploaded successfully!");
        // Fetch the updated file structure
        await fetchFileStructure();
      } else {
        toast.error(response.data.error || "Failed to upload folder");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload folder");
    }
  };

  const handleFileSelect = async (fileItem) => {
    if (fileItem.type === "folder") return;

    // If this is already the active file, don't do anything
    if (activeFile === fileItem.name) return;

    console.log("=== FILE SELECT DEBUG ===");
    console.log("File item:", fileItem);
    console.log("Active file:", activeFile);
    console.log("File item path:", fileItem.path);

    try {
      setExplorerActiveFile(fileItem.path);

      // Save active file to backend
      try {
        console.log("Saving active file to backend:", fileItem.path);
        await axios.post(`${backendUrl}/api/explorer/active-file/${roomId}`, {
          filePath: fileItem.path,
        });
        console.log("Active file saved successfully");
      } catch (saveError) {
        console.warn("Failed to save active file to backend:", saveError);
        // Continue even if this fails, as it's not critical for opening the file
      }

      // Try to get content from the file structure first
      if (fileItem.content !== undefined && fileItem.content !== null) {
        console.log("Using content from file structure");
        // Use the content from the file structure
        setFiles([{ name: fileItem.name, content: fileItem.content }]);
        setActiveFile(fileItem.name);
      } else {
        console.log("Fetching content from backend");
        // File content not in structure, fetch from backend
        try {
          console.log("Requesting file content from backend:", {
            roomId,
            filePath: fileItem.path,
          });

          const response = await axios.post(
            `${backendUrl}/api/explorer/file-content`,
            {
              roomId,
              filePath: fileItem.path,
            }
          );

          console.log("Received response from backend:", response.data);

          if (response.data.content !== undefined) {
            // Replace the current file with the new file
            setFiles([
              { name: fileItem.name, content: response.data.content },
            ]);
            setActiveFile(fileItem.name);
          } else {
            // If no content returned, create empty file
            console.log("No content in response, using default content");
            setFiles([
              {
                name: fileItem.name,
                content: "// File content not available",
              },
            ]);
            setActiveFile(fileItem.name);
          }
        } catch (contentError) {
          console.error("Error fetching file content:", contentError);
          // Create a file with error message
          setFiles([
            {
              name: fileItem.name,
              content: `// Error loading file: ${contentError.message}`,
            },
          ]);
          setActiveFile(fileItem.name);
        }
      }
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error("Failed to load file content");
    }
  };

  const handleCreateFile = async (parentPath, fileName) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/explorer/create-item`,
        {
          roomId,
          parentPath,
          name: fileName,
          type: "file",
        }
      );

      if (response.data.success) {
        toast.success(`File ${fileName} created successfully`);
        fetchFileStructure();
      } else {
        toast.error(response.data.error || "Failed to create file");
      }
    } catch (error) {
      console.error("Create file error:", error);
      toast.error("Failed to create file");
    }
  };

  const handleCreateFolder = async (parentPath, folderName) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/explorer/create-item`,
        {
          roomId,
          parentPath,
          name: folderName,
          type: "folder",
        }
      );

      if (response.data.success) {
        toast.success(`Folder ${folderName} created successfully`);
        fetchFileStructure();
      } else {
        toast.error(response.data.error || "Failed to create folder");
      }
    } catch (error) {
      console.error("Create folder error:", error);
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteFile = async (filePath) => {
    try {
      const response = await axios.delete(
        `${backendUrl}/api/explorer/delete-item`,
        {
          data: { roomId, filePath },
        }
      );

      if (response.data.success) {
        toast.success("Item deleted successfully");
        fetchFileStructure();
      } else {
        toast.error(response.data.error || "Failed to delete item");
      }
    } catch (error) {
      console.error("Delete item error:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleRenameFile = async (oldPath, newName) => {
    try {
      const response = await axios.put(
        `${backendUrl}/api/explorer/rename-item`,
        {
          roomId,
          oldPath,
          newName,
        }
      );

      if (response.data.success) {
        toast.success("Item renamed successfully");
        fetchFileStructure();
      } else {
        toast.error(response.data.error || "Failed to rename item");
      }
    } catch (error) {
      console.error("Rename item error:", error);
      toast.error("Failed to rename item");
    }
  };

  const handleToggleFolder = async (folderPath) => {
    try {
      // Update frontend state immediately for responsive UI
      setFileStructure((prevStructure) => {
        const updateFolderExpanded = (items) => {
          return items.map((item) => {
            if (item.type === "folder" && item.path === folderPath) {
              const newExpandedState = !item.isExpanded;
              // Update backend with the new state
              axios
                .post(`${backendUrl}/api/explorer/toggle-folder/${roomId}`, {
                  folderPath,
                  isExpanded: newExpandedState,
                })
                .catch((error) => {
                  console.error(
                    "Failed to update folder state on backend:",
                    error
                  );
                });
              return { ...item, isExpanded: newExpandedState };
            }
            if (item.children) {
              return {
                ...item,
                children: updateFolderExpanded(item.children),
              };
            }
            return item;
          });
        };

        return updateFolderExpanded(prevStructure);
      });
    } catch (error) {
      console.error("Error toggling folder:", error);
    }
  };

  const handleRefreshFileStructure = () => {
    fetchFileStructure();
    toast.info("File explorer refreshed");
  };

  const handleSaveSession = async () => {
    const sessionId = prompt("Enter a name for this session:");
    if (!sessionId) return;
    try {
      // Save each file to the file structure
      for (const file of files) {
        try {
          await axios.post(`${backendUrl}/api/explorer/save-file`, {
            roomId,
            filePath: file.name,
            content: file.content,
            localPath: localSyncPath, // Include local path
          });
        } catch (saveError) {
          console.error(`Error saving file ${file.name}:`, saveError);
        }
      }

      // Refresh file structure
      fetchFileStructure();
      toast.success("Session saved!");
    } catch (e) {
      toast.error("Failed to save session.");
    }
  };

  // Function to send code changes to other users
  const sendCodeChange = (code) => {
    if (activeFile) {
      socket.emit("codeChange", {
        roomId,
        code,
        fileName: activeFile,
      });
    }
  };

  const handleChange = (value) => {
    // Update the file content in state
    setFiles((files) =>
      files.map((f) => (f.name === activeFile ? { ...f, content: value } : f))
    );
    sendCodeChange(value);

    // Auto-save to backend with debouncing
    if (activeFile) {
      // Clear previous timeout
      if (window.saveTimeout) {
        clearTimeout(window.saveTimeout);
      }

      // Set new timeout for saving
      window.saveTimeout = setTimeout(() => {
        axios
          .post(`${backendUrl}/api/explorer/save-file`, {
            roomId,
            filePath: activeFile,
            content: value,
            localPath: localSyncPath, // Include local path
          })
          .then((response) => {
            if (response.data.success) {
              console.log(`File ${activeFile} saved successfully`);
            } else {
              console.error("Failed to save file:", response.data.error);
            }
          })
          .catch((error) => {
            console.error("Auto-save error:", error);
          });
      }, 1000); // 1 second debounce
    }
  };

  const userName = localStorage.getItem("name") || "You";

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (chatMode === "ai") {
      if (aiInput.trim()) {
        sendAIChat();
      }
    } else {
      if (chatInput.trim()) {
        sendChat();
      }
    }
  };

  const sendChat = () => {
    // Don't add message locally - let server broadcast handle it to avoid duplicates
    socket.emit("chatMessage", {
      roomId,
      user: userName,
      msg: chatInput,
    });
    setChatInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const sendAIChat = () => {
    const userMessage = { user: userName, msg: aiInput, timestamp: new Date() };
    setAiChat((chat) => [...chat, userMessage]);
    setLastUserMessage(aiInput);
    socket.emit("askAI", {
      roomId,
      prompt: aiInput,
      selectedCode: selectedCode || currentFile.content,
      filePath: activeFile,
      language,
    });
    setAiInput("");
    // Reset retry count when sending a new message
    setAiRetryCount(0);
    setAiLastError("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // --- Auto-scroll chat to bottom ---
  useEffect(() => {
    if (chatBoxRef.current)
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chat]);
  useEffect(() => {
    if (aiChatBoxRef.current)
      aiChatBoxRef.current.scrollTop = aiChatBoxRef.current.scrollHeight;
  }, [aiChat]);

  // --- Periodically clear processed messages cache ---
  useEffect(() => {
    const interval = setInterval(() => {
      // Clear the processed messages cache every 5 minutes to prevent memory issues
      setProcessedMessages(new Set());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // --- Context Menu Escape handler ---
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") closeContextMenu();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // --- File/Tab/Session/Context Menu Logic ---

  const handleLoadSession = async () => {
    const sessionId = prompt("Enter session ID to load:");
    if (!sessionId) return;
    try {
      // Fetch the project for this session
      const response = await axios.get(
        `${backendUrl}/api/explorer/project/${sessionId}`
      );
      if (response.data.success && response.data.project) {
        setFileStructure(response.data.project.fileStructure || []);
        setProjectName(response.data.project.projectName || "Loaded Session");
        fetchFileStructure();
        toast.success("Session loaded!");
      } else {
        toast.error("Session not found");
      }
    } catch (e) {
      console.error("Load session error:", e);
      toast.error("Failed to load session.");
    }
  };

  const handleRunCode = async () => {
    setIsLoading(true);
    setError(null);
    setOutput("");
    try {
      const response = await axios.post(`${backendUrl}/api/run`, {
        code: currentFile.content,
        language,
      });
      if (response.data.success) {
        setOutput(response.data.output || "Code executed successfully");
      } else {
        setError(response.data.error || "Execution failed");
      }
    } catch (err) {
      console.error("Run code error:", err);
      setError(err.response?.data?.error || "Failed to execute code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (currentFile.content) {
      navigator.clipboard.writeText(currentFile.content);
      toast.success("Code copied to clipboard!");
    } else {
      toast.error("No code to copy");
    }
  };

  const handleDownloadFile = () => {
    if (!activeFile || !currentFile.content) {
      toast.error("No file to download");
      return;
    }
    const blob = new Blob([currentFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`File ${activeFile} downloaded!`);
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/editor/${roomId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Room link copied to clipboard!");
  };

  const addFile = () => {
    let base = "untitled";
    let i = 1;
    let ext =
      language === "python"
        ? ".py"
        : language === "java"
          ? ".java"
          : language === "go"
            ? ".go"
            : language === "c"
              ? ".c"
              : language === "cpp"
                ? ".cpp"
                : ".js";
    let name = `${base}${i}${ext}`;
    while (files.some((f) => f.name === name)) {
      i++;
      name = `${base}${i}${ext}`;
    }
    setFiles([...files, { name, content: "" }]);
    setActiveFile(name);

    // Also create the file in the file structure
    handleCreateFile("", name);
  };

  const deleteFile = (name) => {
    if (files.length === 1) return;
    const remainingFiles = files.filter((f) => f.name !== name);
    setFiles(remainingFiles);
    if (activeFile === name) {
      setActiveFile(remainingFiles[0]?.name || "");
    }

    // Also delete from file structure
    handleDeleteFile(name);
  };

  const renameFile = (oldName, newName) => {
    if (!newName || files.some((f) => f.name === newName)) return;
    setFiles((files) =>
      files.map((f) => (f.name === oldName ? { ...f, name: newName } : f))
    );
    setActiveFile(newName);

    // Also rename in file structure
    handleRenameFile(oldName, newName);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    socket.emit("languageChange", { roomId, language: e.target.value });
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ show: true, x: e.clientX, y: e.clientY });
  };
  const closeContextMenu = () => setContextMenu({ show: false, x: 0, y: 0 });

  // --- NEW: Voice Communication Functions ---
  const toggleMic = async () => {
    if (!isMicOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        localStreamRef.current = stream; // Update ref
        setIsMicOn(true);
        socket.emit("joinVoice", { roomId });
        toast.success("Microphone enabled!");
      } catch (error) {
        console.error("Microphone access error:", error);
        toast.error("Microphone access denied! Please allow microphone access in your browser settings.");
      }
    } else {
      // Mute / Leave
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      setLocalStream(null);
      localStreamRef.current = null; // Update ref
      setIsMicOn(false);

      // Clear own user from local voice list
      setVoiceUsers(prev => prev.filter(u => u.id !== socket.id));

      socket.emit("leaveVoice", { roomId });
      toast.info("Microphone disabled");
    }
  };

  const askAIAboutSelection = () => {
    if (selectedCode.trim()) {
      const prompt = `Please explain this code: \n\`\`\`\n${selectedCode}\n\`\`\``;
      setAiChat((prev) => [
        ...prev,
        { user: userName, msg: prompt, timestamp: new Date() },
      ]);
      socket.emit("askAI", {
        roomId,
        prompt,
        selectedCode,
        filePath: activeFile,
        language,
      });
      closeContextMenu();
    }
  };
  const askAIForHelp = () => {
    const prompt = `I need help with this code. Can you suggest improvements or identify any issues?`;
    setAiChat((prev) => [
      ...prev,
      { user: userName, msg: prompt, timestamp: new Date() },
    ]);
    socket.emit("askAI", {
      roomId,
      prompt,
      selectedCode: selectedCode || currentFile.content,
      filePath: activeFile,
      language,
    });
    closeContextMenu();
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const closeTab = (name) => {
    if (files.length === 1) return;
    deleteFile(name);
  };

  // --- NEW: Quick AI Actions ---
  const handleQuickAction = (actionType) => {
    let prompt = "";
    const codeContext = selectedCode ? `the selected code` : `the file ${activeFile}`;
    const codeToAnalyze = selectedCode || currentFile.content;

    if (!codeToAnalyze || !codeToAnalyze.trim()) {
      toast.warning("Please select some code or open a non-empty file first.");
      return;
    }

    switch (actionType) {
      case "check":
        prompt = `Please check ${codeContext} for errors, bugs, and potential issues. Provide a detailed analysis.`;
        break;
      case "time":
        prompt = `Please analyze the Time Complexity of ${codeContext}. Explain the reasoning behind the complexity class.`;
        break;
      case "space":
        prompt = `Please analyze the Space Complexity of ${codeContext}. Explain the reasoning behind the complexity analysis.`;
        break;
      case "security":
        prompt = `Please perform a Security Check on ${codeContext}. Identify any vulnerabilities, security risks, or unsafe practices.`;
        break;
      default:
        return;
    }

    // Send the prompt to AI
    const userMessage = { user: userName, msg: prompt, timestamp: new Date() };
    setAiChat((chat) => [...chat, userMessage]);
    setLastUserMessage(prompt);

    socket.emit("askAI", {
      roomId,
      prompt,
      selectedCode: codeToAnalyze,
      filePath: activeFile,
      language,
    });

    // Reset retry count when sending a new message
    setAiRetryCount(0);
    setAiLastError("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // --- NEW: Multi-line Textarea Logic ---
  const autoResizeTextarea = (e) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 200; // Max height of 200px
    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = "hidden";
    }
  };

  const handleInputKeyDown = (e) => {
    // Submit on Enter, but allow new line with Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  // --- NEW: Enhanced chat bubble renderer ---
  const renderChatBubble = (c, isAI, isSelf, isLastAndTyping) => {
    // Check if this message is from the current user
    const isOwnMessage = c.user === userName;

    const bubbleClasses = [
      "chat-message",
      isAI ? "ai-message" : (isOwnMessage ? "own-message" : "other-message"),
      c.type === "error" ? "error-message" : "",
    ].join(" ");

    // Check if this is an AI error message about being busy
    const isAIBusyError =
      isAI && c.type === "error" && c.msg.includes("temporarily busy");

    return (
      <div
        key={`${c.timestamp}-${c.user}-${Math.random()}`}
        className={bubbleClasses}
      >
        <div className="chat-avatar">
          {isAI ? <FaRobot /> : <FaUserCircle />}
        </div>
        <div className="chat-bubble">
          <div className="chat-header">
            <span className="chat-user">
              {isAI ? "AI Assistant" : c.user}
            </span>
            <span className="chat-time">{formatTime(c.timestamp)}</span>
          </div>
          <div className="chat-text">
            {isAI && isLastAndTyping ? (
              <AiTypingComponent message={c.msg} chatBoxRef={aiChatBoxRef} />
            ) : (
              <div className="vsc-chat-message-text">{c.msg}</div>
            )}
          </div>
          {isAIBusyError && aiRetryCount > 0 && (
            <div className="retry-info">
              <span>
                🔄 Retrying... (Attempt {aiRetryCount + 1}/3)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Fetch the user's local sync path when component mounts
  useEffect(() => {
    const fetchLocalSyncPath = async () => {
      try {
        const response = await axios.get(
          `${backendUrl}/api/explorer/get-local-path/${roomId}`
        );
        if (response.data.success && response.data.localPath) {
          setLocalSyncPath(response.data.localPath);
        }
      } catch (error) {
        console.log("No local sync path set yet");
      }
    };

    fetchLocalSyncPath();
  }, [roomId]);

  // Fetch file structure when component mounts
  useEffect(() => {
    fetchFileStructure();
  }, [roomId]);

  // Save file structure periodically
  useEffect(() => {
    const saveFileStructure = async () => {
      if (fileStructure.length > 0) {
        try {
          // We don't need to save the file structure to backend here
          // as it's already handled by individual file operations
          console.log("File structure updated");
        } catch (error) {
          console.error("Error saving file structure:", error);
        }
      }
    };

    // Save file structure when it changes (debounced)
    const timeout = setTimeout(saveFileStructure, 2000);
    return () => clearTimeout(timeout);
  }, [fileStructure, roomId]);

  // Save active file before unloading the page
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      // Save the active file if it exists
      if (activeFile) {
        const activeFileObj = files.find((f) => f.name === activeFile);
        if (activeFileObj) {
          try {
            await axios.post(`${backendUrl}/api/explorer/save-file`, {
              roomId,
              filePath: activeFile,
              content: activeFileObj.content,
              localPath: localSyncPath,
            });
            console.log(`File ${activeFile} saved before unload`);
          } catch (error) {
            console.error(
              `Error saving file ${activeFile} before unload:`,
              error
            );
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeFile, files, roomId, localSyncPath]);

  // Function to set local sync path
  const handleSetLocalSyncPath = async () => {
    const path = prompt(
      "Enter the full path to the directory on your PC where you want files to be synced:",
      localSyncPath || "C:\\path\\to\\your\\project"
    );
    if (!path) return;

    try {
      const response = await axios.post(
        `${backendUrl}/api/explorer/set-local-path/${roomId}`,
        {
          localPath: path,
        }
      );

      if (response.data.success) {
        setLocalSyncPath(path);
        toast.success("Local sync path set successfully!");
      } else {
        toast.error(response.data.error || "Failed to set local sync path");
      }
    } catch (error) {
      console.error("Error setting local sync path:", error);
      toast.error("Failed to set local sync path");
    }
  };

  // --- Main Render ---
  return (
    <div className="vsc-root" onMouseMove={resizePanels} onMouseUp={stopResizing}>
      {/* VS Code Top Bar */}
      <div className="vsc-topbar">
        <div className="vsc-topbar-left">
          <span className="vsc-title">Live Code Editor</span>
          <span className="vsc-divider" />
          <span className="vsc-label">Language:</span>
          <select
            className="vsc-select"
            value={language}
            onChange={handleLanguageChange}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div className="vsc-topbar-right">
          <span className="vsc-users">
            {users.length} user{users.length !== 1 ? "s" : ""} online
          </span>
          {/* NEW: Voice Controls */}
          <button
            className={`vsc-topbar-button ${isMicOn ? 'mic-on' : ''}`}
            onClick={toggleMic}
            title={isMicOn ? "Disable Microphone" : "Enable Microphone"}
            style={{ backgroundColor: isMicOn ? '#e06c75' : '' }}
          >
            {isMicOn ? "🔇 Mute" : "🎙️ Join Voice"}
          </button>

          {voiceUsers.length > 0 && (
            <div className="voice-users-list" style={{ marginLeft: '10px', display: 'flex', gap: '5px' }}>
              {voiceUsers.map(u => (
                <span key={u.id} title={u.name} style={{
                  background: '#98c379',
                  color: '#282c34',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'default'
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="vsc-main">
        {/* Explorer Sidebar */}
        <div
          className={`vsc-sidebar${explorerOpen ? "" : " closed"}`}
          style={{ width: explorerOpen ? `${explorerWidth}px` : "40px" }}
        >
          <div className="vsc-sidebar-header">
            <button
              className="vsc-sidebar-toggle"
              onClick={() => setExplorerOpen((v) => !v)}
              title={explorerOpen ? "Collapse Explorer" : "Expand Explorer"}
            >
              {explorerOpen ? <VscChevronLeft /> : <VscChevronRight />}
            </button>
            {explorerOpen && (
              <>
                <span className="vsc-sidebar-title">
                  <VscFiles /> Explorer
                </span>
                <button
                  className="vsc-sidebar-action"
                  onClick={addFile}
                  title="New File"
                >
                  <VscNewFile />
                </button>
                <button
                  className="vsc-sidebar-action"
                  onClick={handleSetLocalSyncPath}
                  title="Set Local Sync Path"
                >
                  📁
                </button>
              </>
            )}
          </div>
          {explorerOpen && (
            <FileExplorer
              fileStructure={fileStructure}
              projectName={projectName}
              activeFile={explorerActiveFile}
              onFileSelect={handleFileSelect}
              onFileStructureUpload={handleFileStructureUpload}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              onToggleFolder={handleToggleFolder}
              onRefresh={handleRefreshFileStructure}
              localSyncPath={localSyncPath} // Pass the local sync path
            />
          )}
        </div>
        <div
          className="vsc-resize-bar-vertical"
          onMouseDown={startResizingExplorer}
        />
        {/* Main Editor Area */}
        <div className="vsc-editor-area">
          {/* Tabs */}
          <div className="vsc-tabs">
            {files.length > 0 ? (
              files.map((f) => (
                <div
                  key={f.name}
                  className={`vsc-tab${f.name === activeFile ? " active" : ""}`}
                  onClick={() => setActiveFile(f.name)}
                >
                  <span className="vsc-tab-icon">📄</span>
                  <span className="vsc-tab-name">{f.name}</span>
                  {files.length > 1 && (
                    <button
                      className="vsc-tab-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(f.name);
                      }}
                      title="Close"
                    >
                      <VscClose />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="vsc-tab-placeholder">
                <span>No files open</span>
              </div>
            )}
          </div>
          {/* CodeMirror Editor */}
          <div className="vsc-codemirror" onContextMenu={handleContextMenu}>
            <CodeMirror
              value={
                activeFile
                  ? typeof currentFile.content === "string"
                    ? currentFile.content
                    : ""
                  : ""
              }
              height="100%"
              extensions={[
                ...(EXTENSIONS[language] || [oneDark, autocompletion()]),
                remoteCursorExtension(remoteCursors),
              ]}
              onChange={handleChange}
              theme="dark"
              style={{
                fontSize: "14px",
                height: "100%",
                background: "#1e1e1e",
                fontFamily:
                  "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
              }}
              onUpdate={(viewUpdate) => {
                const cursor = viewUpdate.state.selection.main.head;
                const selection = {
                  from: viewUpdate.state.selection.main.from,
                  to: viewUpdate.state.selection.main.to,
                };
                if (selection.from !== selection.to) {
                  const selectedText = viewUpdate.state.doc.sliceString(
                    selection.from,
                    selection.to
                  );
                  setSelectedCode(selectedText);
                } else {
                  setSelectedCode("");
                }
                socket.emit("cursorChange", {
                  roomId,
                  userId: socket.id,
                  cursor,
                  selection,
                });
              }}
              readOnly={!activeFile} // Make editor read-only when no file is active
            />
          </div>
          <div
            className="vsc-resize-bar-horizontal"
            onMouseDown={startResizing}
          />
          {/* Output Panel */}
          <div
            className="vsc-output-panel"
            style={{ height: `${outputPanelHeight}px` }}
          >
            <div className="vsc-output-header">
              <span>OUTPUT</span>
              <div className="vsc-output-actions">
                <button onClick={handleRunCode}>▶ Run</button>
                <button onClick={handleCopyCode}>📋 Copy</button>
                <button onClick={handleDownloadFile}>💾 Save</button>
                <button onClick={handleShareLink}>🔗 Share</button>
                <button onClick={handleSaveSession}>💾 Save Session</button>
                <button onClick={handleLoadSession}>📂 Load Session</button>
              </div>
            </div>
            <pre className="vsc-output-content">
              {output}
              {isLoading && <Spinner />}
              {error && <div className="vsc-error">❌ {error}</div>}
            </pre>
          </div>
        </div>
        <div
          className="vsc-resize-bar-vertical"
          onMouseDown={startResizingRight}
        />
        {/* Right Panel: AI/Chat */}
        <div
          className={`vsc-right-panel${rightPanelOpen ? "" : " closed"}`}
          style={{ width: `${rightPanelOpen ? rightPanelWidth : 40}px` }}
        >
          <div className="vsc-right-header">
            <button
              className="vsc-right-toggle"
              onClick={() => setRightPanelOpen((v) => !v)}
              title={rightPanelOpen ? "Collapse Chat/AI" : "Expand Chat/AI"}
            >
              {rightPanelOpen ? <VscChevronRight /> : <VscChevronLeft />}
            </button>
            {rightPanelOpen && (
              <>
                <span className="vsc-right-title">
                  <VscSymbolKeyword style={{ marginRight: 4 }} />
                  AI Assistant
                </span>
                <div className="vsc-right-tabs">
                  <button
                    className={`vsc-right-tab${chatMode === "ai" ? " active" : ""
                      }`}
                    onClick={() => setChatMode("ai")}
                  >
                    <VscSymbolKeyword /> AI
                  </button>
                  <button
                    className={`vsc-right-tab${chatMode === "group" ? " active" : ""
                      }`}
                    onClick={() => setChatMode("group")}
                  >
                    <VscCommentDiscussion /> Group
                  </button>
                </div>
              </>
            )}
          </div>
          {rightPanelOpen && (
            <>
              <div
                className="vsc-right-content"
                ref={chatMode === "ai" ? aiChatBoxRef : chatBoxRef}
              >
                {chatMode === "ai"
                  ? aiChat.map((c, i) =>
                    renderChatBubble(
                      c,
                      c.user === "AI",
                      c.user === userName,
                      i === aiChat.length - 1
                    )
                  )
                  : chat.map((c, i) =>
                    renderChatBubble(c, false, c.user === userName, false)
                  )}
                {aiThinking && chatMode === "ai" && (
                  <div className="chat-message ai-message">
                    <div className="chat-avatar">
                      <FaRobot />
                    </div>
                    <div className="chat-bubble thinking">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="vsc-right-input-area">
                {chatMode === "ai" && (
                  <div className="quick-actions">
                    <button
                      onClick={() => handleQuickAction('check')}
                      className="quick-action-btn"
                      title="Check for errors and bugs"
                    >
                      🐞 Code Check
                    </button>
                    <button
                      onClick={() => handleQuickAction('time')}
                      className="quick-action-btn"
                      title="Analyze Time Complexity"
                    >
                      ⏱️ Time Comp.
                    </button>
                    <button
                      onClick={() => handleQuickAction('space')}
                      className="quick-action-btn"
                      title="Analyze Space Complexity"
                    >
                      💾 Space Comp.
                    </button>
                    <button
                      onClick={() => handleQuickAction('security')}
                      className="quick-action-btn"
                      title="Perform Security Check"
                    >
                      🔒 Security
                    </button>
                  </div>
                )}
                <form onSubmit={handleFormSubmit} className="chat-form">
                  <textarea
                    ref={textareaRef}
                    value={chatMode === "ai" ? aiInput : chatInput}
                    onChange={(e) =>
                      chatMode === "ai"
                        ? setAiInput(e.target.value)
                        : setChatInput(e.target.value)
                    }
                    onInput={autoResizeTextarea}
                    onKeyDown={handleInputKeyDown}
                    placeholder={
                      chatMode === "ai"
                        ? "Ask the AI assistant..."
                        : "Send a message..."
                    }
                    rows={1}
                    className="chat-textarea"
                  />
                  <button
                    type="submit"
                    className="send-button"
                    disabled={
                      !(chatMode === "ai" ? aiInput : chatInput).trim() ||
                      aiThinking
                    }
                  >
                    <VscSend />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
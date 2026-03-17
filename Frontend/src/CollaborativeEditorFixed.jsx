import React, { useEffect, useRef, useState, useMemo, memo } from "react"; // Added 'memo'
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

// --- NEW: Import react-markdown and the syntax highlighter ---
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark as prismOneDark } from "react-syntax-highlighter/dist/esm/styles/prism"; // Use a theme that matches

// Using environment variables for flexible configuration
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

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
    setIsTyping(true);
    setTypedText("");

    const words = textToType.split(" ");
    let i = 0;

    const typeNextWord = () => {
      if (i < words.length) {
        // Type in chunks for better performance
        let chunk = "";
        for (let j = 0; j < chunkSize && i < words.length; j++) {
          chunk += (chunk ? " " : "") + words[i];
          i++;
        }

        setTypedText((prev) => (prev ? `${prev} ${chunk}` : chunk));

        // Add a longer pause for sentences
        const timeout = /[.!?]$/.test(chunk)
          ? 300 / speedFactor
          : 50 / speedFactor;
        setTimeout(typeNextWord, timeout);
      } else {
        setIsTyping(false);
        setCompletedText(textToType);
      }
    };

    const timer = setTimeout(typeNextWord, 50 / speedFactor);

    // Cleanup function to clear timeout
    return () => clearTimeout(timer);
  }, [textToType]); // <-- FIXED: Only depend on textToType

  return { typedText };
};

// --- REPLACED: Component to render message content with code blocks and copy button ---
const MessageContent = ({ content }) => {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!content) return null;

  const handleCopy = (code, key) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!", {
      autoClose: 1500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      style: { background: "#222236", color: "#fff", borderRadius: "8px" },
    });
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <ReactMarkdown
      className="chat-text-content"
      components={{
        // This will render all h1, h2, h3, etc.
        h1: ({ node, ...props }) => <h1 className="chat-header1" {...props} />,
        h2: ({ node, ...props }) => <h2 className="chat-header2" {...props} />,
        h3: ({ node, ...props }) => <h3 className="chat-header3" {...props} />,
        // This handles all lists (ol, ul)
        ul: ({ node, ...props }) => <ul className="chat-list" {...props} />,
        ol: ({ node, ...props }) => <ol className="chat-number-list" {...props} />,
        // This handles blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote className="chat-blockquote" {...props} />
        ),
        // This handles inline code `like this` and code blocks
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          const codeText = String(children).replace(/\n$/, "");
          const key = `${codeText.substring(0, 10)}-${Math.random()}`; // Unique key

          return !inline ? (
            // This is for code blocks (```)
            <div className="chat-code-block">
              <div className="code-header">
                <span>{match ? match[1] : "code"}</span>
                <button
                  onClick={() => handleCopy(codeText, key)}
                  className="copy-button"
                >
                  <VscCopy style={{ marginRight: "4px" }} />{" "}
                  {copiedKey === key ? "Copied" : "Copy"}
                </button>
              </div>
              <SyntaxHighlighter
                style={prismOneDark} // Use the imported theme
                language={match ? match[1] : null}
                PreTag="div"
                {...props}
              >
                {codeText}
              </SyntaxHighlighter>
            </div>
          ) : (
            // This is for inline `code`
            <code className="inline-code" {...props}>
              {children}
            </code>
          );
        },
        // This handles paragraphs
        p: ({ node, ...props }) => <p className="chat-paragraph" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

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
          const messageKey = `${
            newMessage.user
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
            const errorKey = `${
              errorMessage.user
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
      if (data.roomId === roomId) {
        setFileStructure(data.fileStructure || []);
        setProjectName(data.projectName || "Uploaded Project");
        setExplorerActiveFile(data.activeFile || "");
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
    };
  }, [
    roomId,
    activeFile,
    aiChat.length,
    currentFile.content,
    lastUserMessage,
    processedMessages,
    selectedCode,
    aiRetryCount,
  ]); // Added dependencies to stabilize socket listeners

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
    const userMessage = {
      user: userName,
      msg: chatInput,
      timestamp: new Date(),
    };
    setChat((chat) => [...chat, userMessage]);
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
  const handleRunCode = async () => {
    try {
      const response = await axios.post(`${backendUrl}/run`, {
        code: currentFile.content,
        language,
      });
      setOutput(response.data.output);
    } catch (err) {
      console.error("Error executing code:", err.response || err.message);
      if (err.response) {
        const errorMessage =
          err.response.data?.output ||
          err.response.data?.error ||
          err.response.statusText;
        setOutput(`Error: ${errorMessage}`);
      } else {
        setOutput(`Error: ${err.message}`);
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.content);
    toast.success("Code copied to clipboard!");
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Room link copied to clipboard!");
  };

  const handleLoadSession = async () => {
    const sessionId = prompt("Enter the session name to load:");
    if (!sessionId) return;
    try {
      const response = await axios.get(
        `${backendUrl}/api/load-session/${sessionId}`
      );
      const data = response.data;
      if (data.files) {
        setFiles(data.files);
        setActiveFile(data.files[0].name);
        toast.success("Session loaded!");
      } else {
        toast.error("Session not found.");
      }
    } catch (e) {
      toast.error("Failed to load session.");
    }
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
    const bubbleClasses = [
      "chat-message",
      isAI ? "ai-message" : "user-message",
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
            <span className="chat-user">{isAI ? "AI Assistant" : c.user}</span>
            <span className="chat-time">{formatTime(c.timestamp)}</span>
          </div>
          <div className="chat-text">
            {isAI && isLastAndTyping ? (
              <AiTypingComponent message={c.msg} chatBoxRef={aiChatBoxRef} />
            ) : (
              <MessageContent content={c.msg} />
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
                    className={`vsc-right-tab${
                      chatMode === "ai" ? " active" : ""
                    }`}
                    onClick={() => setChatMode("ai")}
                  >
                    <VscSymbolKeyword /> AI
                  </button>
                  <button
                    className={`vsc-right-tab${
                      chatMode === "group" ? " active" : ""
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

      {/* User Join Notification */}
      {showUserJoinNotification && (
        <div className="vsc-join-notification">
          <div>
            <strong>User joined</strong>
            <div>{joinedUser}</div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="vsc-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={closeContextMenu}
        >
          <div onClick={askAIAboutSelection}>🤖 Ask AI about selection</div>
          <div onClick={askAIForHelp}>🤖 Ask AI for help</div>
          <div
            onClick={() => {
              navigator.clipboard.writeText(selectedCode);
              closeContextMenu();
            }}
          >
            📋 Copy selection
          </div>
        </div>
      )}
      {contextMenu.show && (
        <div className="vsc-context-backdrop" onClick={closeContextMenu} />
      )}

      {/* Main Styles */}
      <style>{`
      .vsc-root { font-family: 'Segoe UI', 'Arial', sans-serif; background: #1e1e1e; color: #cccccc; height: 100vh; width: 100vw; overflow: hidden; display: flex; flex-direction: column; }
      .vsc-topbar { background: #23272e; border-bottom: 1px solid #252526; height: 40px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; font-size: 14px; flex-shrink: 0; }
      .vsc-topbar-left { display: flex; align-items: center; gap: 16px; }
      .vsc-title { color: #fff; font-weight: 600; font-size: 15px; letter-spacing: 0.5px; }
      .vsc-divider { width: 1px; height: 18px; background: #333; margin: 0 12px; }
      .vsc-label { color: #cccccc; font-size: 13px; }
      .vsc-select { background: #23272e; color: #cccccc; border: 1px solid #252526; border-radius: 3px; padding: 3px 10px; font-size: 13px; outline: none; margin-left: 4px; }
      .vsc-select:focus { border-color: #007acc; }
      .vsc-users { color: #cccccc; font-size: 13px; }
      .vsc-main { flex: 1; display: flex; min-height: 0; background: #1e1e1e; }
      .vsc-sidebar { min-width: 40px; background: #21222c; border-right: 1px solid #232336; transition: width 0.2s ease-out; box-shadow: 2px 0 8px #0002; z-index: 20; display: flex; flex-direction: column; }
      .vsc-sidebar.closed { width: 40px; min-width: 40px; overflow: hidden; }
      .vsc-sidebar-header { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-bottom: 1px solid #232336; background: #23272e; flex-shrink: 0; }
      .vsc-sidebar-toggle { background: none; border: none; color: #8a8fa3; font-size: 1.5em; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; border-radius: 4px; padding: 2px 4px; }
      .vsc-sidebar-toggle:hover { background: #232336; }
      .vsc-sidebar-title { color: #cccccc; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
      .vsc-sidebar-action { background: none; border: none; color: #8a8fa3; font-size: 1.2em; cursor: pointer; border-radius: 4px; padding: 2px 4px; }
      .vsc-sidebar-action:hover { background: #232336; color: #007acc; }
      .vsc-sidebar-files { flex: 1; overflow-y: auto; padding: 6px 0; }
      .vsc-sidebar-file { display: flex; align-items: center; gap: 8px; padding: 7px 14px; background: none; color: #cccccc; cursor: pointer; border-radius: 4px; font-size: 13px; transition: background 0.15s; margin-bottom: 2px; }
      .vsc-sidebar-file.active, .vsc-sidebar-file:hover { background: #23272e; color: #fff; }
      .vsc-file-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .vsc-file-actions { display: flex; gap: 2px; margin-left: auto; }
      .vsc-file-action { background: none; border: none; color: #8a8fa3; font-size: 1em; cursor: pointer; border-radius: 3px; padding: 2px 3px; }
      .vsc-file-action:hover { background: #232336; color: #007acc; }
      .vsc-editor-area { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #1e1e1e; }
      .vsc-tabs { background: #23272e; border-bottom: 1px solid #232336; display: flex; align-items: center; height: 36px; gap: 0; padding-left: 8px; flex-shrink: 0; }
      .vsc-tab { display: flex; align-items: center; gap: 6px; padding: 0 18px 0 10px; height: 36px; background: none; color: #cccccc; cursor: pointer; border-right: 1px solid #232336; font-size: 13px; position: relative; transition: background 0.15s; }
      .vsc-tab.active { background: #1e1e1e; color: #fff; border-bottom: 2px solid #007acc; }
      .vsc-tab-close { background: none; border: none; color: #8a8fa3; font-size: 1em; cursor: pointer; border-radius: 3px; padding: 2px 3px; margin-left: 6px; }
      .vsc-tab-close:hover { background: #232336; color: #e06c75; }
      .vsc-codemirror { flex: 1; min-height: 0; background: #1e1e1e; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; }
      .vsc-resize-bar-horizontal { height: 6px; background: #23272e; cursor: ns-resize; transition: background 0.2s; z-index: 100; border-top: 1px solid #252526; border-bottom: 1px solid #252526; }
      .vsc-resize-bar-horizontal:hover { background: #007acc; }
      .vsc-resize-bar-vertical { width: 6px; background: #23272e; cursor: ew-resize; transition: background 0.2s; z-index: 100; border-left: 1px solid #252526; border-right: 1px solid #252526; }
      .vsc-resize-bar-vertical:hover { background: #007acc; }
      .vsc-output-panel { background: #23272e; border-top: 1px solid #232336; min-height: 90px; max-height: 500px; display: flex; flex-direction: column; }
      .vsc-output-header { background: #23272e; color: #cccccc; font-size: 13px; font-weight: 600; padding: 6px 14px; border-bottom: 1px solid #232336; display: flex; align-items: center; justify-content: space-between; }
      .vsc-output-actions button { background: #232336; color: #cccccc; border: none; border-radius: 3px; padding: 4px 8px; font-size: 11px; cursor: pointer; margin-left: 4px; transition: background 0.15s, color 0.15s; }
      .vsc-output-actions button:hover { background: #007acc; color: #fff; }
      .vsc-output-content { flex: 1; padding: 12px; overflow-y: auto; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; font-size: 13px; color: #d4d4d4; background: #1e1e1e; }
      .vsc-error { color: #e06c75; margin-top: 8px; }
      .vsc-right-panel { min-width: 40px; background: #232336; border-left: 1px solid #232336; transition: width 0.2s ease-out; box-shadow: -2px 0 8px #0002; z-index: 20; display: flex; flex-direction: column; }
      .vsc-right-panel.closed { width: 40px; min-width: 40px; overflow: hidden; }
      .vsc-right-header { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-bottom: 1px solid #232336; background: #23272e; flex-shrink: 0; }
      .vsc-right-toggle { background: none; border: none; color: #8a8fa3; font-size: 1.5em; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; border-radius: 4px; padding: 2px 4px; }
      .vsc-right-toggle:hover { background: #232336; }
      .vsc-right-title { color: #cccccc; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
      .vsc-right-tabs { display: flex; gap: 2px; margin-left: auto; }
      .vsc-right-tab { background: none; border: none; color: #cccccc; font-size: 12px; padding: 4px 10px; border-radius: 3px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-weight: 500; transition: background 0.15s, color 0.15s; }
      .vsc-right-tab.active { background: #007acc; color: #fff; }
      .vsc-right-content { flex: 1; overflow-y: auto; background: #1e1e1e; padding: 16px 10px; font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: 20px; }
      .vsc-right-input-area { padding: 12px; border-top: 1px solid #232336; background: #23272e; }
      .chat-form { display: flex; align-items: flex-end; gap: 8px; background-color: #1a1a1a; padding: 8px; border-radius: 8px; border: 1px solid #252526; }
      .chat-textarea { flex: 1; background: transparent; color: #e0e0e0; border: none; outline: none; resize: none; font-size: 14px; line-height: 1.5; max-height: 200px; overflow-y: auto; font-family: 'Segoe UI', sans-serif; padding: 4px 0; }
      .chat-textarea::placeholder { color: #777; }
      .send-button { background-color: #007acc; color: white; border: none; border-radius: 6px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.2s; font-size: 18px; }
      .send-button:hover { background-color: #0098f7; }
      .send-button:disabled { background-color: #333; cursor: not-allowed; }
      .vsc-join-notification { position: fixed; top: 60px; right: 28px; background: #232336; color: #cccccc; padding: 14px 18px; border-radius: 6px; border: 1px solid #232336; z-index: 1000; max-width: 280px; font-size: 13px; box-shadow: 0 2px 12px #0006; animation: vsc-fadein 0.3s; }
      @keyframes vsc-fadein { from { opacity: 0; transform: translateY(-10px);} to { opacity: 1; transform: translateY(0);} }
      .vsc-context-menu { position: fixed; background: #232336; border: 1px solid #232336; border-radius: 6px; padding: 4px 0; box-shadow: 0 4px 16px #0008; z-index: 1000; min-width: 200px; font-size: 13px; }
      .vsc-context-menu div { padding: 10px 18px; cursor: pointer; color: #cccccc; transition: background 0.15s; }
      .vsc-context-menu div:hover { background: #007acc; color: #fff; }
      .vsc-context-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999; }
      
      /* --- NEW ChatGPT Style Chat --- */
      .chat-message { display: flex; max-width: 90%; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
      .chat-message.user-message { align-self: flex-end; flex-direction: row-reverse; }
      .chat-message.ai-message { align-self: flex-start; }
      .chat-avatar { width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; color: white; border-radius: 50%; }
      .user-message .chat-avatar { background-color: #007acc; }
      .ai-message .chat-avatar { background-color: #4ec9b0; }
      .chat-bubble { background-color: #2a2d3e; padding: 15px 20px; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
      .user-message .chat-bubble { background-color: #005a9e; }
      .ai-message.error-message .chat-bubble { background-color: #5c2c2c; border: 1px solid #e06c75; }
      .chat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .chat-user { font-weight: 600; font-size: 15px; color: #fff; }
      .chat-time { font-size: 12px; color: #a0a0a0; }
      .user-message .chat-time { color: #c0c0c0; }
      .chat-text { color: #e0e0e0; font-size: 15px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
      
      /* --- NEW Styles for react-markdown --- */
      .chat-text-content {
        font-size: 15px;
        line-height: 1.6;
        color: #e0e0e0;
        word-break: break-word; /* Ensure long words wrap */
      }
      .chat-text-content h1 { font-size: 24px; font-weight: bold; margin: 15px 0 10px; color: #fff; border-bottom: 2px solid #007acc; padding-bottom: 5px; }
      .chat-text-content h2 { font-size: 20px; font-weight: bold; margin: 15px 0 10px; color: #64b5f6; }
      .chat-text-content h3 { font-size: 18px; font-weight: bold; margin: 12px 0 8px; color: #4ec9b0; }
      .chat-text-content .chat-paragraph { margin: 10px 0; }
      .chat-text-content strong { font-weight: bold; color: #64b5f6; }
      .chat-text-content ul, .chat-text-content ol { margin: 10px 0 10px 20px; padding-left: 15px; }
      .chat-text-content li { margin-bottom: 5px; }
      .chat-text-content .chat-blockquote { border-left: 3px solid #007acc; padding-left: 15px; margin: 10px 0; color: #a0a0a0; font-style: italic; }
      .chat-text-content .inline-code { background: #2d2d2d; padding: 2px 6px; border-radius: 4px; font-family: 'Fira Code', Consolas, monospace; font-size: 14px; }
      /* --- End react-markdown styles --- */

      .retry-info { margin-top: 8px; padding: 8px; background: rgba(0, 122, 204, 0.2); border-radius: 4px; font-size: 13px; color: #64b5f6; display: flex; align-items: center; gap: 6px; }
      
      /* --- UPDATED Code Block Styles --- */
      .chat-code-block { background: #121212; border: 1px solid #252526; border-radius: 8px; margin: 15px 0; overflow: hidden; }
      .code-header { display: flex; justify-content: space-between; align-items: center; background: #23272e; padding: 8px 12px; font-size: 13px; color: #8a8fa3; font-weight: 500; border-bottom: 1px solid #252526; }
      .copy-button { background: #3c3f41; color: #cccccc; border: none; border-radius: 4px; padding: 5px 10px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: background 0.15s, color 0.15s; }
      .copy-button:hover { background: #007acc; color: #fff; }
      .chat-code-block pre { 
          margin: 0 !important; 
          padding: 15px !important; 
          background: #282c34 !important; /* Match the oneDark theme */
      }
      .chat-code-block code { 
          font-family: 'Fira Code', Consolas, monospace !important; 
          font-size: 14px !important; 
          background: none !important; /* Remove double background */
      }
      
      /* --- Thinking Indicator --- */
      .chat-bubble.thinking { padding: 15px 20px; }
      .typing-indicator { display: flex; align-items: center; }
      .typing-indicator span { height: 10px; width: 10px; background-color: #8a8fa3; border-radius: 50%; display: inline-block; margin: 0 3px; animation: bounce 1.2s infinite; }
      .typing-indicator span:nth-of-type(2) { animation-delay: 0.2s; }
      .typing-indicator span:nth-of-type(3) { animation-delay: 0.4s; }
      @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }

      /* --- Scrollbar Styles --- */
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #232336; }
      ::-webkit-scrollbar-thumb { background: #3c3f41; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #555; }
      * { scrollbar-width: thin; scrollbar-color: #3c3f41 #232336; }
      `}</style>
    </div>
  );
};

export default CollaborativeEditor;
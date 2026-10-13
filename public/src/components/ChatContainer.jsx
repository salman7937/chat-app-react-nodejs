import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import {
  sendMessageRoute,
  recieveMessageRoute,
  reactMessageRoute,
} from "../utils/APIRoutes";
import {
  BiCheck,
  BiCheckDouble,
  BiDotsVerticalRounded,
  BiArrowBack,
} from "react-icons/bi";
import { IoMdClose } from "react-icons/io";

const REACTION_EMOJIS = ["❤️", "😂", "👍", "🔥", "😮", "😢"];

export default function ChatContainer({
  currentChat,
  socket,
  onBack,
  onToggleBlock,
}) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const [arrivalMessage, setArrivalMessage] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const data = await JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
      );
      if (data && currentChat) {
        const response = await axios.post(recieveMessageRoute, {
          from: data._id,
          to: currentChat._id,
        });
        setMessages(response.data);
        setIsTyping(false);

        if (socket.current) {
          socket.current.emit("mark-messages-read", {
            from: data._id,
            to: currentChat._id,
          });
        }
      }
    };
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat]);

  useEffect(() => {
    const getCurrentChat = async () => {
      if (currentChat) {
        await JSON.parse(
          localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
        )._id;
      }
    };
    getCurrentChat();
  }, [currentChat]);

  useEffect(() => {
    setShowMenu(false);
  }, [currentChat?._id]);

  useEffect(() => {
    if (!showMenu) return undefined;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showMenu]);

  const handleBlockClick = () => {
    setShowMenu(false);
    if (onToggleBlock) onToggleBlock(currentChat);
  };

  const handleSendMsg = async (msg, messageType = "text", mediaUrl = "") => {
    const data = await JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    );

    let response;
    try {
      response = await axios.post(sendMessageRoute, {
        from: data._id,
        to: currentChat._id,
        message: msg,
        messageType,
        mediaUrl,
      });
    } catch (err) {
      // e.g. 403 when this contact is blocked - nothing was sent
      return;
    }

    const newMsg = {
      _id: response.data?.messageId || uuidv4(),
      fromSelf: true,
      message: msg,
      messageType: messageType || "text",
      mediaUrl: mediaUrl || "",
      status: response.data?.status || "sent",
      reactions: [],
      createdAt: new Date(),
    };

    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: data._id,
      msg,
      messageType,
      mediaUrl,
      messageId: newMsg._id,
      reactions: [],
    });

    setMessages((prev) => [...prev, newMsg]);
  };

  useEffect(() => {
    if (socket.current) {
      const handleMsgRecieve = (payload) => {
        const incoming =
          typeof payload === "object"
            ? { ...payload }
            : { message: payload, messageType: "text" };

        incoming.fromSelf = false;
        if (incoming.from === currentChat._id) {
          setMessages((prev) => [...prev, incoming]);

          const user = JSON.parse(
            localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
          );
          if (user?._id) {
            socket.current.emit("mark-messages-read", {
              from: user._id,
              to: currentChat._id,
            });
          }
        }
      };

      const handleUserTyping = (fromUserId) => {
        if (fromUserId === currentChat._id) {
          setIsTyping(true);
        }
      };

      const handleUserStopTyping = (fromUserId) => {
        if (fromUserId === currentChat._id) {
          setIsTyping(false);
        }
      };

      const handleMessagesRead = (data) => {
        if (data.readerId === currentChat._id) {
          setMessages((prev) =>
            prev.map((m) => (m.fromSelf ? { ...m, status: "read" } : m))
          );
        }
      };

      const handleMsgDelivered = (data) => {
        if (data.to === currentChat._id) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === data.messageId && m.status === "sent"
                ? { ...m, status: "delivered" }
                : m
            )
          );
        }
      };

      const handleReactionReceived = (data) => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === data.messageId
              ? { ...m, reactions: data.reactions }
              : m
          )
        );
      };

      socket.current.on("msg-recieve", handleMsgRecieve);
      socket.current.on("user-typing", handleUserTyping);
      socket.current.on("user-stop-typing", handleUserStopTyping);
      socket.current.on("messages-read-by-user", handleMessagesRead);
      socket.current.on("msg-delivered", handleMsgDelivered);
      socket.current.on("reaction-received", handleReactionReceived);

      const currentSocket = socket.current;
      return () => {
        currentSocket?.off("msg-recieve", handleMsgRecieve);
        currentSocket?.off("user-typing", handleUserTyping);
        currentSocket?.off("user-stop-typing", handleUserStopTyping);
        currentSocket?.off("messages-read-by-user", handleMessagesRead);
        currentSocket?.off("msg-delivered", handleMsgDelivered);
        currentSocket?.off("reaction-received", handleReactionReceived);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat]);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleAddReaction = async (messageId, emoji) => {
    const user = await JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    );
    try {
      const { data } = await axios.post(reactMessageRoute, {
        messageId,
        userId: user._id,
        emoji,
      });
      if (data.status) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, reactions: data.reactions } : m
          )
        );
        socket.current.emit("send-reaction", {
          messageId,
          reactions: data.reactions,
          to: currentChat._id,
          from: user._id,
        });
      }
    } catch (err) { }
    setActiveMenuMessageId(null);
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return "Offline";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Offline";
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return "Last seen just now";
      if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
      if (diffHours < 24) {
        return `Last seen today at ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
      if (diffDays === 1) {
        return `Last seen yesterday at ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
      return `Last seen ${date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })}`;
    } catch (e) {
      return "Offline";
    }
  };

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          {onBack && (
            <button
              type="button"
              className="back-btn"
              onClick={onBack}
              title="Back"
            >
              <BiArrowBack />
            </button>
          )}
          <div className="avatar">
            <img
              src={`data:image/svg+xml;base64,${currentChat.avatarImage}`}
              alt=""
            />
            {currentChat.isOnline && <span className="header-online-dot" />}
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
            {isTyping ? (
              <span className="typing-status">
                typing<span className="dot-pulse">...</span>
              </span>
            ) : currentChat.isOnline ? (
              <span className="online-badge live">● Online</span>
            ) : currentChat.lastSeen ? (
              <span className="online-badge">
                {formatLastSeen(currentChat.lastSeen)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="header-actions">
          {onToggleBlock && (
            <div className="chat-menu" ref={menuRef}>
              <button
                type="button"
                className="menu-btn"
                onClick={() => setShowMenu((v) => !v)}
                title="More"
              >
                <BiDotsVerticalRounded />
              </button>
              {showMenu && (
                <div className="menu-dropdown">
                  <button type="button" onClick={handleBlockClick}>
                    {currentChat.isBlocked ? "Unblock" : "Block"}{" "}
                    {currentChat.username}
                  </button>
                </div>
              )}
            </div>
          )}
          <Logout />
        </div>
      </div>

      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((message) => {
          const msgKey = message._id || uuidv4();
          const hasReactions = message.reactions && message.reactions.length > 0;

          return (
            <div
              key={msgKey}
              className={`message-wrapper ${message.fromSelf ? "sended" : "recieved"}`}
            >
              {activeMenuMessageId === message._id && message._id && (
                <div className={`reaction-bar ${message.fromSelf ? "sended" : "recieved"}`}>
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="reaction-btn"
                      onClick={() => {
                        handleAddReaction(message._id, emoji);
                        setActiveMenuMessageId(null);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div className="message-content-row">
                {message.fromSelf && message._id && (
                  <button
                    type="button"
                    className={`dots-menu-btn ${activeMenuMessageId === message._id ? "active" : ""}`}
                    onClick={() =>
                      setActiveMenuMessageId(
                        activeMenuMessageId === message._id ? null : message._id
                      )
                    }
                    title="React with Emoji"
                  >
                    <BiDotsVerticalRounded />
                  </button>
                )}

                <div className={`message ${message.fromSelf ? "sended" : "recieved"}`}>
                  <div className="content">
                    {message.messageType === "image" && message.mediaUrl && (
                      <div
                        className="media-image-container"
                        onClick={() => setPreviewImage(message.mediaUrl)}
                      >
                        <img src={message.mediaUrl} alt="shared" className="media-image" />
                      </div>
                    )}

                    {message.messageType === "audio" && message.mediaUrl && (
                      <div className="media-audio-container">
                        <audio controls src={message.mediaUrl} className="media-audio" />
                      </div>
                    )}

                    {message.message && <p>{message.message}</p>}

                    <div className="meta-footer">
                      {message.fromSelf && (
                        <span className="status-ticks">
                          {message.status === "read" ? (
                            <BiCheckDouble className="tick read" title="Read" />
                          ) : message.status === "delivered" ? (
                            <BiCheckDouble className="tick delivered" title="Delivered" />
                          ) : (
                            <BiCheck className="tick sent" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasReactions && (
                    <div className={`reactions-pill ${message.fromSelf ? "sended" : "recieved"}`}>
                      {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => (
                        <span key={emoji} className="emoji-item">
                          {emoji}
                        </span>
                      ))}
                      {message.reactions.length > 1 && (
                        <span className="reaction-count">{message.reactions.length}</span>
                      )}
                    </div>
                  )}
                </div>

                {!message.fromSelf && message._id && (
                  <button
                    type="button"
                    className={`dots-menu-btn ${activeMenuMessageId === message._id ? "active" : ""}`}
                    onClick={() =>
                      setActiveMenuMessageId(
                        activeMenuMessageId === message._id ? null : message._id
                      )
                    }
                    title="React with Emoji"
                  >
                    <BiDotsVerticalRounded />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="typing-bubble-wrapper">
            <div className="typing-bubble">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </div>

      {currentChat.isBlocked ? (
        <div className="blocked-bar">
          <span>You blocked {currentChat.username}.</span>
          <button type="button" onClick={() => onToggleBlock(currentChat)}>
            Unblock
          </button>
        </div>
      ) : (
        <ChatInput
          handleSendMsg={handleSendMsg}
          socket={socket}
          currentChat={currentChat}
        />
      )}

      {previewImage && (
        <ImageModal onClick={() => setPreviewImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setPreviewImage(null)}>
              <IoMdClose />
            </button>
            <img src={previewImage} alt="preview" />
          </div>
        </ImageModal>
      )}
    </Container>
  );
}

const ImageModal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(16px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modalFade 0.25s ease;

  .modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
      max-width: 100%;
      max-height: 85vh;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .close-btn {
      position: absolute;
      top: -2.5rem;
      right: 0;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: white;
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.2rem;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(239, 68, 68, 0.8);
      }
    }
  }

  @keyframes modalFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Container = styled.div`
  height: 100%;
  max-height: 100%;
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: 4.5rem minmax(0, 1fr) 4.8rem;
  overflow: hidden;
  background: rgba(13, 18, 30, 0.4);

  .chat-header {
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding: 0 1.8rem;
    background: rgba(11, 15, 26, 0.7);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 0;

      .back-btn {
        display: none;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: #f8fafc;
        font-size: 1.5rem;
        width: 2.2rem;
        height: 2.2rem;
        margin-left: -0.5rem;
        border-radius: 50%;
        cursor: pointer;
        flex-shrink: 0;
      }

      .avatar {
        width: 2.6rem;
        height: 2.6rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        padding: 2px;
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
        flex-shrink: 0;
        position: relative;

        img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }

        .header-online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #10b981;
          border: 1.5px solid #0b0f1a;
          box-shadow: 0 0 6px #10b981;
        }
      }

      .username {
        min-width: 0;

        h3 {
          color: #f8fafc;
          font-size: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .online-badge {
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 500;
          transition: color 0.2s ease;

          &.live {
            color: #10b981;
            font-weight: 600;
          }
        }

        .typing-status {
          font-size: 0.75rem;
          color: #a78bfa;
          font-weight: 600;
          letter-spacing: 0.2px;

          .dot-pulse {
            display: inline-block;
            animation: pulseDots 1.4s infinite;
          }
        }
      }
    }
  }

  .chat-header .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;

    .chat-menu {
      position: relative;

      .menu-btn {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
        font-size: 1.3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.12);
        }
      }

      .menu-dropdown {
        position: absolute;
        right: 0;
        top: calc(100% + 0.4rem);
        min-width: 11rem;
        background: rgba(15, 23, 42, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
        padding: 0.3rem;
        z-index: 30;

        button {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          color: #f87171;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0.65rem 0.8rem;
          border-radius: 8px;
          cursor: pointer;

          &:hover {
            background: rgba(239, 68, 68, 0.12);
          }
        }
      }
    }
  }

  .blocked-bar {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 0 1rem;
    background: rgba(11, 15, 26, 0.7);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    font-size: 0.9rem;

    button {
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #c7d2fe;
      border-radius: 9999px;
      padding: 0.4rem 1rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: #6366f1;
        color: #fff;
      }
    }
  }

  @keyframes pulseDots {
    0%, 20% { opacity: 0.2; }
    50% { opacity: 1; }
    100% { opacity: 0.2; }
  }

  .chat-messages {
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow-x: hidden;
    padding: 1.2rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 4px;
      &-thumb {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }
    }

    .message-wrapper {
      display: flex;
      flex-direction: column;
      position: relative;
      min-width: 0;
      max-width: 100%;

      &.sended {
        align-items: flex-end;
      }

      &.recieved {
        align-items: flex-start;
      }

      .reaction-bar {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(12px);
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        margin-bottom: 0.25rem;
        animation: reactionPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 10;

        .reaction-btn {
          background: transparent;
          border: none;
          font-size: 1.15rem;
          cursor: pointer;
          padding: 0.1rem 0.2rem;
          border-radius: 6px;
          transition: transform 0.15s ease;

          &:hover {
            transform: scale(1.3);
          }
        }
      }

      @keyframes reactionPop {
        from {
          opacity: 0;
          transform: translateY(4px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .message-content-row {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
        max-width: 100%;

        .dots-menu-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          width: 1.85rem;
          height: 1.85rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
          font-size: 1.25rem;
          flex-shrink: 0;

          &:hover,
          &.active {
            background: rgba(255, 255, 255, 0.1);
            color: #f8fafc;
            opacity: 1;
            transform: scale(1.08);
          }
        }
      }

      &:hover .message-content-row .dots-menu-btn {
        opacity: 0.65;
      }

      .message {
        display: flex;
        flex-direction: column;
        position: relative;
        min-width: 0;
        max-width: 65%;
        animation: msgPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);

        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 80%;
        }

        .content {
          padding: 0.7rem 1.1rem;
          font-size: 0.95rem;
          line-height: 1.5;
          overflow-wrap: anywhere;
          word-break: break-word;

          p {
            margin: 0;
          }

          .media-image-container {
            margin-bottom: 0.4rem;
            cursor: pointer;
            border-radius: 12px;
            overflow: hidden;

            .media-image {
              max-width: 260px;
              max-height: 220px;
              display: block;
              border-radius: 12px;
              transition: transform 0.2s ease;

              &:hover {
                transform: scale(1.02);
              }
            }
          }

          .media-audio-container {
            margin-bottom: 0.3rem;

            .media-audio {
              height: 36px;
              max-width: 240px;
              outline: none;
              border-radius: 20px;
            }
          }

          .meta-footer {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            margin-top: 0.2rem;

            .status-ticks {
              display: inline-flex;
              align-items: center;
              margin-left: 0.4rem;

              .tick {
                font-size: 1.1rem;

                &.sent {
                  color: #94a3b8;
                }

                &.delivered {
                  color: #cbd5e1;
                }

                &.read {
                  color: #38bdf8;
                }
              }
            }
          }
        }

        .reactions-pill {
          position: absolute;
          bottom: -0.65rem;
          display: flex;
          align-items: center;
          gap: 0.15rem;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.1rem 0.4rem;
          border-radius: 9999px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          font-size: 0.8rem;

          &.sended {
            right: 0.5rem;
          }

          &.recieved {
            left: 0.5rem;
          }

          .reaction-count {
            font-size: 0.7rem;
            color: #94a3b8;
            font-weight: 600;
            margin-left: 0.15rem;
          }
        }
      }

      &.sended .message .content {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #ffffff;
        border-radius: 18px 18px 4px 18px;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
      }

      &.recieved .message .content {
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #f1f5f9;
        border-radius: 18px 18px 18px 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    }

    .typing-bubble-wrapper {
      display: flex;
      justify-content: flex-start;
      animation: msgPop 0.2s ease;

      .typing-bubble {
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 0.7rem 1rem;
        border-radius: 18px 18px 18px 4px;
        display: flex;
        align-items: center;
        gap: 0.35rem;

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          animation: bounceDot 1.4s infinite ease-in-out both;

          &:nth-child(1) { animation-delay: -0.32s; }
          &:nth-child(2) { animation-delay: -0.16s; }
          &:nth-child(3) { animation-delay: 0s; }
        }
      }
    }
  }

  @keyframes bounceDot {
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.4;
    }
    40% {
      transform: scale(1.1);
      opacity: 1;
    }
  }

  @keyframes msgPop {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Touch devices have no hover - keep the message menu reachable */
  @media (hover: none) {
    .chat-messages .message-wrapper .message-content-row .dots-menu-btn {
      opacity: 0.65;
    }
  }

  @media screen and (max-width: 719px) {
    grid-template-rows: 4rem minmax(0, 1fr) 4.3rem;

    .chat-header {
      padding: 0 1rem;

      .user-details {
        gap: 0.7rem;

        .back-btn {
          display: flex;
        }
      }
    }

    .chat-messages {
      padding: 1rem;
      gap: 0.7rem;

      .message-wrapper {
        .message {
          max-width: calc(100vw - 6rem);

          .content {
            padding: 0.6rem 0.9rem;
            font-size: 0.92rem;

            .media-image-container .media-image {
              max-width: 100%;
              width: auto;
              max-height: 200px;
            }

            .media-audio-container .media-audio {
              max-width: 100%;
              width: 100%;
            }
          }
        }

        .reaction-bar {
          max-width: 100%;
          padding: 0.2rem 0.35rem;
        }
      }
    }
  }
`;

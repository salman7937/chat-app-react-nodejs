import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  allUsersRoute,
  host,
  unreadCountsRoute,
  addContactRoute,
  blockRoute,
  unblockRoute,
} from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

const toastOptions = {
  position: "bottom-right",
  autoClose: 3000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [unreadCounts, setUnreadCounts] = useState({});
  const contactsRef = useRef([]);
  contactsRef.current = contacts;

  const refreshContacts = useCallback(async () => {
    if (!currentUser?._id) return;
    try {
      const { data } = await axios.get(`${allUsersRoute}/${currentUser._id}`);
      if (Array.isArray(data)) {
        setContacts(data);
        // keep the open chat's header (online / last seen / blocked) in sync
        setCurrentChat((prev) =>
          prev ? data.find((c) => c._id === prev._id) || prev : prev
        );
      }
    } catch (err) { }
  }, [currentUser]);

  useEffect(() => {
    const checkUser = async () => {
      if (!localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)) {
        navigate("/login");
      } else {
        setCurrentUser(
          await JSON.parse(
            localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
          )
        );
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    const fetchUnread = async () => {
      if (currentUser?._id) {
        try {
          const { data } = await axios.get(`${unreadCountsRoute}/${currentUser._id}`);
          setUnreadCounts(data || {});
        } catch (err) { }
      }
    };
    fetchUnread();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      socket.current = io(host, {
        transports: ["websocket", "polling"],
      });

      socket.current.on("connect", () => {
        socket.current.emit("add-user", currentUser._id);
      });
      socket.current.emit("add-user", currentUser._id);

      socket.current.on("user-status-changed", (data) => {
        setContacts((prev) =>
          prev.map((c) =>
            c._id === data.userId
              ? { ...c, isOnline: data.isOnline, lastSeen: data.lastSeen }
              : c
          )
        );
        setCurrentChat((prev) => {
          if (prev && prev._id === data.userId) {
            return {
              ...prev,
              isOnline: data.isOnline,
              lastSeen: data.lastSeen,
            };
          }
          return prev;
        });
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (socket.current) {
      const handleIncomingMsg = (payload) => {
        const senderId = payload?.from;
        // First message from someone new: they now belong in the chat list
        if (
          senderId &&
          !contactsRef.current.some((c) => c._id === senderId)
        ) {
          refreshContacts();
        }
        if (senderId && (!currentChat || currentChat._id !== senderId)) {
          setUnreadCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      };

      const currentSocket = socket.current;
      currentSocket.on("msg-recieve", handleIncomingMsg);
      currentSocket.on("contacts-changed", refreshContacts);
      return () => {
        currentSocket.off("msg-recieve", handleIncomingMsg);
        currentSocket.off("contacts-changed", refreshContacts);
      };
    }
  }, [currentChat, refreshContacts]);

  useEffect(() => {
    const fetchContacts = async () => {
      if (currentUser) {
        if (currentUser.isAvatarImageSet) {
          const data = await axios.get(`${allUsersRoute}/${currentUser._id}`);
          setContacts(data.data);
        } else {
          navigate("/setAvatar");
        }
      }
    };
    fetchContacts();
  }, [currentUser, navigate]);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
    if (chat && currentUser) {
      setUnreadCounts((prev) => ({ ...prev, [chat._id]: 0 }));
      if (socket.current) {
        socket.current.emit("mark-messages-read", {
          from: currentUser._id,
          to: chat._id,
        });
      }
    }
  };

  const handleAddContact = async (user) => {
    if (!currentUser) return;
    const existing = contactsRef.current.find((c) => c._id === user._id);
    if (existing) {
      handleChatChange(existing);
      return;
    }
    try {
      const { data } = await axios.post(addContactRoute, {
        userId: currentUser._id,
        contactId: user._id,
      });
      if (data.status) {
        setContacts((prev) =>
          prev.some((c) => c._id === data.contact._id)
            ? prev
            : [data.contact, ...prev]
        );
        handleChatChange(data.contact);
      }
    } catch (err) { }
  };

  const handleToggleBlock = async (contact) => {
    if (!currentUser || !contact) return;
    const blocking = !contact.isBlocked;
    try {
      await axios.post(blocking ? blockRoute : unblockRoute, {
        userId: currentUser._id,
        targetId: contact._id,
      });
      const patch = (c) =>
        c._id === contact._id
          ? blocking
            ? { ...c, isBlocked: true, isOnline: false, lastSeen: null }
            : { ...c, isBlocked: false }
          : c;
      setContacts((prev) => prev.map(patch));
      setCurrentChat((prev) => (prev ? patch(prev) : prev));
      // on unblock, fetch the contact's real presence again
      if (!blocking) refreshContacts();
      if (blocking) {
        toast.success(`${contact.username} blocked`, toastOptions);
      } else {
        toast.info(`${contact.username} unblocked`, toastOptions);
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.", toastOptions);
    }
  };

  return (
    <>
      <Container>
        <div className={`container ${currentChat ? "chat-open" : ""}`}>
          <Contacts
            contacts={contacts}
            changeChat={handleChatChange}
            unreadCounts={unreadCounts}
            activeChatId={currentChat?._id}
            onAddContact={handleAddContact}
            currentUserId={currentUser?._id}
          />
          {currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer
              currentChat={currentChat}
              socket={socket}
              onBack={() => setCurrentChat(undefined)}
              onToggleBlock={handleToggleBlock}
            />
          )}
        </div>
      </Container>
      <ToastContainer />
    </>
  );
}

const Container = styled.div`
  height: 100vh;
  height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media screen and (max-width: 719px) {
    height: 100dvh;
  }

  align-items: center;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.18) 0%, transparent 45%),
              radial-gradient(circle at 85% 85%, rgba(168, 85, 247, 0.15) 0%, transparent 45%),
              #0a0d14;

  &::before {
    content: "";
    position: absolute;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
    top: -200px;
    right: -100px;
    pointer-events: none;
    animation: pulseGlow 12s ease-in-out infinite alternate;
  }

  &::after {
    content: "";
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%);
    bottom: -150px;
    left: -100px;
    pointer-events: none;
    animation: pulseGlow 14s ease-in-out infinite alternate-reverse;
  }

  @keyframes pulseGlow {
    0% { transform: scale(1) translate(0, 0); }
    100% { transform: scale(1.15) translate(30px, 20px); }
  }

  .container {
    height: 85vh;
    max-height: 850px;
    width: 88vw;
    max-width: 1350px;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.04);
    display: grid;
    grid-template-columns: 28% 72%;
    overflow: hidden;
    position: relative;
    z-index: 10;
    animation: containerAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1);

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
      height: 90vh;
      width: 94vw;
    }

    @media screen and (max-width: 719px) {
      grid-template-columns: minmax(0, 1fr);
      height: 100%;
      max-height: none;
      width: 100%;
      max-width: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
      animation: none;

      /* One pane at a time: contacts list, or the open chat */
      &.chat-open > :first-child {
        display: none;
      }
      &:not(.chat-open) > :nth-child(2) {
        display: none;
      }
    }
  }

  @keyframes containerAppear {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

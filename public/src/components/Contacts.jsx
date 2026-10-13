import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";
import { BiPlus } from "react-icons/bi";
import Logout from "./Logout";
import AddContact from "./AddContact";

export default function Contacts({
  contacts,
  changeChat,
  unreadCounts = {},
  activeChatId,
  onAddContact,
  currentUserId,
}) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [showAddContact, setShowAddContact] = useState(false);
  useEffect(() => {
    const getUserData = async () => {
      const data = await JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
      );
      if (data) {
        setCurrentUserName(data.username);
        setCurrentUserImage(data.avatarImage);
      }
    };
    getUserData();
  }, []);
  const changeCurrentChat = (contact) => {
    changeChat(contact);
  };
  return (
    <>
      {currentUserImage && (
        <Container>
          <div className="brand">
            <div className="logo-wrapper">
              <img src={Logo} alt="logo" />
            </div>
            <h3>Snappy</h3>
            <button
              type="button"
              className="add-btn"
              onClick={() => setShowAddContact(true)}
              title="New chat"
            >
              <BiPlus />
            </button>
          </div>
          <div className="contacts">
            <div className="section-label">DIRECT MESSAGES</div>
            {contacts.length === 0 && (
              <div className="empty-state">
                <p>No chats yet.</p>
                <button type="button" onClick={() => setShowAddContact(true)}>
                  Start a new chat
                </button>
              </div>
            )}
            {contacts.map((contact) => {
              const unread = unreadCounts[contact._id] || 0;
              const isSelected = contact._id === activeChatId;
              return (
                <div
                  key={contact._id}
                  className={`contact ${isSelected ? "selected" : ""}`}
                  onClick={() => changeCurrentChat(contact)}
                >
                  <div className="avatar">
                    <img
                      src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                      alt=""
                    />
                    {contact.isOnline && <span className="contact-online-dot" />}
                  </div>
                  <div className="username">
                    <h3>{contact.username}</h3>
                    {contact.isBlocked && (
                      <span className="blocked-tag">Blocked</span>
                    )}
                  </div>
                  {unread > 0 && !isSelected && (
                    <span className="unread-badge">{unread}</span>
                  )}
                  {isSelected && <span className="active-pip" />}
                </div>
              );
            })}
          </div>
          <div className="current-user">
            <div className="avatar-wrapper">
              <div className="avatar">
                <img
                  src={`data:image/svg+xml;base64,${currentUserImage}`}
                  alt="avatar"
                />
              </div>
              <span className="status-dot" />
            </div>
            <div className="username">
              <h2>{currentUserName}</h2>
              <span className="status-text">Active now</span>
            </div>
            <div className="mobile-logout">
              <Logout />
            </div>
          </div>
          {showAddContact && (
            <AddContact
              currentUserId={currentUserId}
              onClose={() => setShowAddContact(false)}
              onSelect={(user) => {
                setShowAddContact(false);
                if (onAddContact) onAddContact(user);
              }}
            />
          )}
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  height: 100%;
  max-height: 100%;
  display: grid;
  grid-template-rows: 4.5rem 1fr 4.8rem;
  overflow: hidden;
  background: rgba(11, 15, 26, 0.85);
  border-right: 1px solid rgba(255, 255, 255, 0.07);

  .brand {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    .logo-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
      border: 1px solid rgba(99, 102, 241, 0.3);

      img {
        height: 1.4rem;
      }
    }

    .add-btn {
      order: 3;
      margin-left: auto;
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(99, 102, 241, 0.18);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #c7d2fe;
      font-size: 1.35rem;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #6366f1;
        color: #fff;
      }
    }

    h3 {
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: capitalize;
    }
  }

  .contacts {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0.8rem;
    overflow-y: auto;
    gap: 0.5rem;

    .section-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 1.2px;
      padding: 0.2rem 0.6rem 0.3rem;
    }

    &::-webkit-scrollbar {
      width: 4px;
      &-thumb {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.8rem;
      padding: 2rem 1rem;
      color: #94a3b8;
      font-size: 0.9rem;
      text-align: center;

      button {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 0.6rem 1.1rem;
        font-weight: 600;
        cursor: pointer;
      }
    }

    .contact {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.04);
      cursor: pointer;
      width: 100%;
      border-radius: 12px;
      padding: 0.6rem 0.8rem;
      display: flex;
      gap: 0.85rem;
      align-items: center;
      position: relative;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(99, 102, 241, 0.25);
        transform: translateY(-1px);
      }

      .avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.6rem;
        height: 2.6rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        padding: 2px;
        flex-shrink: 0;
        position: relative;

        img {
          height: 100%;
          width: 100%;
          border-radius: 50%;
        }

        .contact-online-dot {
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
        overflow: hidden;

        .blocked-tag {
          display: block;
          font-size: 0.68rem;
          font-weight: 600;
          color: #f87171;
        }

        h3 {
          color: #e2e8f0;
          font-size: 0.9rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .unread-badge {
        margin-left: auto;
        background: #ef4444;
        color: white;
        font-size: 0.7rem;
        font-weight: 700;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.35rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.45);
        flex-shrink: 0;
      }

      .active-pip {
        margin-left: auto;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #8b5cf6;
        box-shadow: 0 0 8px #8b5cf6;
        flex-shrink: 0;
      }
    }

    .selected {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.22));
      border: 1px solid rgba(139, 92, 246, 0.45);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.15);

      .username h3 {
        color: #ffffff;
        font-weight: 700;
      }
    }
  }

  .current-user {
    height: 100%;
    background: rgba(7, 10, 19, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    padding: 0 1.2rem;
    gap: 0.9rem;

    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;

      .avatar {
        width: 2.8rem;
        height: 2.8rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        padding: 2px;

        img {
          height: 100%;
          width: 100%;
          border-radius: 50%;
        }
      }

      .status-dot {
        position: absolute;
        bottom: 1px;
        right: 1px;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background-color: #10b981;
        border: 2px solid #070a13;
        box-shadow: 0 0 8px #10b981;
      }
    }

    .username {
      overflow: hidden;

      h2 {
        color: #f8fafc;
        font-size: 0.92rem;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status-text {
        font-size: 0.72rem;
        color: #10b981;
        font-weight: 500;
        display: block;
      }
    }

    .mobile-logout {
      display: none;
      margin-left: auto;
    }

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.6rem;
      padding: 0 0.8rem;
    }

    @media screen and (max-width: 719px) {
      padding: 0 1rem;

      .mobile-logout {
        display: flex;
      }
    }
  }

  @media screen and (max-width: 719px) {
    .brand {
      padding: 0 1rem;
    }

    .contacts .contact {
      padding: 0.75rem 0.85rem;
    }
  }
`;

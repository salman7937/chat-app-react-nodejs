import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import styled from "styled-components";
import { IoMdClose } from "react-icons/io";
import { BiSearch } from "react-icons/bi";
import { searchUsersRoute } from "../utils/APIRoutes";

const MIN_QUERY_LENGTH = 3;

export default function AddContact({ currentUserId, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(searchUsersRoute, {
          params: { q: trimmed, userId: currentUserId },
        });
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, canSearch, currentUserId]);

  return createPortal(
    <Overlay onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New chat</h3>
          <button type="button" className="close-btn" onClick={onClose}>
            <IoMdClose />
          </button>
        </div>

        <div className="search-box">
          <BiSearch />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="results">
          {!canSearch && (
            <p className="hint">
              Type at least {MIN_QUERY_LENGTH} characters to find someone.
            </p>
          )}
          {canSearch && loading && <p className="hint">Searching...</p>}
          {canSearch && !loading && results.length === 0 && (
            <p className="hint">No users found.</p>
          )}
          {results.map((user) => (
            <div
              key={user._id}
              className="result"
              onClick={() => onSelect(user)}
            >
              <div className="avatar">
                <img
                  src={`data:image/svg+xml;base64,${user.avatarImage}`}
                  alt=""
                />
              </div>
              <span className="name">{user.username}</span>
              <span className="action">
                {user.alreadyContact ? "Open chat" : "Message"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Overlay>,
    document.body
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(2, 6, 23, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: overlayFade 0.2s ease;

  .modal {
    width: 100%;
    max-width: 420px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    background: rgba(15, 23, 42, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.25rem 0.6rem;

    h3 {
      color: #f8fafc;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #cbd5e1;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.1rem;

      &:hover {
        background: rgba(239, 68, 68, 0.7);
        color: #fff;
      }
    }
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0.4rem 1.25rem 0.8rem;
    padding: 0 0.9rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);

    svg {
      color: #94a3b8;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    &:focus-within {
      border-color: rgba(99, 102, 241, 0.6);
    }

    input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 0.95rem;
      padding: 0.8rem 0;

      &:focus {
        outline: none;
      }

      &::placeholder {
        color: #64748b;
      }
    }
  }

  .results {
    padding: 0 0.75rem 1rem;
    overflow-y: auto;
    min-height: 6rem;

    .hint {
      color: #94a3b8;
      font-size: 0.88rem;
      text-align: center;
      padding: 1.5rem 1rem;
    }

    .result {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.6rem 0.7rem;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.07);
      }

      .avatar {
        width: 2.6rem;
        height: 2.6rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        padding: 2px;
        flex-shrink: 0;

        img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
      }

      .name {
        flex: 1;
        min-width: 0;
        color: #e2e8f0;
        font-weight: 600;
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .action {
        color: #a78bfa;
        font-size: 0.8rem;
        font-weight: 600;
        flex-shrink: 0;
      }
    }
  }

  @media screen and (max-width: 719px) {
    padding: 0;
    align-items: stretch;

    .modal {
      max-width: none;
      max-height: none;
      border-radius: 0;
      border: none;
    }

    .search-box input {
      /* 16px stops iOS from zooming on focus */
      font-size: 16px;
    }

    .results {
      flex: 1;
    }
  }

  @keyframes overlayFade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

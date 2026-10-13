import React, { useState, useRef, useEffect } from "react";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoMdSend, IoMdClose } from "react-icons/io";
import { BiImage, BiMicrophone } from "react-icons/bi";
import styled from "styled-components";
import Picker from "emoji-picker-react";

export default function ChatInput({ handleSendMsg, socket, currentChat }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleEmojiPickerhideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (event, emojiObject) => {
    let message = msg;
    message += emojiObject.emoji;
    setMsg(message);
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setMsg(text);

    if (socket?.current && currentChat) {
      const user = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
      );
      if (user?._id) {
        socket.current.emit("typing", {
          to: currentChat._id,
          from: user._id,
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.current.emit("stop-typing", {
            to: currentChat._id,
            from: user._id,
          });
        }, 1500);
      }
    }
  };

  // Image Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          handleSendMsg("", "audio", base64Audio);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.log("Mic access error:", err);
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (!shouldSend) {
        mediaRecorderRef.current.onstop = () => {
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream
              .getTracks()
              .forEach((track) => track.stop());
          }
        };
      }
      mediaRecorderRef.current.stop();
    }
  };

  const sendChat = (event) => {
    event.preventDefault();
    if (msg.trim().length > 0 || selectedImage) {
      if (socket?.current && currentChat) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        const user = JSON.parse(
          localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
        );
        if (user?._id) {
          socket.current.emit("stop-typing", {
            to: currentChat._id,
            from: user._id,
          });
        }
      }

      if (selectedImage) {
        handleSendMsg(msg, "image", selectedImage);
        setSelectedImage(null);
        setMsg("");
      } else {
        handleSendMsg(msg, "text", "");
        setMsg("");
      }
    }
  };

  return (
    <Container>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Selected Image Thumbnail Bar */}
      {selectedImage && (
        <ImagePreviewBar>
          <div className="preview-box">
            <img src={selectedImage} alt="selected" />
            <button
              type="button"
              className="remove-btn"
              onClick={() => setSelectedImage(null)}
            >
              <IoMdClose />
            </button>
          </div>
          <span className="caption-hint">Image attached</span>
        </ImagePreviewBar>
      )}

      {isRecording ? (
        <RecordingBar>
          <div className="recording-status">
            <span className="rec-dot" />
            <span className="rec-text">
              Recording 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
            </span>
          </div>
          <div className="recording-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => stopRecording(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="send-rec-btn"
              onClick={() => stopRecording(true)}
            >
              Send Voice
            </button>
          </div>
        </RecordingBar>
      ) : (
        <>
          <div className="button-container">
            <div className="emoji">
              <button
                type="button"
                className="action-icon-btn emoji-btn"
                onClick={handleEmojiPickerhideShow}
                title="Emojis"
              >
                <BsEmojiSmileFill />
              </button>
              {showEmojiPicker && <Picker onEmojiClick={handleEmojiClick} />}
            </div>

            <button
              type="button"
              className="action-icon-btn image-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Image"
            >
              <BiImage />
            </button>

            <button
              type="button"
              className="action-icon-btn mic-btn"
              onClick={startRecording}
              title="Record Voice Note"
            >
              <BiMicrophone />
            </button>
          </div>

          <form className="input-container" onSubmit={(event) => sendChat(event)}>
            <input
              type="text"
              placeholder={
                selectedImage ? "Add a caption..." : "Type your message here..."
              }
              onChange={handleInputChange}
              value={msg}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!msg.trim() && !selectedImage}
            >
              <IoMdSend />
            </button>
          </form>
        </>
      )}
    </Container>
  );
}

const ImagePreviewBar = styled.div`
  position: absolute;
  top: -70px;
  left: 1.8rem;

  @media screen and (max-width: 480px) {
    left: 0.8rem;
  }

  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0.35rem 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  animation: slideUpPreview 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 20;

  .preview-box {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 10px;

      &:hover {
        background: #ef4444;
      }
    }
  }

  .caption-hint {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 500;
  }

  @keyframes slideUpPreview {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const RecordingBar = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 9999px;
  padding: 0.4rem 0.8rem 0.4rem 1.4rem;
  animation: recPulse 0.3s ease;

  @media screen and (max-width: 480px) {
    padding: 0.35rem 0.5rem 0.35rem 0.9rem;
    min-width: 0;
  }

  .recording-status {
    display: flex;
    align-items: center;
    gap: 0.6rem;

    .rec-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 10px #ef4444;
      animation: blinkRec 1s infinite alternate;
    }

    .rec-text {
      color: #f87171;
      font-weight: 600;
      font-size: 0.9rem;
    }
  }

  .recording-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;

    .cancel-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.85rem;
      cursor: pointer;
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
      transition: color 0.2s ease;

      &:hover {
        color: #f8fafc;
      }
    }

    .send-rec-btn {
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 9999px;
      padding: 0.35rem 0.9rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      transition: transform 0.2s ease;

      &:hover {
        transform: scale(1.04);
      }
    }
  }

  @keyframes blinkRec {
    0% { opacity: 0.4; }
    100% { opacity: 1; }
  }
`;

const Container = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(11, 15, 26, 0.7);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 1.8rem;
  position: relative;

  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0 1rem;
    gap: 0.5rem;
  }

  @media screen and (max-width: 480px) {
    padding: 0 0.6rem;
    gap: 0.3rem;

    .button-container {
      gap: 0;

      .action-icon-btn {
        padding: 0.35rem;
      }

      .emoji .emoji-picker-react {
        width: calc(100vw - 1.2rem) !important;
        max-width: 350px;
      }
    }

    .input-container {
      min-width: 0;
      padding-left: 0.9rem;

      input {
        min-width: 0;
        /* 16px stops iOS from zooming on focus */
        font-size: 16px;
      }
    }
  }

  .button-container {
    display: flex;
    align-items: center;
    gap: 0.35rem;

    .action-icon-btn {
      background: transparent;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0.4rem;
      border-radius: 50%;
      transition: all 0.2s ease;

      svg {
        font-size: 1.35rem;
        color: #94a3b8;
        transition: transform 0.2s ease, color 0.2s ease;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        svg {
          transform: scale(1.15);
          color: #f8fafc;
        }
      }

      &.emoji-btn svg {
        color: #fbbf24;
      }

      &.image-btn:hover svg {
        color: #818cf8;
      }

      &.mic-btn:hover svg {
        color: #f87171;
      }
    }

    .emoji {
      position: relative;

      .emoji-picker-react {
        position: absolute;
        top: -350px;
        left: 0;
        background-color: #0b0f1a;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        z-index: 50;

        .emoji-scroll-wrapper::-webkit-scrollbar {
          background-color: #0b0f1a;
          width: 5px;
          &-thumb {
            background-color: #6366f1;
            border-radius: 10px;
          }
        }
        .emoji-categories {
          button {
            filter: contrast(0);
          }
        }
        .emoji-search {
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f8fafc;
          border-radius: 8px;
        }
        .emoji-group:before {
          background-color: #0b0f1a;
          color: #94a3b8;
        }
      }
    }
  }

  .input-container {
    flex: 1;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.3rem 0.45rem 0.3rem 1.25rem;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    &:focus-within {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 18px rgba(99, 102, 241, 0.2);
    }

    input {
      flex: 1;
      background: transparent;
      color: #f8fafc;
      border: none;
      font-size: 0.95rem;
      letter-spacing: -0.01em;

      &::placeholder {
        color: #64748b;
      }

      &::selection {
        background-color: #6366f1;
      }

      &:focus {
        outline: none;
      }
    }

    .send-btn {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;

      svg {
        font-size: 1.2rem;
        color: white;
        margin-left: 2px;
        transition: transform 0.2s ease;
      }

      &:hover:not(:disabled) {
        transform: scale(1.06);
        box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
        svg {
          transform: translateX(1px);
        }
      }

      &:active:not(:disabled) {
        transform: scale(0.96);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        box-shadow: none;
      }
    }
  }
`;

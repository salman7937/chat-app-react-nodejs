import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import loader from "../assets/loader.gif";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { setAvatarRoute } from "../utils/APIRoutes";
import multiavatar from "@multiavatar/multiavatar/esm";

export default function SetAvatar() {
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(undefined);

  const toastOptions = {
    position: "bottom-right",
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };

  useEffect(() => {
    const user = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
    if (!user) navigate("/login");
  }, [navigate]);

  const generateRandomName = () => Math.random().toString(36).substring(2, 10);

  useEffect(() => {
    const generateAvatars = () => {
      const data = [];
      for (let i = 0; i < 4; i++) {
        const randomName = generateRandomName();
        const svgCode = multiavatar(randomName);
        const encoded = btoa(unescape(encodeURIComponent(svgCode)));
        data.push(encoded);
      }
      setAvatars(data);
      setIsLoading(false);
    };

    generateAvatars();
  }, []);

  const setProfilePicture = async () => {
    if (selectedAvatar === undefined) {
      toast.error("Please select an avatar", toastOptions);
      return;
    }

    const user = await JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    );

    const { data } = await axios.post(`${setAvatarRoute}/${user._id}`, {
      image: avatars[selectedAvatar],
    });

    if (data.isSet) {
      user.isAvatarImageSet = true;
      user.avatarImage = data.image;
      localStorage.setItem(
        process.env.REACT_APP_LOCALHOST_KEY,
        JSON.stringify(user)
      );
      navigate("/");
    } else {
      toast.error("Error setting avatar. Please try again.", toastOptions);
    }
  };

  return (
    <>
      {isLoading ? (
        <Container>
          <img src={loader} alt="loader" className="loader" />
        </Container>
      ) : (
        <Container>
          <div className="card">
            <div className="title-container">
              <h1>Pick an Avatar</h1>
              <p>Choose an avatar to personalize your chat experience</p>
            </div>
            <div className="avatars">
              {avatars.map((avatar, index) => (
                <div
                  key={index}
                  className={`avatar ${
                    selectedAvatar === index ? "selected" : ""
                  }`}
                  onClick={() => setSelectedAvatar(index)}
                >
                  <img
                    src={`data:image/svg+xml;base64,${avatar}`}
                    alt={`avatar-${index}`}
                  />
                </div>
              ))}
            </div>
            <button onClick={setProfilePicture} className="submit-btn">
              Set as Profile Picture
            </button>
          </div>
          <ToastContainer />
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
              radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.12) 0%, transparent 40%),
              #0a0d14;
  height: 100vh;
  width: 100vw;

  .loader {
    max-inline-size: 100%;
    filter: drop-shadow(0 10px 20px rgba(99, 102, 241, 0.3));
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 3.5rem 4rem;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
    animation: cardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes cardAppear {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .title-container {
    text-align: center;
    h1 {
      color: #f8fafc;
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    p {
      color: #94a3b8;
      font-size: 0.9rem;
      margin-top: 0.4rem;
    }
  }

  .avatars {
    display: flex;
    gap: 1.5rem;

    .avatar {
      border: 3px solid transparent;
      padding: 0.5rem;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.03);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      img {
        height: 5.5rem;
        width: 5.5rem;
        border-radius: 50%;
        transition: transform 0.25s ease;
      }

      &:hover {
        transform: translateY(-4px) scale(1.05);
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(99, 102, 241, 0.4);
      }
    }

    .selected {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.15);
      box-shadow: 0 0 25px rgba(139, 92, 246, 0.45);
      transform: translateY(-4px) scale(1.08);
    }
  }

  .submit-btn {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 0.95rem 2.2rem;
    border: none;
    font-weight: 700;
    cursor: pointer;
    border-radius: 12px;
    font-size: 0.95rem;
    letter-spacing: 0.5px;
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(99, 102, 241, 0.5);
    }

    &:active {
      transform: translateY(0);
    }
  }
`;

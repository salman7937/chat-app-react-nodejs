import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Robot from "../assets/robot.gif";

export default function Welcome() {
  const [userName, setUserName] = useState("");
  useEffect(() => {
    const getUser = async () => {
      const data = await JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
      );
      if (data) setUserName(data.username);
    };
    getUser();
  }, []);

  return (
    <Container>
      <div className="robot-wrapper">
        <img src={Robot} alt="" />
      </div>
      <h1>
        Welcome, <span>{userName}!</span>
      </h1>
      <h3>Select a conversation from the sidebar to start messaging.</h3>
    </Container>
  );
}

const Container = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  flex-direction: column;
  padding: 2rem;
  text-align: center;

  .robot-wrapper {
    animation: float 4s ease-in-out infinite;
    img {
      height: 18rem;
      filter: drop-shadow(0 15px 25px rgba(99, 102, 241, 0.25));
    }
  }

  h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-top: 1rem;
  }

  span {
    background: linear-gradient(135deg, #818cf8, #c084fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  h3 {
    color: #94a3b8;
    font-weight: 400;
    font-size: 1.05rem;
    margin-top: 0.5rem;
    max-width: 400px;
  }

  @media screen and (max-width: 480px) {
    padding: 1.25rem;

    .robot-wrapper img {
      height: 12rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    h3 {
      font-size: 0.95rem;
    }
  }

  @keyframes float {
    0% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-12px);
    }
    100% {
      transform: translateY(0px);
    }
  }
`;

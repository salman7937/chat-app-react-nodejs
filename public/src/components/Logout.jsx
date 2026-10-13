import React from "react";
import { useNavigate } from "react-router-dom";
import { BiPowerOff } from "react-icons/bi";
import styled from "styled-components";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";

export default function Logout() {
  const navigate = useNavigate();
  const handleClick = async () => {
    const id = await JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    )._id;
    const data = await axios.get(`${logoutRoute}/${id}`);
    if (data.status === 200) {
      localStorage.clear();
      navigate("/login");
    }
  };
  return (
    <Button onClick={handleClick} title="Sign Out">
      <BiPowerOff />
    </Button>
  );
}

const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    font-size: 1.25rem;
    color: #f87171;
    transition: transform 0.2s ease, color 0.2s ease;
  }

  &:hover {
    background: #ef4444;
    border-color: #ef4444;
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
    transform: translateY(-2px);

    svg {
      color: #ffffff;
      transform: scale(1.1);
    }
  }

  &:active {
    transform: translateY(0) scale(0.95);
  }
`;

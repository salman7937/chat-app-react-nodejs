import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../assets/logo.svg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { registerRoute } from "../utils/APIRoutes";

export default function Register() {
  const navigate = useNavigate();
  const toastOptions = {
    position: "bottom-right",
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };
  const [values, setValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)) {
      navigate("/");
    }
  }, []);

  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  const handleValidation = () => {
    const { password, confirmPassword, username, email } = values;
    if (password !== confirmPassword) {
      toast.error(
        "Password and confirm password should be same.",
        toastOptions
      );
      return false;
    } else if (username.length < 3) {
      toast.error(
        "Username should be greater than 3 characters.",
        toastOptions
      );
      return false;
    } else if (password.length < 8) {
      toast.error(
        "Password should be equal or greater than 8 characters.",
        toastOptions
      );
      return false;
    } else if (email === "") {
      toast.error("Email is required.", toastOptions);
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (handleValidation()) {
      const { email, username, password } = values;
      const { data } = await axios.post(registerRoute, {
        username,
        email,
        password,
      });

      if (data.status === false) {
        toast.error(data.msg, toastOptions);
      }
      if (data.status === true) {
        localStorage.setItem(
          process.env.REACT_APP_LOCALHOST_KEY,
          JSON.stringify(data.user)
        );
        navigate("/");
      }
    }
  };

  return (
    <>
      <FormContainer>
        <form onSubmit={(event) => handleSubmit(event)}>
          <div className="brand">
            <div className="logo-box">
              <img src={Logo} alt="logo" />
            </div>
            <h1>Snappy</h1>
            <p className="subtitle">Create an account to get started</p>
          </div>
          <div className="input-group">
            <input
              type="text"
              placeholder="Username"
              name="username"
              onChange={(e) => handleChange(e)}
            />
          </div>
          <div className="input-group">
            <input
              type="email"
              placeholder="Email address"
              name="email"
              onChange={(e) => handleChange(e)}
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              name="password"
              onChange={(e) => handleChange(e)}
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Confirm Password"
              name="confirmPassword"
              onChange={(e) => handleChange(e)}
            />
          </div>
          <button type="submit">Create Account</button>
          <span>
            Already have an account? <Link to="/login">Sign In</Link>
          </span>
        </form>
      </FormContainer>
      <ToastContainer />
    </>
  );
}

const FormContainer = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
              radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.12) 0%, transparent 40%),
              #0a0d14;

  &::before {
    content: "";
    position: absolute;
    width: 450px;
    height: 450px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
    top: 5%;
    right: 15%;
    pointer-events: none;
    animation: orbFloat 10s ease-in-out infinite alternate;
  }

  @keyframes orbFloat {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(30px, 20px) scale(1.1); }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 2.5rem 3rem;
    width: 90%;
    max-width: 440px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.04);
    animation: formFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    z-index: 10;
  }

  @keyframes formFadeIn {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.3rem;

    .logo-box {
      width: 4rem;
      height: 4rem;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
      border: 1px solid rgba(99, 102, 241, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.2);
      margin-bottom: 0.2rem;

      img {
        height: 2.3rem;
      }
    }

    h1 {
      color: #f8fafc;
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      text-transform: capitalize;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 400;
    }
  }

  .input-group {
    width: 100%;
  }

  input {
    background: rgba(255, 255, 255, 0.03);
    padding: 0.85rem 1.1rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 12px;
    color: #f8fafc;
    width: 100%;
    font-size: 0.95rem;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    &::placeholder {
      color: #64748b;
    }

    &:focus {
      background: rgba(255, 255, 255, 0.06);
      border-color: #6366f1;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.25);
      outline: none;
    }
  }

  button {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 0.85rem 1.5rem;
    border: none;
    font-weight: 700;
    cursor: pointer;
    border-radius: 12px;
    font-size: 0.95rem;
    letter-spacing: 0.5px;
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    margin-top: 0.4rem;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(99, 102, 241, 0.5);
    }

    &:active {
      transform: translateY(0);
    }
  }

  span {
    color: #94a3b8;
    font-size: 0.88rem;
    text-align: center;
    margin-top: 0.2rem;

    a {
      color: #818cf8;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s ease;

      &:hover {
        color: #a78bfa;
        text-decoration: underline;
      }
    }
  }
`;

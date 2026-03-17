import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "https://esm.sh/jwt-decode@4.0.0";
import { FaBars, FaTimes } from "react-icons/fa";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setIsOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try { setUser(jwtDecode(token)); } catch { setUser(null); }
    } else {
      setUser(null);
    }
    // Close mobile menu on route change
    setIsOpen(false);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const navStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    boxSizing: 'border-box',
    zIndex: 1000,
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    height: "70px"
  };

  const logoStyle = {
    fontSize: "1.5em",
    fontWeight: "bold",
    color: "#7f53ac",
    textDecoration: 'none',
    zIndex: 1001
  };

  const linkStyle = {
    color: "#a0a0a0",
    fontWeight: "500",
    fontSize: "1em",
    padding: "10px 16px",
    textDecoration: "none",
    transition: "color 0.3s ease",
    display: "block"
  };

  const mobileMenuStyle = {
    display: isOpen ? "flex" : "none",
    flexDirection: "column",
    position: "absolute",
    top: "70px",
    left: 0,
    width: "100%",
    backgroundColor: "rgba(20, 10, 40, 0.95)",
    backdropFilter: "blur(15px)",
    padding: "20px 0",
    boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
  };

  const desktopMenuContainer = {
    display: "flex",
    alignItems: "center",
    gap: "20px"
  };

  const signupButtonStyle = {
    background: 'linear-gradient(90deg, #7f53ac, #56b6c2)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.9em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: "all 0.3s ease"
  };

  const toggleButtonStyle = {
    background: "none",
    border: "none",
    color: "#ccc",
    fontSize: "1.5em",
    cursor: "pointer",
    display: isMobile ? "block" : "none"
  };

  const NavLinks = () => (
    <>
      <Link to="/" style={linkStyle}>HOME</Link>
      <Link to="/create-join" style={linkStyle}>WORKSPACE</Link>
      <Link to="/features" style={linkStyle}>FEATURES</Link>
      <Link to="/about" style={linkStyle}>ABOUT</Link>
    </>
  );

  const AuthButtons = () => (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "15px", alignItems: "center", padding: isMobile ? "10px 0" : "0" }}>
      {user ? (
        <>
          <span style={{ color: '#ccc' }}>Hello, {user.name || "User"}</span>
          <button style={signupButtonStyle} onClick={handleLogout}>LOGOUT</button>
        </>
      ) : (
        <>
          <Link to="/login" style={linkStyle}>LOGIN</Link>
          <Link to="/signup">
            <button style={signupButtonStyle}>SIGN UP</button>
          </Link>
        </>
      )}
    </div>
  );

  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}>Code<span style={{ color: "#56b6c2" }}>Collab</span></Link>

      <button style={toggleButtonStyle} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Desktop Menu */}
      {!isMobile && (
        <div style={desktopMenuContainer}>
          <div style={{ display: "flex" }}>
            <NavLinks />
          </div>
          <AuthButtons />
        </div>
      )}

      {/* Mobile Menu */}
      {isMobile && isOpen && (
        <div style={mobileMenuStyle}>
          <NavLinks />
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "10px 0" }}></div>
          <AuthButtons />
        </div>
      )}
    </nav>
  );
};

export default Navbar;

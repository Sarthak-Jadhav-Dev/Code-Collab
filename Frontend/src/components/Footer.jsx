import React from "react";
import { Link } from "react-router-dom";

const footerStyle = {
  background: "rgba(0, 0, 0, 0.3)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  color: "#ccc",
  textAlign: "center",
  padding: "40px 20px",
  fontSize: "0.95em",
  position: "relative",
  width: "100%",
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  marginTop: "auto"
};

const containerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "20px"
};

const linksContainerStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "30px",
  flexWrap: "wrap"
};

const linkStyle = {
  color: "#a0a0a0",
  textDecoration: "none",
  fontWeight: "500",
  transition: "color 0.3s ease"
};

const socialLinksStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "20px",
  fontSize: "1.2em"
};

const socialLinkStyle = {
  color: "#56b6c2",
  textDecoration: "none",
  transition: "all 0.3s ease"
};

const copyrightStyle = {
  color: "#888",
  fontSize: "0.9em",
  marginTop: "10px"
};

const Footer = () => (
  <footer style={footerStyle}>
    <div style={containerStyle}>
      <div style={linksContainerStyle}>
        <Link
          to="/"
          style={linkStyle}
          onMouseEnter={(e) => e.currentTarget.style.color = '#56b6c2'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#a0a0a0'}
        >
          Home
        </Link>
        <Link
          to="/create-join"
          style={linkStyle}
          onMouseEnter={(e) => e.currentTarget.style.color = '#56b6c2'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#a0a0a0'}
        >
          Workspace
        </Link>
        <Link
          to="/features"
          style={linkStyle}
          onMouseEnter={(e) => e.currentTarget.style.color = '#56b6c2'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#a0a0a0'}
        >
          Features
        </Link>
        <Link
          to="/about"
          style={linkStyle}
          onMouseEnter={(e) => e.currentTarget.style.color = '#56b6c2'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#a0a0a0'}
        >
          About
        </Link>
      </div>

      <div style={socialLinksStyle}>
        <a
          href="https://github.com/Sarthak-Jadhav-Dev/EDIProject"
          target="_blank"
          rel="noopener noreferrer"
          style={socialLinkStyle}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          GitHub
        </a>
        <a
          href="https://twitter.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={socialLinkStyle}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Twitter
        </a>
        <a
          href="mailto:contact@aicollab.com"
          style={socialLinkStyle}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Email
        </a>
      </div>

      <div style={copyrightStyle}>
        © {new Date().getFullYear()} CodeCollab. Built with ❤️ for developers.
      </div>
    </div>
  </footer>
);

export default Footer;
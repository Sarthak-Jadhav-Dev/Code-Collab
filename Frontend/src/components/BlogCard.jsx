import React from "react";

const BlogCard = ({ title, date, summary, link }) => (
  <div
    style={{
      background: "rgba(34,34,54,0.7)",
      borderRadius: "18px",
      boxShadow: "0 0 16px #56b6c288",
      color: "#fff",
      padding: "24px",
      margin: "24px",
      minWidth: "260px",
      maxWidth: "340px",
      display: "inline-block",
      verticalAlign: "top",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer"
    }}
    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
  >
    <div style={{ fontWeight: "bold", fontSize: "1.2em", marginBottom: "0.3em" }}>{title}</div>
    <div style={{ color: "#56b6c2", fontSize: "0.95em", marginBottom: "0.7em" }}>{date}</div>
    <div style={{ fontSize: "1em", marginBottom: "1em", opacity: 0.85 }}>{summary}</div>
    <a href={link} style={{ color: "#7f53ac", fontWeight: "bold", textDecoration: "underline" }}>Read More</a>
  </div>
);

export default BlogCard;
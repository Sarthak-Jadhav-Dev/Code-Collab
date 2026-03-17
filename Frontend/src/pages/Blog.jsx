import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlogCard from "../components/BlogCard";

const posts = [
  {
    title: "🚀 Launching AI Collab: The Future of Team Coding",
    date: "2025-08-01",
    summary: "We’re excited to announce the launch of our real-time collaborative coding platform with AI teammate support!",
    link: "#"
  },
  {
    title: "🤖 Meet Your AI Teammate",
    date: "2025-08-10",
    summary: "Discover how our AI assistant can debug, suggest, and explain code as you work together.",
    link: "#"
  },
  {
    title: "✨ New: Audio & Video Collaboration",
    date: "2025-08-20",
    summary: "Now you can talk and share screens while coding together in real time.",
    link: "#"
  },
  {
    title: "🧠 AI Summaries Now Live!",
    date: "2025-09-01",
    summary: "Our AI can now generate smart summaries for your team’s code sessions.",
    link: "#"
  }
];

const Blog = () => (
  <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #2b1055 0%, #7597de 100%)" }}>
    <Navbar />
    <div style={{ paddingTop: "80px", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5em", color: "#56b6c2", marginBottom: "0.5em" }}>Blog & Updates</h1>
      <div>
        {posts.map((post, idx) => (
          <BlogCard key={idx} {...post} />
        ))}
      </div>
    </div>
    <Footer />
  </div>
);

export default Blog;
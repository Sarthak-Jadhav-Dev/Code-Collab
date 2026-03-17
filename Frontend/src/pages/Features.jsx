import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FeaturesSlideshow from "../components/FeaturesSlideshow";

const Features = () => (
  <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #2b1055 0%, #7597de 100%)" }}>
    <Navbar />
    <div style={{ paddingTop: "80px", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5em", color: "#56b6c2", marginBottom: "0.5em" }}>Features</h1>
      <FeaturesSlideshow />
    </div>
    <Footer />
  </div>
);

export default Features;
import React from "react";
import AnimatedHero, { FeaturesSection, StatsSection, TestimonialsSection, CTASection } from "../components/AnimatedHero";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Home = () => (
  <div style={{ minHeight: "100vh", background: "#000", paddingTop: "70px" }}>
    <Navbar />
    <AnimatedHero />
    <FeaturesSection />
    <StatsSection />
    <TestimonialsSection />
    <CTASection />
    <Footer />
  </div>
);

export default Home;
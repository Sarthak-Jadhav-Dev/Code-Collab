import React from "react";

const plans = [
  {
    name: "Free",
    price: "$0",
    desc: "Basic collaboration, limited AI support.",
    features: ["Real-time editing", "Basic AI suggestions", "Up to 3 users"],
    color: "#56b6c2"
  },
  {
    name: "Pro",
    price: "$12",
    desc: "Full AI teammate, unlimited team size.",
    features: ["Advanced AI", "Unlimited users", "Priority support", "Smart summaries"],
    color: "#7f53ac"
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Private servers, custom integrations.",
    features: ["Dedicated server", "Custom AI", "Enterprise support", "Integrations"],
    color: "#7597de"
  }
];

const cardStyle = {
  background: "rgba(34,34,54,0.7)",
  borderRadius: "24px",
  boxShadow: "0 8px 32px #2b105588",
  color: "#fff",
  padding: "32px 24px",
  margin: "24px",
  minWidth: "260px",
  maxWidth: "320px",
  display: "inline-block",
  verticalAlign: "top",
  transition: "transform 0.2s, box-shadow 0.2s",
  cursor: "pointer"
};

const PricingCards = () => (
  <div>
    {plans.map((plan, idx) => (
      <div
        key={plan.name}
        style={{
          ...cardStyle,
          border: `2px solid ${plan.color}`,
          boxShadow: `0 0 24px ${plan.color}88`,
          transform: "scale(1)",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.07)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <div style={{ fontSize: "2em", fontWeight: "bold", color: plan.color, marginBottom: "0.2em" }}>
          {plan.name}
        </div>
        <div style={{ fontSize: "2em", marginBottom: "0.2em" }}>{plan.price}</div>
        <div style={{ fontSize: "1.1em", marginBottom: "0.7em", opacity: 0.85 }}>{plan.desc}</div>
        <ul style={{ listStyle: "none", padding: 0, marginBottom: "1em" }}>
          {plan.features.map((f, i) => (
            <li key={i} style={{ marginBottom: "0.3em", fontSize: "1em" }}>• {f}</li>
          ))}
        </ul>
        {plan.name === "Free" && (
          <button style={{
            background: plan.color,
            color: "#fff",
            border: "none",
            borderRadius: "16px",
            padding: "12px 32px",
            fontWeight: "bold",
            fontSize: "1.1em",
            boxShadow: `0 0 12px ${plan.color}88`,
            cursor: "pointer",
            marginTop: "12px",
            transition: "box-shadow 0.2s"
          }}>
            Get Started Free
          </button>
        )}
        {plan.name === "Pro" && (
          <button style={{
            background: plan.color,
            color: "#fff",
            border: "none",
            borderRadius: "16px",
            padding: "12px 32px",
            fontWeight: "bold",
            fontSize: "1.1em",
            boxShadow: `0 0 12px ${plan.color}88`,
            cursor: "pointer",
            marginTop: "12px",
            transition: "box-shadow 0.2s"
          }}>
            Upgrade to Pro
          </button>
        )}
        {plan.name === "Enterprise" && (
          <button style={{
            background: plan.color,
            color: "#fff",
            border: "none",
            borderRadius: "16px",
            padding: "12px 32px",
            fontWeight: "bold",
            fontSize: "1.1em",
            boxShadow: `0 0 12px ${plan.color}88`,
            cursor: "pointer",
            marginTop: "12px",
            transition: "box-shadow 0.2s"
          }}>
            Contact Sales
          </button>
        )}
      </div>
    ))}
  </div>
);

export default PricingCards;
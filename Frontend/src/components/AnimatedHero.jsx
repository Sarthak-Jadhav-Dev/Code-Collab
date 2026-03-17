import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// Using a stable CDN import for jwt-decode.
import { jwtDecode } from "https://esm.sh/jwt-decode@4.0.0";



// --- Loading Screen Component ---
// This is the initial loading animation.
const LoadingScreen = ({ isExiting, onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onLoadingComplete, 500);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [onLoadingComplete]);

  const loadingScreenStyle = {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    height: '100vh', width: '100vw', backgroundColor: '#000000', color: 'white',
    position: 'fixed', top: 0, left: 0, zIndex: 9999,
    transition: 'opacity 0.5s ease-out',
    opacity: isExiting ? 0 : 1,
  };
  const textContainerStyle = {
    position: 'relative', fontFamily: "'Monument Extended', 'Arial Black', sans-serif",
    fontSize: 'clamp(3rem, 12vw, 8rem)', fontWeight: '800', letterSpacing: '2px',
  };
  const textBaseStyle = { display: 'block' };
  const backgroundTextStyle = { ...textBaseStyle, color: '#333' };
  const foregroundTextStyle = {
    ...textBaseStyle, color: '#ffffff', position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%', clipPath: `inset(${100 - progress}% 0 0 0)`,
    transition: 'clip-path 0.1s linear',
  };
  const percentageStyle = {
    marginTop: '20px', fontFamily: "'Fira Mono', monospace", fontSize: '1rem',
    color: '#888', letterSpacing: '1px',
  };

  return (
    <div style={loadingScreenStyle}>
      <div style={textContainerStyle}>
        <span style={backgroundTextStyle}>INSPECTRA</span>
        <span style={foregroundTextStyle}>INSPECTRA</span>
      </div>
      <div style={percentageStyle}>loading... {progress}%</div>
    </div>
  );
};

// --- Navbar Component ---
const HeroNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try { setUser(jwtDecode(token)); } catch { setUser(null); }
    } else {
      setUser(null);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const navStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 48px", backgroundColor: "transparent", position: "absolute", top: 0, left: 0, width: "100%", boxSizing: 'border-box', zIndex: 100 };
  const logoStyle = { fontSize: "1.5em", fontWeight: "bold", color: "#7f53ac", textDecoration: 'none' };
  const linkStyle = { color: "#a0a0a0", fontWeight: "500", fontSize: "0.9em", padding: "8px 16px", textDecoration: "none" };
  const authContainerStyle = { display: 'flex', alignItems: 'center', gap: '20px' };
  const loginButtonStyle = { color: '#a0a0a0', textDecoration: 'none', fontWeight: '500', fontSize: '0.9em' };
  const signupButtonStyle = { backgroundColor: '#f0f0f0', color: '#111', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '0.9em', fontWeight: 'bold', cursor: 'pointer' };

  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}><span style={{ color: "#56b6c2" }}>AI</span>Collab</Link>
      <div>
        <Link to="/" style={linkStyle}>HOME</Link>
        <Link to="/features" style={linkStyle}>FEATURES</Link>
        <Link to="/pricing" style={linkStyle}>PRICING</Link>
        <Link to="/about" style={linkStyle}>ABOUT</Link>
        <Link to="/blog" style={linkStyle}>BLOG</Link>
      </div>
      <div style={authContainerStyle}>
        {user ? (<> <span style={{ color: '#ccc' }}>Hello, {user.name || "User"}</span> <button style={signupButtonStyle} onClick={handleLogout}>LOGOUT</button> </>)
          : (<> <Link to="/login" style={loginButtonStyle}>LOGIN</Link> <Link to="/signup"><button style={signupButtonStyle}>SIGN UP</button></Link> </>)}
      </div>
    </nav>
  );
};

import { ShaderAnimation } from "@/components/ui/shader-animation";

// ... (other imports)

// --- Animated Hero Section ---
// This component contains the main visual content and buttons.
const AnimatedHero = () => {
  const navigate = useNavigate();

  // Handle Get Demo button click - direct navigation
  const handleGetDemo = () => {
    navigate("/create-join");
  };

  // Handle Explore Features button - direct navigation
  const handleExploreFeatures = () => {
    navigate("/features");
  };

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-black text-white">
      <div className="absolute inset-0 z-0">
        <ShaderAnimation />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] justify-start px-[5%] pointer-events-none">
        <div className="max-w-[550px] text-left">
          <h1 className="text-[clamp(2em,8vw,4em)] font-bold leading-[1.2] tracking-wider drop-shadow-xl">
            Code Together. <span className="text-[#56b6c2]">Think Smarter.</span> Build Faster.
          </h1>
          <p className="mt-4 mb-10 max-w-[500px] text-[clamp(1em,3vw,1.4em)] opacity-90 drop-shadow-lg">
            Real-time collaborative coding + <span className="text-[#7f53ac]">AI teammate</span> for every project.
          </p>
          <div className="flex flex-wrap gap-5 pointer-events-auto">
            <button
              className="bg-gradient-to-r from-[#7f53ac] to-[#56b6c2] text-white border-0 rounded-full py-[clamp(12px,3vw,16px)] px-[clamp(24px,5vw,40px)] text-[clamp(1em,2.5vw,1.2em)] font-bold shadow-[0_0_24px_#56b6c2aa] cursor-pointer transition-transform hover:scale-105 active:scale-95"
              onClick={handleGetDemo}
            >
              Code Now
            </button>
            <button
              className="bg-[#252626] text-white border-0 rounded-full py-[clamp(12px,3vw,16px)] px-[clamp(24px,5vw,40px)] text-[clamp(1em,2.5vw,1.2em)] font-bold shadow-[0_0_16px_#7f53ac88] cursor-pointer transition-transform hover:scale-105 active:scale-95"
              onClick={handleExploreFeatures}
            >
              Explore Features
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Features Section ---
const FeaturesSection = () => {
  const features = [
    {
      icon: "⚡",
      title: "Real-time Collaboration",
      description: "Code together with your team in real-time. See changes instantly as they happen."
    },
    {
      icon: "🤖",
      title: "AI-Powered Assistant",
      description: "Get intelligent code suggestions and debugging help from our advanced AI teammate."
    },
    {
      icon: "🎨",
      title: "Multi-Language Support",
      description: "Support for JavaScript, Python, C++, Java, Go and more with syntax highlighting."
    },
    {
      icon: "🔒",
      title: "Secure & Private",
      description: "End-to-end encryption ensures your code and conversations stay private."
    },
    {
      icon: "💬",
      title: "Voice Communication",
      description: "Built-in voice chat to discuss code changes and collaborate seamlessly."
    },
    {
      icon: "📁",
      title: "File Management",
      description: "Upload, organize, and manage project files with an intuitive file explorer."
    }
  ];

  const sectionStyle = {
    padding: 'clamp(60px, 10vw, 100px) 5%',
    background: 'linear-gradient(180deg, #000 0%, #1a0b2e 100%)',
    color: '#fff'
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '60px'
  };

  const titleStyle = {
    fontSize: 'clamp(2em, 6vw, 3em)',
    fontWeight: 'bold',
    marginBottom: '20px',
    background: 'linear-gradient(90deg, #7f53ac 0%, #56b6c2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };

  const subtitleStyle = {
    fontSize: 'clamp(1em, 2.5vw, 1.2em)',
    color: '#aaa',
    maxWidth: '600px',
    margin: '0 auto'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
    gap: '30px',
    marginTop: '40px'
  };

  const cardStyle = {
    background: 'rgba(34, 34, 54, 0.6)',
    borderRadius: '20px',
    padding: '40px 30px',
    border: '1px solid rgba(127, 83, 172, 0.2)',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  };

  const iconStyle = {
    fontSize: '3em',
    marginBottom: '20px',
    display: 'block'
  };

  const featureTitleStyle = {
    fontSize: '1.5em',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#fff'
  };

  const descriptionStyle = {
    fontSize: '1em',
    color: '#bbb',
    lineHeight: '1.6'
  };

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Powerful Features</h2>
          <p style={subtitleStyle}>
            Everything you need to collaborate effectively and build amazing projects together
          </p>
        </div>
        <div style={gridStyle}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.borderColor = '#56b6c2';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(86, 182, 194, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(127, 83, 172, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={iconStyle}>{feature.icon}</span>
              <h3 style={featureTitleStyle}>{feature.title}</h3>
              <p style={descriptionStyle}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Stats Section ---
const StatsSection = () => {
  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "50K+", label: "Projects Created" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" }
  ];

  const sectionStyle = {
    padding: '80px 5%',
    background: 'linear-gradient(180deg, #1a0b2e 0%, #2b1055 100%)',
    color: '#fff'
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '40px',
    textAlign: 'center'
  };

  const statStyle = {
    padding: '20px'
  };

  const numberStyle = {
    fontSize: '3.5em',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #7f53ac 0%, #56b6c2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '10px'
  };

  const labelStyle = {
    fontSize: '1.2em',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '2px'
  };

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div style={gridStyle}>
          {stats.map((stat, index) => (
            <div key={index} style={statStyle}>
              <div style={numberStyle}>{stat.number}</div>
              <div style={labelStyle}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Testimonials Section ---
const TestimonialsSection = () => {
  const testimonials = [
    {
      text: "AICollab has transformed how our team works together. The real-time collaboration and AI assistance are game-changers!",
      avatar: "👩‍💻"
    },
    {
      text: "The voice communication feature is incredible. We can discuss code changes while editing together seamlessly.",
      avatar: "👨‍💼"
    },
    {
      text: "Best collaborative coding platform I've used. The AI suggestions are surprisingly accurate and helpful.",
      avatar: "👩‍🔬"
    }
  ];

  const sectionStyle = {
    padding: '100px 5%',
    background: 'linear-gradient(180deg, #2b1055 0%, #1a0b2e 100%)',
    color: '#fff'
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '60px'
  };

  const titleStyle = {
    fontSize: '3em',
    fontWeight: 'bold',
    marginBottom: '20px',
    background: 'linear-gradient(90deg, #7f53ac 0%, #56b6c2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px'
  };

  const cardStyle = {
    background: 'rgba(34, 34, 54, 0.6)',
    borderRadius: '20px',
    padding: '40px',
    border: '1px solid rgba(127, 83, 172, 0.2)',
    position: 'relative'
  };

  const quoteStyle = {
    fontSize: '3em',
    color: '#56b6c2',
    opacity: 0.3,
    position: 'absolute',
    top: '20px',
    left: '30px'
  };

  const textStyle = {
    fontSize: '1.1em',
    lineHeight: '1.8',
    color: '#ddd',
    marginBottom: '30px',
    marginTop: '20px'
  };

  const authorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  };

  const avatarStyle = {
    fontSize: '2.5em'
  };

  const nameStyle = {
    fontSize: '1.1em',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '5px'
  };

  const roleStyle = {
    fontSize: '0.9em',
    color: '#aaa'
  };

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>What Developers Say</h2>
        </div>
        <div style={gridStyle}>
          {testimonials.map((testimonial, index) => (
            <div key={index} style={cardStyle}>
              <div style={quoteStyle}>"</div>
              <p style={textStyle}>{testimonial.text}</p>
              <div style={authorStyle}>
                <span style={avatarStyle}>{testimonial.avatar}</span>
                <div>
                  <div style={nameStyle}>{testimonial.name}</div>
                  <div style={roleStyle}>{testimonial.role}  {testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- CTA Section ---
const CTASection = () => {
  const navigate = useNavigate();

  const sectionStyle = {
    padding: '100px 5%',
    background: 'linear-gradient(135deg, #7f53ac 0%, #56b6c2 100%)',
    color: '#fff',
    textAlign: 'center'
  };

  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto'
  };

  const titleStyle = {
    fontSize: '3em',
    fontWeight: 'bold',
    marginBottom: '20px'
  };

  const subtitleStyle = {
    fontSize: '1.3em',
    marginBottom: '40px',
    opacity: 0.9
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  };

  const primaryBtnStyle = {
    background: '#fff',
    color: '#7f53ac',
    border: 'none',
    borderRadius: '32px',
    padding: '16px 40px',
    fontSize: '1.2em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  };

  const secondaryBtnStyle = {
    background: 'transparent',
    color: '#fff',
    border: '2px solid #fff',
    borderRadius: '32px',
    padding: '16px 40px',
    fontSize: '1.2em',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s, background 0.2s'
  };

  return (
    <section style={sectionStyle}>
      <div style={containerStyle}>
        <h2 style={titleStyle}>Ready to Transform Your Workflow?</h2>
        <p style={subtitleStyle}>
          Join thousands of developers already collaborating smarter with AICollab
        </p>
        <div style={buttonContainerStyle}>
          <button
            style={primaryBtnStyle}
            onClick={() => navigate('/signup')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
            }}
          >
            Get Started Free
          </button>
          <button
            style={secondaryBtnStyle}
            onClick={() => navigate('/create-join')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(-5px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Try Demo
          </button>
        </div>
      </div>
    </section>
  );
};

// --- Main Home Page Component ---
// This component manages the loading state and combines all the pieces.
const Home = () => {
  // FIX: Set isLoading to true by default to show animation on every load.
  const [isLoading, setIsLoading] = useState(true);
  const [isExitingLoader, setIsExitingLoader] = useState(false);

  const handleLoadingComplete = useCallback(() => {
    setIsExitingLoader(true);
    setTimeout(() => {
      setIsLoading(false);
      // FIX: Removed sessionStorage so the loading screen isn't skipped on refresh.
    }, 500);
  }, []);

  const mainPageStyle = {
    transition: 'opacity 0.8s ease-in-out',
    opacity: isLoading ? 0 : 1,
  };

  return (
    <>
      {isLoading && <LoadingScreen isExiting={isExitingLoader} onLoadingComplete={handleLoadingComplete} />}
      <div style={mainPageStyle}>
        <HeroNavbar />
        <AnimatedHero />
      </div>
    </>
  );
};

export default Home;
export { FeaturesSection, StatsSection, TestimonialsSection, CTASection };


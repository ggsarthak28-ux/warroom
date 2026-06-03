import { useEffect, useState } from "react";
import HeroScene from "./three/HeroScene";

export default function HeroSection() {
  const [textStyle, setTextStyle] = useState({
    opacity: 1,
    transform: "translateY(0px)",
  });
  const [buttonHovered, setButtonHovered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateHeroText = () => {
      const fadeDistance = window.innerHeight * 0.5;
      const progress = fadeDistance > 0 ? Math.min(window.scrollY / fadeDistance, 1) : 0;

      setTextStyle({
        opacity: 1 - progress,
        transform: `translateY(${-60 * progress}px)`,
      });
    };

    updateHeroText();

    window.addEventListener("scroll", updateHeroText, { passive: true });
    window.addEventListener("resize", updateHeroText, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateHeroText);
      window.removeEventListener("resize", updateHeroText);
    };
  }, []);

  const goToPractice = () => {
    if (typeof document === "undefined") {
      return;
    }

    const nextSection = document.querySelector("[data-warroom-app]");

    if (nextSection) {
      window.scrollTo({
        top: nextSection.offsetTop,
        left: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      style={{
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "#0a0a0f",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <HeroScene />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
          opacity: textStyle.opacity,
          transform: textStyle.transform,
          transition: "opacity 80ms linear, transform 80ms linear",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "Sora, sans-serif",
            fontSize: "clamp(48px, 9vw, 80px)",
            lineHeight: 1,
            color: "#ffffff",
            textShadow: "0 0 40px #00ff8866",
            letterSpacing: "0",
          }}
        >
          WarRoom
        </h1>

        <p
          style={{
            margin: "18px 0 0",
            fontFamily: '"DM Sans", sans-serif',
            fontSize: "22px",
            lineHeight: 1.45,
            color: "#aaaaaa",
          }}
        >
          Master the Indian Stock Market
        </p>

        <button
          type="button"
          onClick={goToPractice}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
          style={{
            marginTop: "34px",
            border: "1px solid #00ff88",
            color: "#00ff88",
            background: buttonHovered ? "#00ff8822" : "transparent",
            padding: "14px 32px",
            borderRadius: "4px",
            cursor: "pointer",
            fontFamily: '"DM Sans", sans-serif',
            fontSize: "16px",
            fontWeight: 700,
          }}
        >
          Start Trading Practice
        </button>
      </div>
    </section>
  );
}

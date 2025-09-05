import { useEffect } from "react";

import { Terminal } from "./components/Terminal";
import { cn } from "./lib/utils";

function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const input = document.querySelector(
          "input[data-terminal-input]"
        ) as HTMLInputElement;
        input?.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const input = document.querySelector(
          "input[data-terminal-input]"
        ) as HTMLInputElement;
        if (input) {
          const event = new KeyboardEvent("keydown", { key: "Enter" });
          input.value = "clear";
          input.dispatchEvent(event);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClick = () => {
      const input = document.querySelector(
        "input[data-terminal-input]"
      ) as HTMLInputElement;
      input?.focus();
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Set viewport height CSS custom property for mobile
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);

    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  return (
    <div
      className={cn(
        "h-screen bg-black text-green-400 font-mono overflow-hidden",
        "selection:bg-green-400 selection:text-black",
        "antialiased"
      )}
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}
    >
      {/* Background effects */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 via-transparent to-green-400/5" />
        <div className="matrix-bg" />
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Terminal container - takes most of the space */}
        <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <Terminal />
          </div>
        </div>

        {/* Footer - compact on mobile, hidden on very small screens */}
        <footer className="hidden sm:block flex-shrink-0 p-2 text-center text-gray-500 text-xs border-t border-gray-800/30">
          <p className="mb-1">
            Built with React, TypeScript, Vite & Tailwind CSS •
            <a
              href="https://github.com/ReeceBernard/portfolio-site"
              className="text-green-400 hover:text-green-300 ml-1 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Source
            </a>
          </p>
          <p className="text-gray-600 text-xs">
            © 2025 Reece Bernard • Interactive Terminal Portfolio
          </p>
        </footer>

        {/* Mobile-only footer - super compact */}
        <footer className="sm:hidden flex-shrink-0 p-1 text-center text-gray-600 text-xs">
          <p>© 2025 Reece Bernard</p>
        </footer>
      </div>

      {/* Inline styles for matrix background effect */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .matrix-bg {
            background-image: 
              linear-gradient(90deg, transparent 98%, rgba(0, 255, 65, 0.02) 100%),
              linear-gradient(transparent 98%, rgba(0, 255, 65, 0.02) 100%);
            background-size: 30px 30px;
            animation: matrix-scroll 30s linear infinite;
          }
          
          @keyframes matrix-scroll {
            0% { background-position: 0 0; }
            100% { background-position: 30px 30px; }
          }

          /* Prevent zoom on iOS when focusing inputs */
          @media screen and (max-width: 768px) {
            input[data-terminal-input] {
              font-size: 16px;
            }
          }

          /* Handle safe area insets for devices with notches */
          @supports (padding: max(0px)) {
            .safe-area-padding {
              padding-left: max(1rem, env(safe-area-inset-left));
              padding-right: max(1rem, env(safe-area-inset-right));
              padding-top: max(0.5rem, env(safe-area-inset-top));
              padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
            }
          }
        `,
        }}
      />
    </div>
  );
}

export default App;

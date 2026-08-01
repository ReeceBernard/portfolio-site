import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const REVEAL_THRESHOLD = 120;

export const Nav = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > REVEAL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className={`bg-white/90 backdrop-blur-sm border-b border-gray-100 fixed top-0 inset-x-0 z-50 transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <span className="font-semibold text-gray-900 font-mono text-sm">reece.bernard</span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => scrollTo('experience')}
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 bg-transparent border-none cursor-pointer"
            >
              Experience
            </button>
            <button
              onClick={() => scrollTo('projects')}
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 bg-transparent border-none cursor-pointer"
            >
              Projects
            </button>
            <button
              onClick={() => scrollTo('skills')}
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 bg-transparent border-none cursor-pointer"
            >
              Skills
            </button>
            <button
              onClick={() => scrollTo('contact')}
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 bg-transparent border-none cursor-pointer"
            >
              Contact
            </button>
            <Link
              to="/tools"
              className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors px-2 py-1"
            >
              Tools
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

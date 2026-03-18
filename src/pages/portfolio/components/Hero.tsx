import { MapPin } from 'lucide-react';
import { PERSONAL_INFO } from '../../home/lib/contants';

const RESUME_URL = 'https://reece-bernard-portfolio.s3.us-east-1.amazonaws.com/resume.pdf';

export const Hero = () => {
  const scrollToProjects = () => {
    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-white pt-20 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-5">
          <MapPin className="w-3.5 h-3.5" />
          <span>{PERSONAL_INFO.location}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          Reece Bernard
        </h1>
        <p className="text-xl text-green-600 font-medium mb-6">{PERSONAL_INFO.title}</p>
        <p className="text-gray-600 text-lg max-w-2xl mb-10 leading-relaxed">
          {PERSONAL_INFO.bio}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={scrollToProjects}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            View Projects
          </button>
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Resume ↗
          </a>
        </div>
      </div>
    </section>
  );
};

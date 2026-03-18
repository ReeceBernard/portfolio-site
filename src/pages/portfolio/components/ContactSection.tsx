import { Mail, Linkedin, Github } from 'lucide-react';
import { PERSONAL_INFO } from '../../home/lib/contants';

export const ContactSection = () => {
  return (
    <section id="contact" className="bg-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Get in Touch</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Feel free to reach out.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={`mailto:${PERSONAL_INFO.email}`}
            className="flex items-center gap-2.5 px-5 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">{PERSONAL_INFO.email}</span>
          </a>
          <a
            href={PERSONAL_INFO.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-5 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Linkedin className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">LinkedIn</span>
          </a>
          <a
            href={PERSONAL_INFO.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-5 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Github className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">GitHub</span>
          </a>
        </div>
      </div>
    </section>
  );
};

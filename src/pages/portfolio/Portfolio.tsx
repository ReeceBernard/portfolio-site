import { Nav } from './components/Nav';
import { HelixHero } from './components/HelixHero';
import { ExperienceSection } from './components/ExperienceSection';
import { ProjectsSection } from './components/ProjectsSection';
import { SkillsSection } from './components/SkillsSection';
import { ContactSection } from './components/ContactSection';
import { PhotoCredits } from './components/PhotoCredits';

export const Portfolio = () => {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main>
        <HelixHero />
        <ExperienceSection />
        <ProjectsSection />
        <SkillsSection />
        <ContactSection />
      </main>
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-gray-400 text-sm text-center">© {new Date().getFullYear()} Reece Bernard</p>
          <PhotoCredits />
        </div>
      </footer>
    </div>
  );
};

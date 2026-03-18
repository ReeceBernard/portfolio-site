import { Link } from 'react-router-dom';
import type { Project } from '../../../types';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6 flex flex-col">
      <h3 className="font-semibold text-gray-900 text-lg mb-2">{project.name}</h3>
      <p className="text-gray-600 text-sm mb-4 flex-grow leading-relaxed">{project.description}</p>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {project.technologies.map((tech) => (
          <span
            key={tech}
            className="text-xs font-mono bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded"
          >
            {tech}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            GitHub ↗
          </a>
        )}
        {project.demo && (
          <a
            href={project.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            Demo ↗
          </a>
        )}
        <Link
          to={`/projects/${project.slug}`}
          className="text-green-600 hover:text-green-700 font-medium transition-colors ml-auto"
        >
          Read more →
        </Link>
      </div>
    </div>
  );
};

import { useParams, Link } from 'react-router-dom';
import { PROJECTS } from '../home/lib/contants';

export const ProjectDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const project = PROJECTS.find((p) => p.slug === slug);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-500 mb-6">No project matches the slug "{slug}".</p>
          <Link to="/" className="text-green-600 hover:text-green-700 font-medium transition-colors">
            ← Back to Portfolio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14">
            <Link
              to="/"
              className="text-green-600 hover:text-green-700 text-sm font-medium transition-colors"
            >
              ← Back to Portfolio
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">{project.name}</h1>
          <p className="text-lg text-gray-600 mb-5 leading-relaxed">{project.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {project.technologies.map((tech) => (
              <span
                key={tech}
                className="text-xs font-mono bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {project.writeup ? (
          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
              <div className="text-gray-600 leading-relaxed space-y-4">
                {project.writeup.overview.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>

            {project.writeup.techDetails && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Technical Details</h2>
                <p className="text-gray-600 leading-relaxed">{project.writeup.techDetails}</p>
              </section>
            )}

            {project.writeup.lessons && project.writeup.lessons.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Lessons Learned</h2>
                <ul className="space-y-2.5">
                  {project.writeup.lessons.map((lesson, i) => (
                    <li key={i} className="flex gap-2.5 text-gray-600">
                      <span className="text-green-500 mt-0.5 shrink-0">•</span>
                      <span>{lesson}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {project.writeup.futureIdeas && project.writeup.futureIdeas.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Future Ideas</h2>
                <ul className="space-y-2.5">
                  {project.writeup.futureIdeas.map((idea, i) => (
                    <li key={i} className="flex gap-2.5 text-gray-600">
                      <span className="text-green-500 mt-0.5 shrink-0">→</span>
                      <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Highlights</h2>
            <ul className="space-y-2.5">
              {project.highlights.map((h, i) => (
                <li key={i} className="flex gap-2.5 text-gray-600">
                  <span className="text-green-500 mt-0.5 shrink-0">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* External links */}
        {(project.github || project.demo) && (
          <div className="mt-12 pt-8 border-t border-gray-100 flex gap-5">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                GitHub ↗
              </a>
            )}
            {project.demo && (
              <a
                href={project.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                Live Demo ↗
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

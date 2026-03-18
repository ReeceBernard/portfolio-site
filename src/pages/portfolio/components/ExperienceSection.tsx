import { EXPERIENCE } from '../../home/lib/contants';

export const ExperienceSection = () => {
  return (
    <section id="experience" className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-10">Experience</h2>
        <div className="space-y-6">
          {EXPERIENCE.map((exp) => (
            <div
              key={`${exp.company}-${exp.startDate}`}
              className="bg-white shadow-sm border border-gray-100 rounded-xl p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight">{exp.position}</h3>
                  <p className="text-green-600 font-medium">{exp.company}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{exp.companyType}</p>
                </div>
                <span className="text-gray-400 text-sm shrink-0">{exp.duration}</span>
              </div>
              <ul className="space-y-1.5">
                {exp.description.map((item, i) => (
                  <li key={i} className="text-gray-600 text-sm flex gap-2">
                    <span className="text-green-500 mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {exp.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs font-mono bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

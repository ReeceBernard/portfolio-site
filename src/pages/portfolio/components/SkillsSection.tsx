import { SKILLS } from '../../home/lib/contants';
import type { Skill } from '../../../types';

const CATEGORY_LABELS: Record<Skill['category'], string> = {
  language: 'Languages',
  framework: 'Frameworks',
  datastore: 'Data Stores',
  cloud: 'Cloud',
  tool: 'Tools',
  'data engineering': 'Data Engineering',
};

const CATEGORY_ORDER: Skill['category'][] = [
  'language',
  'framework',
  'datastore',
  'cloud',
  'tool',
  'data engineering',
];

export const SkillsSection = () => {
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = SKILLS.filter((s) => s.category === cat);
    return acc;
  }, {} as Record<Skill['category'], typeof SKILLS>);

  return (
    <section id="skills" className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-10">Skills</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {CATEGORY_ORDER.map((cat) => (
            <div key={cat}>
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {grouped[cat].map((skill) => (
                  <span
                    key={skill.name}
                    className="font-mono text-sm bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-lg shadow-sm"
                  >
                    {skill.name}
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

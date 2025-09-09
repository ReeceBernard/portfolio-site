import { SKILLS } from "../lib/contants";

export const Skills = (): string => {
  const skillsByCategory = SKILLS.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, typeof SKILLS>);

  const createProgressBar = (level: number): string => {
    const filled = Math.floor(level / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  const formatCategory = (category: string): string => {
    const categoryMap = {
      language: "💻 Programming Languages",
      framework: "🚀 Frameworks & Libraries",
      tool: "🛠️  Tools",
      cloud: "☁️  Cloud & DevOps",
      database: "🗄️  Databases",
      specialty: "🌟  Specialty Skills",
    };

    return categoryMap[category as keyof typeof categoryMap] || category;
  };

  let output = `
<span class="text-yellow-400 font-bold">Technical Skills & Proficiencies</span>
<span class="text-gray-400">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>

`;

  Object.entries(skillsByCategory).forEach(([category, categorySkills]) => {
    output += `<span class="text-cyan-400 font-bold">${formatCategory(
      category
    )}</span>\n`;

    categorySkills
      .sort((a, b) => b.level - a.level)
      .forEach((skill) => {
        const progressBar = createProgressBar(skill.level);
        const padding = " ".repeat(Math.max(0, 18 - skill.name.length));
        output += `<span class="text-green-400">${skill.name}</span>${padding}<span class="text-blue-400">${progressBar}</span> <span class="text-yellow-400">${skill.level}%</span>\n`;
      });

    output += "\n";
  });

  output += `<span class="text-yellow-400">🎓 Continuous Learning</span>
Currently exploring: rust, private cloud infrastructure, Raspberry Pi

<span class="text-yellow-400">📈 Experience Level</span>
<span class="text-green-400">Expert (90-100%)</span>    - Can architect systems, mentor others, lead projects
<span class="text-blue-400">Advanced (80-89%)</span>   - Production experience, can work independently  
<span class="text-yellow-400">Intermediate (70-79%)</span> - Solid foundation, some production experience`;

  return output.trim();
};

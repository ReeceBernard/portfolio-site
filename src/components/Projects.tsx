import { PROJECTS } from "../lib/contants";

export const Projects = (): string => {
  let output = `
<span class="text-yellow-400 font-bold">Featured Projects & Portfolio</span>
<span class="text-gray-400">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>

`;

  PROJECTS.forEach((project, index) => {
    const githubIcon = project.github ? "📦" : "🔒";

    output += `<span class="text-cyan-400 font-bold text-lg">${githubIcon} ${project.name}</span>
<span class="text-gray-300">${project.description}</span>

<span class="text-yellow-400">✨ Key Highlights:</span>
`;

    project.highlights.forEach((highlight) => {
      output += `<span class="text-green-400">•</span> ${highlight}\n`;
    });

    output += `\n<span class="text-yellow-400">🛠️ Built with:</span> <span class="text-green-400">${project.technologies.join(
      ", "
    )}</span>\n`;

    if (project.github) {
      output += `<span class="text-yellow-400">📦 Repository:</span> <a href="${project.github}" class="text-cyan-400 underline">${project.github}</a>\n`;
    }

    if (project.demo) {
      output += `<span class="text-yellow-400">🚀 Live Demo:</span> <a href="${project.demo}" class="text-cyan-400 underline">${project.demo}</a>\n`;
    }

    if (index < PROJECTS.length - 1) {
      output +=
        '\n<span class="text-gray-600">────────────────────────────────────────────────────────────────────────</span>\n\n';
    }
  });

  return output.trim();
};

import { EXPERIENCE } from "../lib/contants";

export const Experience = (): string => {
  let output = `
<span class="text-yellow-400 font-bold">Work Experience & Career Journey</span>
<span class="text-gray-400">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>

`;

  EXPERIENCE.forEach((job, index) => {
    const isCurrentJob = job.endDate === "Present";
    const durationColor = isCurrentJob ? "text-green-400" : "text-blue-400";

    output += `<span class="text-cyan-400 font-bold text-lg">${job.position}</span> @ <span class="text-yellow-400">${job.company}</span>
<span class="${durationColor}">📅 ${job.duration}</span>

`;

    job.description.forEach((desc) => {
      output += `<span class="text-gray-300">•</span> ${desc}\n`;
    });

    output += `\n<span class="text-yellow-400">🛠️ Tech Stack:</span> <span class="text-green-400">${job.technologies.join(
      ", "
    )}</span>\n`;

    if (index < EXPERIENCE.length - 1) {
      output +=
        '\n<span class="text-gray-600">────────────────────────────────────────────────────────────────────────</span>\n\n';
    }
  });

  return output.trim();
};

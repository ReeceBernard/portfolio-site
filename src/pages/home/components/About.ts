import { PERSONAL_INFO } from "../lib/contants";


export const About = (): string => {
  return `
<span class="text-yellow-400 font-bold">About Reece</span>
<span class="text-gray-400">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>

${PERSONAL_INFO.bio}

I'm passionate about building scalable, efficient applications and love tackling complex technical challenges. When I'm not coding, you can find me exploring new technologies, contributing to open source projects, or sharing knowledge with the developer community.

<span class="text-yellow-400">📍 Location:</span> ${PERSONAL_INFO.location}
<span class="text-yellow-400">💼 Current Role:</span> ${PERSONAL_INFO.title}
<span class="text-yellow-400">🎯 Specialties:</span> Full-Stack Development, System Architecture, DevOps
<span class="text-yellow-400">🌟 Interests:</span> Fintech, Full-Stack Development, AI/ML, System Design, Data Modeling, Mentoring

<span class="text-yellow-400">📫 Connect with me:</span>
• Email: <a href="mailto:${PERSONAL_INFO.email}" class="text-cyan-400 underline">${PERSONAL_INFO.email}</a>
• LinkedIn: <a href="${PERSONAL_INFO.linkedin}" class="text-cyan-400 underline" target="_blank" rel="noopener noreferrer">${PERSONAL_INFO.linkedin}</a>
• GitHub: <a href="${PERSONAL_INFO.github}" class="text-cyan-400 underline" target="_blank" rel="noopener noreferrer">${PERSONAL_INFO.github}</a>
• Website: <a class="text-cyan-400 underline" rel="noopener noreferrer">${PERSONAL_INFO.website}</a>
  `.trim();
};

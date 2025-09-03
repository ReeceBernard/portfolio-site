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
• Email: <span class="text-cyan-400">${PERSONAL_INFO.email}</span>
• LinkedIn: <span class="text-cyan-400">${PERSONAL_INFO.linkedin}</span>
• GitHub: <span class="text-cyan-400">${PERSONAL_INFO.github}</span>
• Website: <span class="text-cyan-400">${PERSONAL_INFO.website}</span>
  `.trim();
};

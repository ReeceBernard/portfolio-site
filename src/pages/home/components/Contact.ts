import { PERSONAL_INFO } from "../lib/contants";

export const Contact = (): string => {
  // Note: This returns HTML that includes a form component
  // The form handling would need to be implemented in the terminal system
  return `
<span class="text-yellow-400 font-bold">Get In Touch</span>
<span class="text-gray-400">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>

I'm always interested in hearing about new opportunities, especially challenging 
roles that push the boundaries of technology and involve working with great teams.

<span class="text-yellow-400">📧 Email Me Directly</span>
For immediate contact: <a href="mailto:${PERSONAL_INFO.email}" class="text-cyan-400 underline">${PERSONAL_INFO.email}</a>

<span class="text-yellow-400">🔗 Connect on Social</span>
<span class="text-green-400">•</span> LinkedIn: <a href="${PERSONAL_INFO.linkedin}" class="text-cyan-400 underline">${PERSONAL_INFO.linkedin}</a>
<span class="text-green-400">•</span> GitHub: <a href="${PERSONAL_INFO.github}" class="text-cyan-400 underline">${PERSONAL_INFO.github}</a>

<span class="text-yellow-400">💼 What I'm Looking For</span>
<span class="text-green-400">•</span> <span class="text-cyan-400">Senior Software Engineer</span> or <span class="text-cyan-400">Tech Lead</span> positions
<span class="text-green-400">•</span> Companies building <span class="text-cyan-400">impactful products</span> with modern tech stacks
<span class="text-green-400">•</span> Teams that value <span class="text-cyan-400">code quality</span>, <span class="text-cyan-400">mentorship</span>, and <span class="text-cyan-400">continuous learning</span>
<span class="text-green-400">•</span> Opportunities to work on <span class="text-cyan-400">scalable systems</span> and <span class="text-cyan-400">technical challenges</span>
<span class="text-green-400">•</span><span class="text-cyan-400"> New York City</span> or Remote Opportunities

<span class="text-yellow-400">⚡ Quick Response</span>
I typically respond to legitimate opportunities within <span class="text-green-400">24 hours</span>.
Please include:
<span class="text-cyan-400">•</span> Company name and brief description
<span class="text-cyan-400">•</span> Role details and tech stack
<span class="text-cyan-400">•</span> What makes this opportunity special
<span class="text-cyan-400">•</span> Compensation range (helps prioritize responses)

<span class="text-yellow-400">📝 Note</span>
<span class="text-gray-400">Contact form potentially coming soon...</span>

<span class="text-red-400">🚫 Alert</span>
<span class="text-gray-400">Please use a valid business email address. Personal emails from 
Gmail/Yahoo for recruiting purposes will not receive responses.</span>
  `.trim();
};

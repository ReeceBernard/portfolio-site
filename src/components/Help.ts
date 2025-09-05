export const Help = (): string => {
  return `
<span class="text-yellow-400 font-bold">Available Commands</span>
<span class="text-gray-400">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>

<span class="text-green-400">about</span>       Learn about me and my background
<span class="text-green-400">skills</span>      View my technical skills and proficiencies  
<span class="text-green-400">experience</span>  See my work experience and career history
<span class="text-green-400">projects</span>    Check out my notable projects and contributions
<span class="text-green-400">contact</span>     Get in touch with me (requires valid email)
<span class="text-green-400">resume</span>      Download my resume in various formats
<span class="text-green-400">clear</span>       Clear the terminal screen
<span class="text-green-400">help</span>        Show this help menu

<span class="text-gray-400">Unix-style commands:</span>
<span class="text-cyan-400">ls</span>          List directory contents
<span class="text-cyan-400">pwd</span>         Print working directory  
<span class="text-cyan-400">whoami</span>      Display current user
<span class="text-cyan-400">date</span>        Show current date and time
<span class="text-cyan-400">echo</span> [text] Echo back the provided text
<span class="text-cyan-400">cat</span> [file]  Display file contents
<span class="text-cyan-400">open</span> [url]  Open a URL in a new tab

<span class="text-yellow-400">💡 Pro Tips:</span>
• Use <kbd class="bg-gray-700 px-1 rounded text-xs">Tab</kbd> for auto-completion
• Use <kbd class="bg-gray-700 px-1 rounded text-xs">↑↓</kbd> arrows for command history
• Use <kbd class="bg-gray-700 px-1 rounded text-xs">Ctrl+L</kbd> to clear screen

Type any command and press Enter to execute.
  `.trim();
};

import { About } from "../components/About";
import { Contact } from "../components/Contact";
import { Experience } from "../components/Experience";
import { Help } from "../components/Help";
import { Projects } from "../components/Projects";
import { Resume } from "../components/Resume";
import { Skills } from "../components/Skills";
import { WhoAmI } from "../components/WhoAmI";
import type { CommandRegistry } from "../types";

export const commands: CommandRegistry = {
  help: () => Help(),
  about: () => About(),
  skills: () => Skills(),
  experience: () => Experience(),
  projects: () => Projects(),
  contact: () => Contact(),
  resume: () => Resume(),
  whoami: () => WhoAmI(),
  pwd: () => "/home/reecebernard",
  ls: () =>
    "about.txt  skills.txt  experience.txt  projects.txt  contact.txt  resume.pdf",
  date: () => new Date().toString(),
  echo: (args: string[]) => args.join(" "),
  cat: (args: string[]) => {
    const file = args[0];
    const fileCommands: Record<string, string> = {
      "about.txt": About(),
      "skills.txt": Skills(),
      "experience.txt": Experience(),
      "projects.txt": Projects(),
      "contact.txt": Contact(),
    };
    return fileCommands[file] || `cat: ${file}: No such file or directory`;
  },
  open: (args: string[]) => {
    const target = args[0];
    if (!target) {
      return "Usage: open <url|shortcut>\n\nAvailable shortcuts:\n  google    - Google Search\n  github    - GitHub\n  linkedin  - LinkedIn\n  youtube   - YouTube\n  stackoverflow - Stack Overflow\n  npm       - NPM Registry\n\nOr use any URL: open example.com";
    }

    const shortcuts: Record<string, string> = {
      google: "https://google.com",
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
      stackoverflow: "https://stackoverflow.com",
      npm: "https://npmjs.com",
      portfolio: window.location.origin,
    };

    const url =
      shortcuts[target.toLowerCase()] ||
      (target.startsWith("http") ? target : `https://${target}`);

    try {
      window.open(url, "_blank", "noopener,noreferrer");
      return `Opening ${target}... 🚀`;
    } catch (error) {
      return `Error: Could not open ${target}`;
    }
  },
};

export const COMMAND_LIST = Object.keys(commands);

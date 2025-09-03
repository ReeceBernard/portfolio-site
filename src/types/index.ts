export interface CommandOutput {
  type: "command" | "output" | "error" | "success";
  content: string;
  timestamp: number;
}

export interface Command {
  description: string;
  usage?: string;
  action: (args: string[]) => Promise<string> | string;
}

export interface CommandRegistry {
  [key: string]: Command["action"];
}

export interface PersonalInfo {
  title: string;
  location: string;
  email: string;
  website: string;
  linkedin: string;
  github: string;
  bio: string;
}

export interface Skill {
  name: string;
  level: number;
  category:
    | "language"
    | "framework"
    | "tool"
    | "cloud"
    | "database"
    | "specialty";
}

export interface Experience {
  company: string;
  position: string;
  duration: string;
  startDate: string;
  companyType: string;
  endDate: string | "Present";
  description: string[];
  technologies: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  github?: string;
  demo?: string;
  highlights: string[];
}

export interface ContactForm {
  company: string;
  name: string;
  email: string;
  role: string;
  message: string;
}

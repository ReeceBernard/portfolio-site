import type { Experience, PersonalInfo, Project, Skill } from "../../../types";

export const EXPERIENCE: Experience[] = [
  {
    company: "Snowball",
    position: "Co-Founder",
    duration: "March 2025 - Present",
    startDate: "2025-03-01",
    endDate: "Present",
    companyType: "Financial Services Data Consulting",
    description: [
      "Leveraged Generative AI to develop a CIM analysis agent that automatically processes inbound emails and filters deals against investment criteria",
      "Built proprietary dealflow pipeline using Gen AI and web scraping to source LMM businesses, enriching owner contact data and revenue estimates",
      "Developed automated web scraping system to source founder exit events, streamlining UHNW prospect pipeline for wealth management",
    ],
    technologies: [
      "TypeScript",
      "Python",
      "React",
      "Node.js",
      "PostgreSQL",
      "Datadog",
      "AWS",
      "Generative AI",
    ],
  },
  {
    company: "Range",
    position: "Senior Full-Stack Software Engineer",
    duration: "March 2023 – March 2025",
    startDate: "2023-03-01",
    endDate: "2025-03-01",
    companyType: "Series B Wealth Tech Startup",
    description: [
      "Planned the Q4 roadmap for a 6-engineer team, cut average time to deliver financial plans by 30 minutes",
      "Refactored our monte-carlo simulation to run 60% faster",
      "Developed Range's core planning engine, enhancing our CFP efficiency beyond traditional RIAs",
      "Leveraged AI to automatically draft analysis messages for CFP delivering financial plans",
      "Built a frictionless CFP time tracker in the product allowing greater visibility into our efficiency",
      "Implemented an OCR model for parsing data from pay stubs, saving ~$200k annually in labor costs",
      "Mentored a recent graduate to advance into a full stack engineer role in three months",
      "Automated database migrations using AWS ECR, reducing reported issues",
      "Led the project to codify the US tax code for accurate 2024 and future tax projections",
      "Implemented GraphQL data loaders, reducing backend requests by over 300k per day",
    ],
    technologies: [
      "TypeScript",
      "React",
      "GraphQL",
      "Node.js",
      "PostgreSQL",
      "Datadog",
      "AWS",
    ],
  },
  {
    company: "Candidate",
    position: "Full-Stack Software Engineer",
    duration: "March 2022 – March 2023",
    startDate: "2022-03-01",
    endDate: "2023-03-01",
    companyType: "Seed Stage HR Tech Startup",
    description: [
      "Developed an email notification system leveraging AWS SNS, and SendGrid, increasing DAU",
      "Led DB design, API development, and UI/UX of an admin tool, enabling data driven decisions",
      "Migrated the site from a dynamic site hosted on AWS EC2 to a fully static site on S3 and Cloudfront",
      "Owned a project to integrate AWS SNS to send push notifications to mobile app users",
      "Refactored and redesigned Candidate's referral matching algorithm to run 75% faster",
    ],
    technologies: [
      "TypeScript",
      "React",
      "Node.js",
      "PHP",
      "SQL",
      "Git",
      "Cypress",
      "AWS",
    ],
  },
  {
    company: "BlackRock",
    position: "Portfolio Analyst Group - Data Scientist",
    duration: "March 2021 – April 2022",
    startDate: "2021-03-01",
    endDate: "2022-04-01",
    companyType: "Publicly Traded Asset Manager",
    description: [
      "Optimized a data pipeline containing all security information for Aladdin clients totaling over $500B",
      "Automated answering Request For Proposal documents resulting in $8-$16B in new inflows yearly",
      "Leveraged an NLP model to provide sentiment analysis on BBG news articles for the muni-bond team",
      "Programmed a model on 5 years of time-series data to proactively detect abnormal security lending",
    ],
    technologies: [
      "Python",
      "SQL",
      "Spark",
      "NLP",
      "SciPy",
      "Jupyter Notebook",
    ],
  },
  {
    company: "Fortamus",
    position: "Software Development Intern - Data Integration",
    duration: "January 2019 – August 2019",
    startDate: "2019-01-01",
    endDate: "2019-08-01",
    companyType: "Life Insurance Tech Startup",
    description: [
      "Developed proprietary life insurance valuation methods utilizing data vendors' APIs",
    ],
    technologies: ["Python", "Git", "AWS", "Lambda", "Docker", "Django"],
  },
];

export const SKILLS: Skill[] = [
  { name: "TypeScript", level: 95, category: "language" },
  { name: "JavaScript", level: 95, category: "language" },
  { name: "Python", level: 95, category: "language" },
  { name: "SQL", level: 95, category: "language" },
  { name: "Go", level: 75, category: "language" },
  { name: "PHP", level: 75, category: "language" },

  { name: "React", level: 95, category: "framework" },
  { name: "Node.js", level: 95, category: "framework" },
  { name: "Next.js", level: 85, category: "framework" },
  { name: "GraphQL", level: 95, category: "framework" },
  { name: "Django", level: 75, category: "framework" },

  { name: "PostgreSQL", level: 95, category: "database" },
  { name: "MySQL", level: 95, category: "database" },
  { name: "Redis", level: 80, category: "database" },

  { name: "AWS", level: 95, category: "cloud" },
  { name: "GCP", level: 85, category: "cloud" },
  { name: "Docker", level: 95, category: "tool" },
  { name: "Kubernetes", level: 85, category: "tool" },

  { name: "Git", level: 95, category: "tool" },
  { name: "Datadog", level: 90, category: "tool" },
  { name: "Cypress", level: 90, category: "tool" },
  { name: "Jupyter Notebook", level: 90, category: "tool" },

  { name: "Generative AI", level: 90, category: "specialty" },
  { name: "NLP", level: 90, category: "specialty" },
  { name: "Web Scraping", level: 95, category: "specialty" },
  { name: "Data Pipeline", level: 90, category: "specialty" },
  { name: "OCR", level: 85, category: "specialty" },
];

export const PROJECTS: Project[] = [
  {
    name: "StepExplorer",
    description:
      "A gamified walking experience that reveals the world as you explore.",
    technologies: [
      "React",
      "Node.js",
      "Typescript",
      "AWS",
      "Docker",
      "Terraform",
    ],
    github: "https://github.com/ReeceBernard/stepexplorer",
    demo: "https://stepexplorer.com",
    highlights: [
      "Working with geospatial data. Indexing, visualization, and analysis.",
      "Github Actions Integration",
      "Automated deployment with GitHub Actions",
      "Used by at least one person.",
    ],
  },
  {
    name: "Terminal Portfolio",
    description:
      "Interactive terminal-style portfolio built with React, TypeScript, and Vite",
    technologies: ["React", "TypeScript", "Vite", "Tailwind CSS"],
    github: "https://github.com/reecebernard/terminal-portfolio",
    demo: "https://reecebernard.dev",
    highlights: [
      "Modern React architecture with TypeScript",
      "Custom terminal emulation with command history",
      "Responsive design with Tailwind CSS",
      "Automated deployment with GitHub Actions",
    ],
  },
];

export const PERSONAL_INFO: PersonalInfo = {
  title: "Senior Software Engineer",
  location: "New York City, New York",
  email: "reece.bernard21@gmail.com",
  website: "https://reecebernard.dev",
  linkedin: "https://www.linkedin.com/in/maurice-reece-bernard1997/",
  github: "https://github.com/ReeceBernard",
  bio: `Passionate software engineer with 6+ years of experience building scalable web applications and distributed systems. I love solving complex problems and mentoring other developers.`,
};

import type { Experience, PersonalInfo, Project, Skill } from "../../../types";

export const EXPERIENCE: Experience[] = [
  {
    company: "Capital One",
    position: "Lead Software Engineer",
    duration: "November 2025 – Present",
    startDate: "2025-11-01",
    endDate: "Present",
    companyType: "Software",
    description: [
      "Architected and delivered a production-grade medallion ETL pipeline ingesting terabytes of raw data from S3 through bronze, silver, and gold layers into ClickHouse using Databricks Jobs and PySpark",
      "Led a platform migration from self-hosted ClickHouse to ClickHouse Cloud, improving operational scalability and reducing infrastructure maintenance overhead",
      "Led the Slingshot Pathfinder data ingestion team of 5 engineers, owning end-to-end ETL pipeline design, code reviews, and delivery",
    ],
    technologies: [
      "PySpark",
      "Databricks",
      "Snowflake",
      "ClickHouse",
      "AWS",
      "GraphQL",
    ],
  },
  {
    company: "Snowball",
    position: "Co-Founder",
    duration: "March 2025 – November 2025",
    startDate: "2025-03-01",
    endDate: "2025-11-01",
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
  { name: "FastAPI", level: 85, category: "framework" },
  { name: "Django", level: 75, category: "framework" },

  { name: "PostgreSQL", level: 95, category: "datastore" },
  { name: "MySQL", level: 95, category: "datastore" },
  { name: "Redis", level: 80, category: "datastore" },
  { name: "MongoDB", level: 80, category: "datastore" },
  { name: "S3", level: 95, category: "datastore" },

  { name: "AWS", level: 95, category: "cloud" },
  { name: "GCP", level: 85, category: "cloud" },

  { name: "Databricks", level: 90, category: "tool" },
  { name: "Snowflake", level: 90, category: "tool" },
  { name: "ClickHouse", level: 90, category: "tool" },
  { name: "Docker", level: 95, category: "tool" },
  { name: "Kubernetes", level: 85, category: "tool" },
  { name: "Git", level: 95, category: "tool" },
  { name: "Datadog", level: 90, category: "tool" },
  { name: "Redshift", level: 85, category: "tool" },
  { name: "Cypress", level: 90, category: "tool" },
  { name: "Jupyter Notebook", level: 90, category: "tool" },

  { name: "Generative AI", level: 90, category: "data engineering" },
  { name: "PySpark", level: 90, category: "data engineering" },
  { name: "ETL Pipelines", level: 95, category: "data engineering" },
  { name: "NLP", level: 90, category: "data engineering" },
  { name: "Web Scraping", level: 95, category: "data engineering" },
  { name: "OCR", level: 85, category: "data engineering" },
];

export const PROJECTS: Project[] = [
  {
    name: "StepExplorer",
    slug: "stepexplorer",
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
    highlights: [
      "Working with geospatial data. Indexing, visualization, and analysis.",
      "Github Actions Integration",
      "Automated deployment with GitHub Actions",
      "Used by at least one person.",
    ],
    writeup: {
      overview: `StepExplorer started with a simple question I had when I moved to Manhattan: when will I have walked the entire island? I wanted a way to track not just how far I'd gone, but which streets and blocks I'd actually set foot on — a living map of everywhere I'd been that would fill in over time like fog of war lifting in a video game. That itch turned into a full project exploring how to tile geographic space and track human movement through it.

The technical heart of the project is the hexagonal grid. I became genuinely fascinated with hexagons as a data structure for geospatial problems. Unlike squares, a hexagon's center is equidistant from every point on its perimeter — a property that turns out to be incredibly useful. It's the same reason hexagons are the default cell shape in cellular network design: a hexagonal grid lets you maximize coverage area while minimizing overlap and dead zones between towers. Each cell covers roughly the same effective radius in every direction, which squares simply can't do. That geometric elegance translated well to walking coverage — hexagons let me divide Manhattan into uniform cells where "have I been here?" has a consistent meaning regardless of direction.`,
      lessons: [
        "H3 (Uber's hexagonal hierarchical geospatial indexing system) makes hexagon tiling at arbitrary resolutions surprisingly approachable",
        "GPS traces are noisy — snapping raw coordinates to hex cells smooths out drift without losing meaningful path data",
        "Rendering thousands of filled hexagons efficiently on a map requires careful layer management; naive approaches get slow fast",
      ],
      futureIdeas: [
        "Hide collectibles under hexagons — when you clear one for the first time there's a chance to find a common, uncommon, rare, epic, or legendary item, adding a loot-driven reason to explore new areas",
        "Leaderboard for friends to compete on coverage",
        "Group hexagons into named areas — neighborhoods, boroughs, cities — so you can track completion at multiple scales simultaneously",
      ],
    },
  },
  {
    name: "DealScout",
    slug: "dealscout",
    description:
      "ETL pipeline ingesting Atlanta's public home sales records to surface active house flippers, track appreciation trends, and map where buyers are moving next. Built to inform personal real estate investment decisions.",
    technologies: [
      "Python",
      "PostgreSQL",
      "pandas",
      "ETL Pipeline",
      "GenAI",
      "REST APIs",
    ],
    highlights: [
      "Ingests and normalizes raw deed transfer records from Atlanta's public property database",
      "Identifies flippers by detecting short buy-hold-sell cycles across linked entity names",
      "Maps flipper activity by zip code and neighborhood to surface emerging investment corridors",
      "Automated incremental pipeline with deduplication to keep data fresh without re-processing history",
    ],
    writeup: {
      overview: `Atlanta's county property records are public — every home sale, deed transfer, and buyer name is on file. Most people ignore this data. I wanted to use it to find the people who are quietly buying distressed properties, renovating them, and selling at a profit before the neighborhood catches on.

DealScout is an ETL pipeline that pulls from Atlanta's public home sales database, normalizes the messy raw records, and runs a set of queries designed to surface flipper activity and broader market trends. The flipper logic is simple: find entities (individual names, LLCs) that bought a property and sold it within 18 months at a significant markup. Do that across thousands of transactions and patterns emerge — certain buyers show up repeatedly, and they tend to cluster in specific zip codes.

The interesting output isn't just "who's flipping" — it's "where are they moving next." If a flipper has done 4 deals in one neighborhood and just bought two more properties two zip codes over, that's a signal worth paying attention to.

Beyond flippers, the pipeline also tracks appreciation trends at the neighborhood level over time. Which areas are seeing the fastest price growth? Which have been slow for years but are starting to accelerate? That inflection point — a neighborhood that was stagnant but is now picking up — is often more valuable than one that's already well-known for appreciation, because you're still early. The pipeline runs on a cron schedule, pulling incremental updates, deduplicating against existing records, and refreshing all analysis tables so the signals stay current.`,
      lessons: [
        "Public records data is surprisingly dirty — entity names for the same LLC appear in dozens of variations, requiring fuzzy matching to link them",
        "Many real estate professionals purchase properties through LLCs, and a large number of those LLCs are simply named after the street the property is on — which actually makes entity-to-address linking easier once you recognize the pattern",
        "Short hold periods alone aren't enough to identify flippers; filtering by sale price delta cuts the noise significantly",
        "Incremental ingestion with a high-water mark timestamp is much simpler than trying to detect changes in the source data",
      ],
      futureIdeas: [
        "Generalize the pipeline to other metropolitan areas — standardize the ingestion layer so adding a new city is a config change, not a rewrite, eventually scaling to nationwide coverage across all major metros",
        'Add an AI agent on top of the database that can reason about what data to query, build its own visualizations on the fly, and answer open-ended questions like "which neighborhoods are undervalued relative to their neighbors?"',
        "Graph traversal interface to visualize inflows and outflows of where buyers are moving within the city — treat neighborhoods as nodes and transactions as directed edges to surface migration patterns and spot where demand is shifting before prices reflect it",
      ],
    },
  },
  {
    name: "Smart Blinds Automation",
    slug: "smart-blinds",
    description:
      "Automated apartment blinds with a Raspberry Pi using RF signal replay. Opens on a schedule, closes 15 minutes after sunset via a weather API.",
    technologies: [
      "Python",
      "Raspberry Pi",
      "Linux",
      "cron",
      "SDR",
      "REST APIs",
    ],
    highlights: [
      "Decoded proprietary RF remote signals by recording and replaying raw waveforms",
      "Dynamic sunset-based scheduling using a live weather/astronomy API",
      "Weekday vs. weekend schedules via cron (7:30am / 9:00am)",
      "Learned hardware troubleshooting: soldering, signal decoding, RF receivers",
    ],
    writeup: {
      overview: `I have a window in my apartment that is difficult to reach. When I moved in I bought motorized blinds with an RF remote so I would not have to physically climb over furniture to open them every day. That worked great, except now I was waking up in a pitch black room every morning and struggling to get out of bed because no light was getting in. The smart move would have been to put the remote holder on my nightstand. Instead I spent 8 hours learning to solder and built my own automation system.

The project started with a cheap SDR (software-defined radio) USB dongle and a few evenings of signal sniffing. Using Python, I recorded the raw RF waveforms from each button press on the remote. After identifying the right frequency and capturing clean "open" and "close" signals, I wired an RF transmitter module to a Raspberry Pi's GPIO pins and wrote a Python script to replay them on command.

Getting the hardware working was the real challenge and the part of the project I'm most proud of. The first RF module I bought was a bare component that required soldering, which I had never done before. After a few burned pads and a lot of YouTube tutorials, I finally got a clean signal transmitting. It was genuinely satisfying to hear the blinds respond to a command I sent from a script for the first time. I later discovered a pre-assembled board that would have saved me three hours of frustration and cost about $5.

Once the hardware was solved, the scheduling came together quickly. A cron job opens the blinds at 7:30am on weekdays and 9:00am on weekends. Closing is handled by a Python script that runs at 6:00pm each day. It calls a weather API to get that day's sunset time, then sleeps until 15 minutes after sunset and closes the blinds. If the sun has already set by the time the script runs, it closes them immediately. The whole system runs on a Raspberry Pi Zero hidden behind my bed and has been going reliably for months.`,
      lessons: [
        "Could have used a $5 pre-soldered RF board instead of spending 3 hours learning to solder a bare component",
        "SDR signal analysis is deceptively approachable once you find the right frequency; GNU Radio has a steep initial curve but pays off",
        "Writing to crontab programmatically is less elegant than expected; a scheduler library would have been cleaner",
        "Raspberry Pi Zero is more than capable for lightweight always-on automation at a hard-to-beat price point",
      ],
      futureIdeas: [
        "Self-hosted web UI to change schedules without SSH-ing into the Pi",
        "One-day snooze feature to skip the morning open on days I want to sleep in",
      ],
    },
  },
];

export const PERSONAL_INFO: PersonalInfo = {
  title: "Lead Software Engineer",
  location: "New York City, New York",
  email: "reece.bernard21@gmail.com",
  website: "https://reecebernard.dev",
  linkedin: "https://www.linkedin.com/in/maurice-reece-bernard1997/",
  github: "https://github.com/ReeceBernard",
  bio: `Highly analytical Lead Software Engineer with 5+ years of experience architecting scalable data platforms and AI-driven solutions for financial services organizations and dynamic startups. Background includes building production-grade ETL pipelines, leveraging GenAI for efficiency gains, and leading complex, full-stack development initiatives. Consistently deliver transformative technical solutions that accelerate processing times, optimize system performance, and drive substantial business value.`,
};

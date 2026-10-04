# WorkingGent — Multi-Agent Swarm IDE

**WorkingGent** is an autonomous collaborative AI agent workspace and IDE where **6 specialized agents work simultaneously in parallel on a single unified project**, coordinated by a **Lead Master Orchestrator** with an explicit human-in-the-loop approval gate.

## Live Link
- **Platform**: [https://workinggent.vercel.app/](https://workinggent.vercel.app/)

---

## What WorkingGent Does

Instead of siloed, single-task assistants, WorkingGent orchestrates a collaborative swarm to take any natural-language idea from concept to a production-ready application, documentation, live browser testing, GitHub repository, and investor update:

1. **Conversational Ideation ("What do you want to build today?")**: Brainstorm your product concept, receive architectural recommendations, and configure key options.
2. **Structured Multi-Agent Swarm Plan**: The Orchestrator formulates a tailored plan dividing responsibilities across all 6 specialized agents.
3. **The Human Approval Checkpoint**: The Orchestrator halts execution and explicitly asks: *"All 6 agents are primed for this project. Should I proceed?"* Execution will **never** trigger without explicit user approval.
4. **Parallel Swarm Execution**: Once approved, all 6 agents execute concurrently in real time.
5. **Unified Multi-Agent IDE Surface**: Inspect live code, preview the app, view PRD documentation, review web research, observe browser testing logs, and publish to GitHub.

---

## The 6 Agents Inside WorkingGent

```
                       ┌──────────────────────────────┐
                       │   Lead Master Orchestrator   │
                       └──────────────┬───────────────┘
                                      │
         ┌────────────┬───────────────┼───────────────┬────────────┐
         ▼            ▼               ▼               ▼            ▼
     🔍 Search    💻 Coding       📄 Document     🌐 Browser   🐙 GitHub    ✉️ Email
      (SerpApi)   (HTML/CSS/JS)   (PRD & Specs)   (Puppeteer)  (Octokit)   (Nodemailer)
```

### 1. 💻 Coding Agent
Generates clean, idiomatic, and visually stunning frontend applications (HTML5, CSS3, modern JavaScript) with responsive layouts, glassmorphism, animations, and live interactive `<iframe>` previews. Also supports standalone backend languages (Python, TypeScript, Go, Rust, Java, C++).

### 2. 📄 Document Agent
Authors complete, exhaustive technical documentation: PRDs, system architecture, data models, API endpoint specifications, and deployment guides. Supports interactive preview and one-click export to PDF, DOCX, TXT, Excel, and Markdown.

### 3. 🔍 Web Search Agent
Performs live web research via SerpApi, analyzing competitors, industry benchmarks, API documentation, and modern UX patterns, synthesizing findings into an evidence-backed intelligence dossier with clickable source citations.

### 4. 🌐 Browser Automation Agent
Launches headless Chromium using Puppeteer to navigate the generated application preview, test buttons and navigation, verify DOM elements and responsiveness, and report pass/fail test results.

### 5. 🐙 GitHub Agent (Lovable-Style Publishing Hub)
Creates a new repository under the user's connected GitHub profile (`@username`) via OAuth or Personal Access Token (PAT). Stages the generated codebase and documentation, allows selecting **Public** or **Private** visibility, and performs automated commits and pushes with a direct link to the repository.

### 6. ✉️ Email Agent
Drafts and dispatches executive launch briefs, product summaries, and project links to investor, stakeholder, or team email addresses using Nodemailer.

---

## Lovable-Style "Push to GitHub" Workflow

WorkingGent features a seamless publishing flow modeled after Lovable:

- **Connected Account Detection**: Automatically detects your connected GitHub identity (`@username`).
- **One-Click Push Button**: A prominent **`[ 🐙 Push to GitHub ]`** action in the IDE header and GitHub tab.
- **Interactive Publish Modal**:
  - Choose your repository name (auto-slugged from project title).
  - Select visibility: **Public** or **Private**.
  - Custom commit message and description.
  - Real-time progress indicators: creating repository, staging files, committing, and pushing.
  - Direct repository link with an **"Open on GitHub"** button upon completion.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19, TypeScript)
- **Styling**: Vanilla CSS custom design system + [Tailwind CSS v4](https://tailwindcss.com/)
- **Code Editor**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
- **LLM Reasoning**: [Groq](https://groq.com/) API / OpenAI SDK (`llama-3.3-70b-versatile`)
- **Browser Automation**: [Puppeteer](https://pptr.dev/) (headless Chromium)
- **Git & GitHub Integration**: [Octokit](https://github.com/octokit/rest.js), [simple-git](https://github.com/steveukx/git-js)
- **Search Engine**: [SerpApi](https://serpapi.com/)
- **Email Delivery**: [Nodemailer](https://nodemailer.com/)
- **Document Exporting**: `pdf-lib`, `docx`, `xlsx`
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Authentication**: GitHub OAuth 2.0 + Clerk / Firebase

---

## Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/anuraggdubey/WorkingGent.git
cd WorkingGent
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory:

```env
# LLM Provider (Groq)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Web Search
SERPAPI_API_KEY=your_serpapi_key

# Email Dispatch
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

# GitHub Integration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
GITHUB_SESSION_SECRET=your_session_secret
GITHUB_PAT=your_github_personal_access_token

# Application URL
APP_URL=http://localhost:3001
PORT=3001
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## License

This project is licensed under the [MIT License](LICENSE).

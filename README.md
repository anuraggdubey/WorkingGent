# WorkingGent — Autonomous Multi-Agent Swarm IDE

<p align="center">
  <a href="https://workinggent.vercel.app/"><img src="https://img.shields.io/badge/Live_Demo-workinggent.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT" />
</p>

---

## ⚡ Overview

**WorkingGent** is an autonomous collaborative AI agent workspace and IDE where **6 specialized agents work simultaneously in parallel on a single unified project**, coordinated by a **Lead Master Orchestrator** with an explicit human-in-the-loop approval gate.

From a single prompt, WorkingGent conceives, codes, documents, tests via a headless browser, publishes to GitHub, and drafts executive launch emails in real time.

- 🌐 **Live Application**: [https://workinggent.vercel.app/](https://workinggent.vercel.app/)
- 📦 **Source Repository**: [https://github.com/anuraggdubey/WorkingGent](https://github.com/anuraggdubey/WorkingGent)

---

## 🚀 Key Features

- **Lead Master Orchestrator**: Analyzes user prompts, breaks down tasks into multi-agent subgoals, and coordinates parallel execution.
- **Human-in-the-Loop Checkpoint**: Requires explicit user confirmation (*"All 6 agents are primed for this project. Should I proceed?"*) before any agent executes code or dispatches actions.
- **Unified Swarm IDE**:
  - **Monaco Code Editor**: Full-featured code editor with syntax highlighting, multi-file browsing, and diff viewing.
  - **Live Sandbox Preview**: Isolated iframe preview served via an Express static preview server (`server.mjs`) with live updates.
  - **Document Viewer & Multi-format Export**: View system PRDs and export directly to PDF, DOCX, TXT, Excel, and Markdown.
  - **Live Browser Test Runner**: Headless Puppeteer automation that inspects DOM elements, verifies button interactions, and displays real-time execution logs.
  - **Lovable-Style GitHub Publishing Hub**: Detects connected GitHub accounts, lets users specify repository name and visibility (Public/Private), stages files, creates commits, and pushes directly to GitHub with a one-click open link.
  - **Stakeholder Email Dispatcher**: Transmits project briefs, PRDs, and launch links directly to stakeholders using Nodemailer.
- **Repository Intelligence**: Ask questions, analyze architectures, and inspect external GitHub repositories using OAuth or Personal Access Tokens (PAT).
- **Custom Agent Studio**: Create and configure custom AI agents with customized roles, instructions, and parameters.

---

## 🤖 The 6 Specialized Agents

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

| Agent | Technology | Responsibility |
|---|---|---|
| **💻 Coding Agent** | Monaco Editor, HTML5/CSS3/JS, Multi-lang | Generates clean, idiomatic frontend & full-stack web applications with interactive UI previews, responsive design, and glassmorphism. |
| **📄 Document Agent** | `docx`, `pdf-lib`, `xlsx` | Formulates PRDs, architecture specifications, data schemas, API routes, and deployment guides with one-click export. |
| **🔍 Web Search Agent** | SerpApi | Performs live web research on competitors, market benchmarks, design patterns, and technical APIs with clickable citations. |
| **🌐 Browser Automation** | Puppeteer (Headless Chromium) | Automates navigation, DOM validation, button click verification, responsive testing, and live execution reports. |
| **🐙 GitHub Agent** | Octokit, simple-git | Authenticates via GitHub OAuth / PAT, creates remote repositories (public or private), stages source files, commits, and pushes code. |
| **✉️ Email Agent** | Nodemailer | Formulates and sends executive launch summaries and investor updates with links to the live project and repository. |

---

## 🛠️ Tech Stack

### Core Framework & Runtime
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19, TypeScript)
- **Custom Server**: [Express.js](https://expressjs.com/) (`server.mjs`) for isolated project preview sandbox handling
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Vanilla CSS design tokens & dark mode

### Intelligence & Tools
- **LLM Reasoning**: [Groq](https://groq.com/) API / OpenAI SDK (`llama-3.3-70b-versatile`)
- **Code Editor**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
- **Browser Automation**: [Puppeteer](https://pptr.dev/)
- **Git & GitHub**: [Octokit](https://github.com/octokit/rest.js), [simple-git](https://github.com/steveukx/git-js)
- **Web Research**: [SerpApi](https://serpapi.com/)
- **Document Export**: `docx`, `pdf-lib`, `xlsx`, `pdf-parse`, `archiver`
- **Email Delivery**: [Nodemailer](https://nodemailer.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Authentication**: GitHub OAuth 2.0 & Firebase

---

## 📁 Project Directory Structure

```text
WorkingGent/
├── app/                       # Next.js App Router
│   ├── api/                   # 24+ Backend Route Handlers
│   │   ├── orchestrator/      # Swarm orchestration API
│   │   ├── run-coding-agent/  # Code generation endpoints
│   │   ├── browser-automation/# Puppeteer test runner
│   │   ├── generate-document/ # PRD generation
│   │   ├── export-document/   # PDF, DOCX, XLSX exporters
│   │   ├── web-search/        # SerpApi research route
│   │   ├── connect-github/    # GitHub OAuth & PAT routes
│   │   ├── github/            # Repo creation & push handlers
│   │   └── send-email/        # Nodemailer dispatch route
│   ├── agents/                # Swarm IDE workspace route
│   ├── dashboard/             # Overview & metrics
│   ├── automation/            # Agent workflows
│   ├── analytics/             # Performance tracking
│   ├── activity/              # Swarm execution logs
│   ├── layout.tsx             # Root layout & providers
│   └── page.tsx               # Landing & onboarding page
├── components/                # React UI Components
│   ├── orchestrator/          # SwarmIDE main workspace surface (110KB+)
│   ├── agents/                # Agent status & config cards
│   ├── dashboard/             # Metrics, charts, agent grids
│   └── layout/                # Navigation, header, sidebar
├── lib/                       # Services, agents & business logic
│   ├── agents/                # Individual agent service implementations
│   │   ├── orchestratorService.ts
│   │   ├── codingAgentService.ts
│   │   ├── documentAgentService.ts
│   │   ├── browserAutomationAgentService.ts
│   │   ├── githubAgentService.ts
│   │   ├── githubPushService.ts
│   │   ├── webSearchAgentService.ts
│   │   └── emailAgentService.ts
│   ├── github/                # Octokit & Git integration helpers
│   ├── AuthContext.tsx        # Authentication provider
│   └── firebase.ts            # Firebase client config
├── projects/                  # Sandboxed workspaces for generated code
├── server.mjs                 # Express + Next.js custom server for preview sandboxing
├── package.json
└── tsconfig.json
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js**: v20 or later
- **npm** or **pnpm**
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/anuraggdubey/WorkingGent.git
cd WorkingGent
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# LLM Provider (Groq / OpenAI Compatible)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Web Research (SerpApi)
SERPAPI_API_KEY=your_serpapi_key

# Email Dispatcher (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

# GitHub Integration (OAuth & PAT)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
GITHUB_SESSION_SECRET=your_random_session_secret
GITHUB_PAT=your_github_personal_access_token

# Application Config
APP_URL=http://localhost:3001
PORT=3001

# Firebase (Optional: For cloud agent persistence)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Start the Development Server
```bash
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🐙 Lovable-Style Push to GitHub Workflow

1. **Ideate**: Submit a prompt to the Lead Master Orchestrator.
2. **Review & Approve**: Review the 6-agent breakdown and click **"Proceed"** to trigger execution.
3. **Inspect Real-Time Output**: Watch the code, PRD documentation, web research, and live browser tests run in parallel.
4. **Push with One Click**:
   - Click **`[ 🐙 Push to GitHub ]`** in the IDE header.
   - Choose repository name, custom commit message, and **Public** or **Private** visibility.
   - Click **Confirm & Push**. WorkingGent creates the repository under your GitHub account, stages code, and provides a direct link to the new repository.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

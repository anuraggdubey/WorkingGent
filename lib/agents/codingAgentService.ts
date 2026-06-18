import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import { AgentExecutionError, createLlmError } from "@/lib/agents/shared"
import { fileTool } from "@/lib/tools/fileTool"
import { previewTool } from "@/lib/tools/previewTool"

export interface ProjectFiles {
    html: string
    css: string
    js: string
}

const CODING_AGENT_SYSTEM_PROMPT = `You are a world-class UI designer and frontend engineer. You produce award-winning, visually stunning static websites.

CRITICAL CONTEXT: This platform generates ONLY static HTML/CSS/JS. There is no backend, no database, no server. Because of this, the VISUAL DESIGN must be absolutely exceptional — it is the entire product. If the design looks basic, generic, or like a student project, you have FAILED. Every site you produce must look like it was designed by a top-tier agency and could appear on Awwwards, Dribbble, or Behance.

═══════════════════════════════════════════
VISUAL DESIGN STANDARDS (HIGHEST PRIORITY)
═══════════════════════════════════════════

COLOR SYSTEM — Never use raw colors. Always use curated, harmonious palettes:
- Define ALL colors as HSL values in CSS :root for easy theming.
- Use a sophisticated dark or light base with carefully chosen accent colors.
- Example premium palettes (pick one or create a harmonious variant):
  • Dark Luxury: bg hsl(230,25%,7%), surface hsl(230,20%,11%), accent hsl(250,85%,65%), text hsl(0,0%,92%)
  • Warm Minimal: bg hsl(40,30%,97%), surface hsl(0,0%,100%), accent hsl(25,95%,55%), text hsl(230,25%,15%)
  • Ocean Pro: bg hsl(215,30%,6%), surface hsl(215,25%,12%), accent hsl(195,95%,50%), text hsl(210,15%,88%)
  • Forest SaaS: bg hsl(160,15%,97%), surface hsl(0,0%,100%), accent hsl(160,65%,45%), text hsl(160,20%,12%)
- Always include: --primary, --primary-hover, --primary-glow (with alpha for glows), --bg, --surface, --surface-elevated, --border, --text, --text-muted, --text-subtle, --accent, --success, --warning, --error.
- Use gradient overlays: linear-gradient(135deg, var(--primary), var(--accent)) on hero sections and CTAs.
- Never use pure black (#000) or pure white (#fff) as backgrounds. Use tinted neutrals.

TYPOGRAPHY — Professional type hierarchy is non-negotiable:
- Link Google Fonts in <head>: use "Inter" for body, "Plus Jakarta Sans" or "Sora" or "Cabinet Grotesk" for headings. Example: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
- Hero headings: 3.5rem–5rem, font-weight 800, letter-spacing -0.03em, line-height 1.08. Use gradient text: background: linear-gradient(...); -webkit-background-clip: text; -webkit-text-fill-color: transparent.
- Section headings: 2rem–2.5rem, font-weight 700, letter-spacing -0.02em.
- Body text: 1rem–1.125rem, font-weight 400, line-height 1.7, color var(--text-muted).
- Small text/labels: 0.75rem, font-weight 600, letter-spacing 0.08em, text-transform uppercase, color var(--text-subtle).
- Subheadings: 1.125rem–1.25rem, font-weight 500, line-height 1.6.

SPACING & LAYOUT — Use a strict 8px grid system:
- Section padding: 6rem 0 (vertical), max-width 1200px centered.
- Card padding: 2rem–2.5rem. Card gap in grids: 1.5rem–2rem.
- Element spacing: multiples of 0.5rem (8px). No random px values.
- Use CSS Grid for page layouts, Flexbox for component internals.
- Grids: repeat(auto-fit, minmax(320px, 1fr)) for responsive card grids.

COMPONENTS — Each must be production-quality:

NAVBAR:
- Glassmorphism: background: rgba(bg, 0.7); backdrop-filter: blur(20px) saturate(180%); border-bottom: 1px solid rgba(255,255,255,0.05).
- Fixed top, z-index 1000. Logo left, links center, CTA button right.
- Active link: underline offset with primary color, or pill background.
- Mobile: hamburger icon that opens a full-height slide-in menu with smooth transition.
- On scroll: add a subtle shadow and slightly more opaque background.

HERO SECTION:
- Full viewport height or min-height: 90vh. Centered content with dramatic heading.
- Add a subtle animated gradient orb or mesh background: use CSS radial-gradient blobs with animation.
- Example animated bg: two or three absolutely-positioned radial-gradient circles with slow transform/translate keyframe animations.
- CTA buttons: primary (filled with gradient + glow shadow) and secondary (outlined/ghost).
- Include a badge/pill above the heading: "✨ Introducing v2.0" styled as a small rounded pill with border.
- Subtle floating/parallax decorative elements.

CARDS:
- Background: var(--surface). Border: 1px solid var(--border). Border-radius: 1rem–1.25rem.
- Box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03).
- Hover: transform: translateY(-4px); box-shadow: 0 8px 30px rgba(primary, 0.12); border-color: var(--primary-glow).
- Transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1).
- Icons inside cards: 48px–56px container with primary-glow background, centered icon.

BUTTONS:
- Primary: background gradient, color white, padding 0.875rem 2rem, border-radius 0.75rem, font-weight 600.
  Hover: transform scale(1.02), brighter gradient, glow box-shadow 0 4px 20px rgba(primary, 0.35).
- Secondary: transparent bg, 1px border, same radius. Hover: light fill.
- All buttons: transition 0.2s ease, cursor pointer, no default outlines (add custom focus ring).

FORMS:
- Inputs: bg var(--surface), border 1px solid var(--border), border-radius 0.75rem, padding 1rem 1.25rem.
- Focus: border-color var(--primary), box-shadow 0 0 0 3px rgba(primary, 0.12), outline none.
- Labels: uppercase small text, margin-bottom 0.5rem, font-weight 600.
- Submit button: full-width primary button style.

FOOTER:
- Multi-column grid layout. Background slightly different from page bg.
- Columns: Brand/description, Quick Links, Resources, Contact/Social.
- Social icons row at bottom. Copyright text. Subtle top border.

ANIMATIONS & MICRO-INTERACTIONS:
- Scroll-triggered reveal: use IntersectionObserver in JS to add ".visible" class as elements enter viewport.
  CSS: elements start with opacity:0; transform: translateY(30px); transition: 0.6s ease;
  .visible: opacity:1; transform: translateY(0).
- Stagger children: use transition-delay on nth-child for cascading reveal.
- Counter animations: use JS to animate numbers from 0 to target value in stats sections.
- Smooth hover on ALL interactive elements — links, buttons, cards, images.
- CSS @keyframes for: floating elements (translateY oscillation), gradient rotation, pulse glow on CTAs.
- Page transitions: fade content in/out when switching hash routes.

ICONS:
- Use Lucide icons via CDN: <script src="https://unpkg.com/lucide@latest"></script>. Then use <i data-lucide="icon-name"></i> and call lucide.createIcons() in script.js.
- Icon style: consistent stroke-width, sized proportionally (20px in nav, 24px in cards, 32px+ in features).

IMAGES & VISUAL ELEMENTS:
- Since we cannot use real images, create striking visual placeholders:
  • Gradient boxes with rounded corners and aspect-ratio for image slots.
  • CSS-only decorative elements: gradient orbs, mesh backgrounds, geometric shapes.
  • Use emojis strategically as visual accents in feature cards (🚀 ⚡ 💎 🎯 etc).
  • Use SVG patterns or shapes for visual interest.

RESPONSIVE DESIGN:
- Mobile-first approach. Breakpoints: 480px, 768px, 1024px, 1280px.
- Mobile: single column, hamburger menu, reduced padding (1.25rem), smaller headings (2rem hero).
- Tablet: 2-column grids, adjusted spacing.
- Desktop: full layout, max-width container, all features visible.
- Test-proof: no horizontal overflow, no tiny tap targets, minimum 44px touch targets on mobile.

═══════════════════════════════════════════
MULTI-PAGE ARCHITECTURE
═══════════════════════════════════════════

- ALWAYS build multi-page websites with 3–5 pages using hash-based SPA routing.
- Each "page" is a <section> shown/hidden via JS. Router listens to hashchange.
- Include a persistent header/navbar + footer across all pages.
- Active nav link must be visually highlighted.
- Page transitions: fade in/out when switching (opacity + transform animation).
- Minimum pages: Home, About/Story, Services/Features, Contact. Add more based on request.
- Every page must have FULL, RICH content. Never an empty section with just a heading.

═══════════════════════════════════════════
IMPLEMENTATION RULES
═══════════════════════════════════════════

1. Return EXACTLY three markdown-fenced files: index.html, style.css, script.js.
2. The HTML <head> must include: meta viewport, Google Fonts link, Lucide CDN script, link to style.css.
3. The </body> must include: script src="script.js", and lucide.createIcons() call.
4. CSS file must be at least 300+ lines with comprehensive styling. No shortcuts.
5. JS must handle: hash routing, mobile menu, scroll animations (IntersectionObserver), counter animations, form interactions, active nav states, and smooth scroll.
6. NEVER leave TODOs, placeholders, or "add more here" comments.
7. NEVER produce minimal/basic output. The first render must look world-class.
8. Use realistic, believable content — real-sounding company names, feature descriptions, testimonials with names, stats with numbers.
9. No external CSS frameworks (no Bootstrap, no Tailwind CDN). All CSS must be custom and hand-crafted.

Complexity notice — if the user's request needs backend (databases, auth, payments, real APIs, file uploads, real-time features), prepend:
"⚠️ COMPLEXITY NOTE: [brief explanation of what was simulated/mocked]."
Then still build the most impressive possible frontend with mocked versions.

Dashboard / Admin / SaaS UI expectations:
- Sidebar + topbar layout. Summary KPI cards with icons and trend indicators.
- At least one chart area (use CSS-only bar/donut charts or canvas-drawn charts in JS).
- Data tables with alternating rows, sort icons, status badges.
- Dense grid layout, not single-column stacking.`



export function parseAgentOutput(text: string): ProjectFiles & { complexityNote?: string } {
    const htmlMatch = text.match(/```(?:index\.html|html)\s*([\s\S]*?)```/i)
    const cssMatch = text.match(/```(?:style\.css|css)\s*([\s\S]*?)```/i)
    const jsMatch = text.match(/```(?:script\.js|javascript|js)\s*([\s\S]*?)```/i)

    // Extract complexity note if present (text before the first code block)
    let complexityNote: string | undefined
    const firstCodeBlockIndex = text.search(/```/)
    if (firstCodeBlockIndex > 0) {
        const preamble = text.substring(0, firstCodeBlockIndex).trim()
        if (preamble.includes("COMPLEXITY NOTE") || preamble.includes("⚠️")) {
            complexityNote = preamble
        }
    }

    const html = htmlMatch?.[1]?.trim()
    const css = cssMatch?.[1]?.trim()
    const js = jsMatch?.[1]?.trim()

    if (!html || css === undefined || js === undefined) {
        throw new AgentExecutionError(
            "INVALID_LLM_OUTPUT",
            "Coding agent did not return the required file structure",
            502
        )
    }

    return { html, css, js, complexityNote }
}

const LANGUAGE_LABELS: Record<string, string> = {
    "html-css-js": "HTML / CSS / JS",
    python: "Python",
    javascript: "JavaScript",
    typescript: "TypeScript",
    react: "React (JSX/TSX)",
    java: "Java",
    cpp: "C++",
    go: "Go",
    rust: "Rust",
    swift: "Swift",
    ruby: "Ruby",
    php: "PHP",
}

const SINGLE_FILE_SYSTEM_PROMPT = (lang: string) => `You are a senior software engineer.

Your job is to generate clean, idiomatic, production-quality ${lang} code.

Rules:
1. Return a SINGLE fenced code block with the complete source file.
2. The code must be complete, runnable, and well-structured.
3. Include proper imports/includes at the top.
4. Add clear inline comments for complex logic.
5. Use modern language features and best practices.
6. Never leave TODOs, placeholders, or incomplete sections.
7. If the request involves a CLI tool, include argument parsing.
8. If the request involves a web server, include routing and response handling.
9. Make the code substantial and impressive, not a minimal stub.
10. Output ONLY the code block, no explanations before or after.`

export function parseSingleFileOutput(text: string, language: string): { code: string; filename: string } {
    const match = text.match(/```(?:\w+)?\s*([\s\S]*?)```/)
    const code = match?.[1]?.trim()

    if (!code) {
        throw new AgentExecutionError("INVALID_LLM_OUTPUT", "Coding agent did not return a code block", 502)
    }

    const extensions: Record<string, string> = {
        python: "main.py",
        javascript: "index.js",
        typescript: "index.ts",
        react: "App.tsx",
        java: "Main.java",
        cpp: "main.cpp",
        go: "main.go",
        rust: "main.rs",
        swift: "main.swift",
        ruby: "main.rb",
        php: "index.php",
    }

    return { code, filename: extensions[language] ?? "main.txt" }
}

export async function runCodingAgent(prompt: string, language?: string) {
    const lang = language && language !== "html-css-js" ? language : null

    if (!lang) {
        // Original HTML/CSS/JS flow
        let raw: string
        try {
            raw = await completeWithOpenRouter({
                system: CODING_AGENT_SYSTEM_PROMPT,
                user: `Build a visually STUNNING, premium, multi-page website.\n\nUser request:\n${prompt}\n\nDESIGN IS THE #1 PRIORITY. This is a static site — the visual quality IS the product.\n\nMandatory design checklist:\n✓ Multi-page SPA with hash routing (minimum: Home, About, Services/Features, Contact)\n✓ Glassmorphism navbar with scroll effect + mobile hamburger menu\n✓ Hero section: 90vh, gradient text heading, animated background orbs, badge pill, dual CTA buttons\n✓ Feature/service cards: hover lift + glow, icon containers, staggered scroll animation\n✓ Stats section with animated counters\n✓ Testimonials with avatar gradients and quote styling\n✓ Contact form with styled inputs, focus rings, and validation\n✓ Multi-column footer with links and social icons\n✓ Google Fonts (Inter + Plus Jakarta Sans), Lucide icons via CDN\n✓ HSL color palette in :root — NO raw colors, NO pure black/white\n✓ IntersectionObserver scroll reveal animations with stagger\n✓ Fully responsive: mobile, tablet, desktop\n✓ 300+ lines of custom CSS minimum\n✓ If backend features are needed, add complexity note and mock them\n\nReturn exactly three files: index.html, style.css, script.js.`,
                maxTokens: 8000,
                temperature: 0.7,
            })
        } catch (error) {
            throw createLlmError(error, "Coding generation failed")
        }

        const { complexityNote, ...files } = parseAgentOutput(raw)
        const projectId = `project-${Date.now()}`

        await fileTool(projectId, [
            { name: "index.html", content: files.html },
            { name: "style.css", content: files.css },
            { name: "script.js", content: files.js },
        ])

        return {
            projectId,
            files,
            raw,
            preview: previewTool(projectId),
            language: "html-css-js",
            complexityNote,
        }
    }

    // Single-file language flow
    const langLabel = LANGUAGE_LABELS[lang] ?? lang
    let raw: string
    try {
        raw = await completeWithOpenRouter({
            system: SINGLE_FILE_SYSTEM_PROMPT(langLabel),
            user: `Write ${langLabel} code for this task:\n\n${prompt}`,
            maxTokens: 8000,
            temperature: 0.7,
        })
    } catch (error) {
        throw createLlmError(error, "Coding generation failed")
    }

    const { code, filename } = parseSingleFileOutput(raw, lang)
    const projectId = `project-${Date.now()}`

    await fileTool(projectId, [{ name: filename, content: code }])

    return {
        projectId,
        files: null,
        singleFile: { code, filename, language: lang },
        raw,
        preview: null,
        language: lang,
    }
}

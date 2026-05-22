"""Full Probe pipeline test with mock fc_search results.

GPT中转站没钱 → mock 30 fc_search results with realistic AI answers.
其余步骤全部真实跑 DeepSeek：
  brand_profiler → market_mirror → gap_analysis →
  citation_analyzer → source_authority →
  company_scorer → ai_narrative

输出: probe_full_output.json + probe_report.html
"""

import asyncio
import json
import sys
import time
import os

os.environ.setdefault("DEEPSEEK_API_KEY", "sk-9a5ae063b83144cead80966081e82030")

# ─── Mock fc_search results for 30 Notion queries ──────────

QUERIES = [
    "best productivity tool 2026",
    "Notion alternative for teams",
    "all-in-one workspace app",
    "team collaboration software comparison",
    "best project management tool for startups",
    "Notion vs Confluence for documentation",
    "what do product managers use for documentation",
    "knowledge base software for remote teams",
    "best note taking app for developers",
    "team wiki software comparison 2026",
    "Notion review for enterprise",
    "best tools for startup operations",
    "second brain productivity system app",
    "best database software for non-technical teams",
    "task management vs project management tools",
    "what is the best tool for agile teams",
    "personal knowledge management software",
    "best app for meeting notes and action items",
    "Notion pricing vs competitors 2026",
    "best free project management software",
    "top tools for distributed teams",
    "SaaS startup tool stack recommendations",
    "best documentation tool for engineering teams",
    "what do startups use for internal wiki",
    "best cross-functional team collaboration tool",
    "work management platform comparison",
    "top productivity apps 2026 ranked",
    "Notion AI features review",
    "best tool for product roadmap planning",
    "all-in-one workspace for agencies",
]

MOCK_ANSWERS = [
    # Each entry: (answer_text, searched_queries, raw_citations)
    (
        "For productivity in 2026, Notion stands out as the top all-in-one workspace combining docs, wikis, and project management. Its AI features automate repetitive tasks like meeting summaries and ticket triaging. Other strong options include Monday.com for visual project tracking and ClickUp for budget-conscious teams. Notion's flexibility and template ecosystem make it the best choice for teams that need a single source of truth.",
        ["best productivity tool 2026"],
        [{"url": "https://techcrunch.com/2026/01/best-productivity-tools", "snippet": "Notion leads the 2026 productivity tools ranking with its AI-powered workspace..."},
         {"url": "https://www.forbes.com/advisor/business/best-productivity-apps", "snippet": "Notion tops Forbes' list of best productivity apps for teams in 2026..."}],
    ),
    (
        "If you're looking for Notion alternatives, consider Coda for its powerful formulas and database capabilities, or Confluence if you're already in the Atlassian ecosystem. However, Notion remains the most well-rounded option for most teams. Its AI integration and community template library are unmatched. Some teams switch to Linear for task management but keep Notion for documentation.",
        ["Notion alternative for teams 2026"],
        [{"url": "https://www.g2.com/compare/notion-vs-coda", "snippet": "G2 comparison: Notion vs Coda vs Confluence - user reviews and ratings..."},
         {"url": "https://reddit.com/r/productivity/comments/notion_alternatives", "snippet": "Reddit discussion: Best Notion alternatives for teams in 2026..."}],
    ),
    (
        "An all-in-one workspace app should combine documents, databases, project management, and collaboration features. Notion is the category leader here, offering flexible building blocks that adapt to any workflow. Competitors like Coda and Slite offer similar features but lack Notion's ecosystem depth and third-party integrations.",
        ["all-in-one workspace app 2026"],
        [{"url": "https://docs.notion.so/getting-started", "snippet": "Notion official docs: Getting started with your all-in-one workspace..."},
         {"url": "https://theverge.com/2026/notion-workspace-review", "snippet": "The Verge review: Notion is the Swiss Army knife of productivity apps..."}],
    ),
    (
        "Team collaboration software in 2026 splits into several categories: all-in-one platforms (Notion, Coda), dedicated project management (Asana, Monday.com), and communication-first tools (Slack, Teams). Notion differentiates itself by unifying docs, projects, and knowledge bases. Teams report 30% fewer tool switches after consolidating into Notion.",
        ["team collaboration software comparison 2026"],
        [{"url": "https://www.wired.com/story/best-collaboration-software-2026", "snippet": "Wired: The best team collaboration software of 2026..."},
         {"url": "https://www.g2.com/categories/collaboration", "snippet": "G2 Grid for Collaboration Software: Notion ranked #1 in satisfaction..."}],
    ),
    (
        "For startups, the best project management tool depends on team size and workflow complexity. Notion is ideal for startups under 50 people who need flexibility across docs, wikis, and light project management. As teams scale, Linear becomes better for engineering task tracking, while Notion remains the documentation hub. The combination of Notion + Linear is the most popular stack among Y Combinator startups.",
        ["best project management tool for startups 2026"],
        [{"url": "https://techcrunch.com/2026/03/startup-tool-stack-2026", "snippet": "TechCrunch: The definitive startup tool stack for 2026..."},
         {"url": "https://www.ycombinator.com/library/startup-tools", "snippet": "YC Startup Library: Most recommended tools by YC founders..."}],
    ),
    (
        "Notion vs Confluence is a common debate for documentation. Notion wins on flexibility and user experience — its block-based editor is more intuitive and supports richer content types. Confluence is stronger for large enterprises that need rigid permission structures and Jira integration. For teams under 500 people, Notion is typically the better choice. For regulated industries with strict compliance needs, Confluence may be necessary.",
        ["Notion vs Confluence for documentation 2026"],
        [{"url": "https://www.atlassian.com/software/confluence/comparison/notion-alternative", "snippet": "Atlassian's official comparison: Confluence vs Notion for documentation..."},
         {"url": "https://theverge.com/2026/notion-vs-confluence-review", "snippet": "The Verge: Notion vs Confluence — which documentation tool is right for you?"}],
    ),
    (
        "Product managers increasingly use Notion as their primary documentation tool. Its flexibility lets PMs create product specs, user research databases, and roadmaps in one place. Notion's database views (timeline, calendar, kanban) replace the need for separate roadmapping tools. The AI features help draft PRDs and summarize user feedback. Other popular PM tools include Productboard for feedback management and Jira for engineering handoff.",
        ["what do product managers use for documentation 2026"],
        [{"url": "https://medium.com/@pm/tools-we-use-in-2026", "snippet": "A product manager's toolkit 2026: Notion, Linear, and Figma lead the pack..."},
         {"url": "https://news.ycombinator.com/item?id=notion_pm_tools", "snippet": "HN discussion: What tools do product managers actually use in 2026?"}],
    ),
    (
        "Knowledge base software for remote teams needs to support async collaboration, searchability, and easy onboarding. Notion excels here with its interconnected pages, powerful search, and AI that can answer questions based on existing docs. Alternatives like GitBook are better for public-facing documentation, while Guru specializes in sales knowledge bases. But for internal team wikis, Notion is the most versatile pick.",
        ["knowledge base software for remote teams 2026"],
        [{"url": "https://www.helpscout.com/blog/knowledge-base-software/", "snippet": "Help Scout: Best knowledge base software for remote teams in 2026..."},
         {"url": "https://www.capterra.com/knowledge-management-software/", "snippet": "Capterra reviews: Top knowledge management tools — Notion rated 4.7/5..."}],
    ),
    (
        "Developers have specific needs for note-taking: markdown support, code block syntax highlighting, and integration with dev tools. Notion supports all three with its code blocks supporting 60+ languages, GitHub/GitLab integration, and markdown export. Obsidian is preferred by developers who want local-first, plain-text markdown. Notion wins when teams need to share notes with non-technical stakeholders.",
        ["best note taking app for developers 2026"],
        [{"url": "https://dev.to/community/best-note-taking-apps-for-developers-2026", "snippet": "DEV.to: Best note taking apps for developers in 2026 — Notion vs Obsidian vs Bear..."},
         {"url": "https://stackoverflow.blog/developer-tools-2026", "snippet": "Stack Overflow Blog: Developer productivity tools survey results..."}],
    ),
    (
        "Team wiki software in 2026 ranges from simple (Slite) to enterprise-grade (Confluence) to flexible (Notion). Notion's wiki capabilities benefit from its database features — you can create dynamic wikis with linked databases, filtered views, and automated updates. The template gallery has hundreds of wiki templates. For pure wiki use cases, Notion is the overall best choice for most teams.",
        ["team wiki software comparison 2026"],
        [{"url": "https://www.notion.so/templates/category/wiki", "snippet": "Official Notion Wiki Templates: Hundreds of free, customizable wiki templates..."},
         {"url": "https://www.getapp.com/collaboration-software/team-wiki/", "snippet": "GetApp: Compare the best team wiki software — Notion vs Slite vs Nuclino..."}],
    ),
    (
        "Notion for enterprise has matured significantly. It now offers SAML SSO, SCIM provisioning, advanced permission controls, and SOC 2 compliance. Enterprise customers like Pixar and Headspace use Notion across thousands of employees. The main limitations compared to SharePoint or Confluence are fewer customization options for intranet portals and less granular audit logging. For most enterprises under 5000 employees, Notion meets requirements.",
        ["Notion review for enterprise 2026"],
        [{"url": "https://www.gartner.com/reviews/market/collaboration-software", "snippet": "Gartner Peer Insights: Notion enterprise reviews — 4.5/5 stars..."},
         {"url": "https://www.notion.so/enterprise", "snippet": "Official Notion Enterprise: Security, admin controls, and dedicated support..."}],
    ),
    (
        "Startup operations require a lean tool stack that scales. Notion serves as the operating system for many startups, handling everything from employee handbooks to investor updates to sprint planning. It replaces 3-5 separate tools for early-stage companies. Ramp is best for expense management, Gusto for HR, and Stripe for payments — all of which integrate with Notion.",
        ["best tools for startup operations 2026"],
        [{"url": "https://www.saastr.com/startup-tech-stack-2026", "snippet": "SaaStr: The lean startup operations stack for 2026..."},
         {"url": "https://firstround.com/review/startup-tools/", "snippet": "First Round Review: The tools high-growth startups actually use..."}],
    ),
    (
        "Building a 'second brain' — a personal knowledge management system — has become mainstream in 2026. Notion is the most popular tool for this due to its flexible database structures and template community. Tiago Forte's PARA method has dedicated Notion templates used by over 500,000 people. Obsidian is preferred by those who prioritize local storage and graph views, but Notion's collaboration features make it better for shared knowledge bases.",
        ["second brain productivity system app 2026"],
        [{"url": "https://medium.com/personal-growth/second-brain-apps-2026", "snippet": "Medium: Building a second brain — Notion vs Obsidian vs Roam in 2026..."},
         {"url": "https://fortelabs.com/blog/para-notion-setup", "snippet": "Forte Labs: How to set up the PARA method in Notion..."}],
    ),
    (
        "Non-technical teams need databases that feel like spreadsheets but behave like apps. Notion's database is the standout here — it supports relations, rollups, formulas, and multiple views (kanban, calendar, gallery, timeline) without requiring SQL or coding. Airtable is more powerful for complex data operations, but Notion is more accessible for most business users. The learning curve for Notion databases is about 30 minutes vs hours for Airtable.",
        ["best database software for non-technical teams 2026"],
        [{"url": "https://www.capterra.com/database-management-software/", "snippet": "Capterra: Best database software for non-technical users..."},
         {"url": "https://www.notion.so/help/databases", "snippet": "Official Notion Help: Everything you need to know about Notion databases..."}],
    ),
    (
        "Task management and project management are often conflated but serve different needs. Task management (Todoist, Things) focuses on individual to-do lists. Project management (Asana, Monday.com) handles team workflows and dependencies. Notion bridges both — you can build a personal task tracker and a team project dashboard in the same workspace. This flexibility is Notion's biggest advantage and also its biggest weakness (requires setup).",
        ["task management vs project management tools 2026"],
        [{"url": "https://www.pcmag.com/picks/best-project-management-software", "snippet": "PCMag: Best project management software of 2026..."},
         {"url": "https://reddit.com/r/productivity/comments/task_vs_project_management", "snippet": "Reddit: The difference between task management and project management tools..."}],
    ),
    (
        "Agile teams need tools that support sprint planning, standups, retrospectives, and backlog management. Jira remains the standard for pure agile development, but Notion has gained traction as a lightweight alternative. Notion's sprint planning template and database views (timeline, board) cover 80% of agile needs without Jira's complexity. Engineering teams at startups like Vercel and Ramp use Notion for sprint planning alongside Linear for issue tracking.",
        ["what is the best tool for agile teams 2026"],
        [{"url": "https://www.atlassian.com/agile/tools", "snippet": "Atlassian: Best agile project management tools compared..."},
         {"url": "https://www.lennysnewsletter.com/p/agile-tools-startup", "snippet": "Lenny's Newsletter: Why startups are moving from Jira to Notion + Linear..."}],
    ),
    (
        "Personal knowledge management (PKM) has evolved beyond simple note-taking. Notion is the dominant platform for structured PKM, with its database-backed approach allowing users to create interconnected systems for learning, projects, and goals. The Notion template marketplace has over 20,000 community templates for PKM workflows. Obsidian leads for networked thought with graph views, while Notion leads for practical, actionable knowledge management.",
        ["personal knowledge management software 2026"],
        [{"url": "https://nesslabs.com/best-pkm-tools-2026", "snippet": "Ness Labs: The best personal knowledge management tools in 2026..."},
         {"url": "https://www.notion.so/templates/category/personal", "snippet": "Official Notion Templates: Personal knowledge management templates..."}],
    ),
    (
        "For meeting notes and action items, Notion is the top recommendation. Its meeting notes template automatically creates linked databases for attendees, action items, and follow-ups. The AI can generate meeting summaries from raw notes. Notion Calendar (formerly Cron) integrates meetings with notes. Fellow is better for structured 1:1 meetings with coaching features, but Notion is more versatile for general team use.",
        ["best app for meeting notes and action items 2026"],
        [{"url": "https://www.notion.so/templates/meeting-notes", "snippet": "Official Notion: Meeting notes template with integrated action items..."},
         {"url": "https://zapier.com/blog/best-meeting-notes-apps/", "snippet": "Zapier: The 7 best meeting notes apps in 2026..."}],
    ),
    (
        "Notion pricing in 2026 starts at $10/user/month for Plus, $18/user/month for Business, with custom Enterprise pricing. Compared to competitors: Confluence is $6/user/month (cheaper but less flexible), Coda is $12/user/month (similar), and Monday.com starts at $9/user/month (but charges for features Notion includes). Notion's free plan is generous for individuals and small teams. The main cost concern for large teams is that Notion's per-seat pricing adds up quickly.",
        ["Notion pricing vs competitors 2026"],
        [{"url": "https://www.notion.so/pricing", "snippet": "Official Notion Pricing: Plans starting at $10/user/month..."},
         {"url": "https://www.trustradius.com/compare/notion-vs-coda-vs-confluence", "snippet": "TrustRadius: Notion vs Coda vs Confluence pricing comparison 2026..."}],
    ),
    (
        "The best free project management software in 2026 includes Notion (generous free tier with unlimited pages for up to 10 guests), ClickUp (feature-rich but cluttered), Trello (best for simple kanban), and Asana (good free tier for up to 15 users). Notion's free plan stands out because it doesn't limit the number of pages or databases — only guest count and file uploads. For bootstrapped startups, Notion's free plan can replace 3-4 paid tools.",
        ["best free project management software 2026"],
        [{"url": "https://www.techrepublic.com/article/best-free-project-management-software-2026/", "snippet": "TechRepublic: Best free project management software for small teams..."},
         {"url": "https://www.forbes.com/advisor/business/free-project-management-software/", "snippet": "Forbes: Best free project management software of 2026..."}],
    ),
    (
        "Distributed teams need tools that bridge time zones and communication gaps. Notion excels for async collaboration — its persistent pages, comments, and AI summaries keep everyone aligned without meetings. Loom is the go-to for async video updates. Slack remains essential for real-time chat. The ideal distributed team stack: Notion (docs/wiki/projects) + Slack (chat) + Loom (async video) + Linear (engineering tasks).",
        ["top tools for distributed teams 2026"],
        [{"url": "https://www.remote.tools/best-tools-distributed-teams-2026", "snippet": "Remote Tools: Best software for distributed and remote teams..."},
         {"url": "https://www.lennysnewsletter.com/p/remote-team-tools", "snippet": "Lenny's Newsletter: Tools the best remote teams use in 2026..."}],
    ),
    (
        "The modern SaaS startup tool stack in 2026 centers on Notion for documentation and operations. The common stack: Notion (docs/wiki/runbooks), Linear (engineering), Slack (communication), Figma (design), Stripe (payments), Vercel (hosting), and Supabase (database). Notion's value is that it replaces Confluence + Google Docs + Airtable + a wiki tool. The Notion API allows deep integrations with the rest of the stack.",
        ["SaaS startup tool stack recommendations 2026"],
        [{"url": "https://www.saastr.com/saas-tool-stack-2026", "snippet": "SaaStr Annual: The definitive SaaS startup tool stack for 2026..."},
         {"url": "https://openviewpartners.com/blog/startup-tool-stack/", "snippet": "OpenView: The PLG startup tech stack — Notion, Linear, and beyond..."}],
    ),
    (
        "Engineering teams have specific documentation needs: API references, architecture decision records (ADRs), runbooks, and onboarding docs. Notion supports all these with code blocks, database-backed ADR templates, and GitHub integration that links PRs to docs. GitBook is better for public API documentation with OpenAPI support. For internal engineering docs, Notion + a markdown linter is the best combination.",
        ["best documentation tool for engineering teams 2026"],
        [{"url": "https://stackoverflow.blog/engineering-docs-tools-2026", "snippet": "Stack Overflow Blog: Best documentation tools for engineering teams..."},
         {"url": "https://news.ycombinator.com/item?id=engineering_docs_2026", "snippet": "HN: What documentation tools do engineering teams use in 2026?"}],
    ),
    (
        "Startups increasingly use Notion as their internal wiki. It's faster to set up than Confluence, more flexible than Slite, and has better search than Google Docs. The key advantage is that the wiki lives alongside project management and docs — there's no context switching. Common wiki structures include company handbook, onboarding guide, engineering runbooks, sales playbooks, and product specs.",
        ["what do startups use for internal wiki 2026"],
        [{"url": "https://www.notion.so/templates/category/company-wiki", "snippet": "Official Notion: Company wiki templates for startups..."},
         {"url": "https://review.firstround.com/startup-internal-wikis", "snippet": "First Round Review: How top startups build and maintain internal wikis..."}],
    ),
    (
        "Cross-functional team collaboration requires tools that work well for everyone from engineering to marketing. Notion's flexibility is its strength here — engineers can use markdown and code blocks while marketers use rich media and galleries, all in the same workspace. The challenge is governance: without clear conventions, Notion workspaces can become chaotic. Teams that invest in an information architecture upfront get the most value.",
        ["best cross-functional team collaboration tool 2026"],
        [{"url": "https://www.businessinsider.com/best-collaboration-tools-2026", "snippet": "Business Insider: Best cross-functional collaboration tools for 2026..."},
         {"url": "https://hbr.org/2026/03/cross-functional-collaboration-tools", "snippet": "Harvard Business Review: The tools that enable true cross-functional collaboration..."}],
    ),
    (
        "Work management platforms in 2026 are consolidating around a few leaders. Notion leads in flexibility and user satisfaction. Monday.com leads in sales and CRM workflows. Asana leads in traditional project management. ClickUp competes on features-per-dollar. Notion's differentiation is that it handles unstructured work (docs, brainstorming, research) alongside structured work (databases, sprints, OKRs) — most platforms do one or the other well, not both.",
        ["work management platform comparison 2026"],
        [{"url": "https://www.gartner.com/reviews/market/work-management-platforms", "snippet": "Gartner: Work Management Platforms Market Guide 2026..."},
         {"url": "https://www.forrester.com/report/work-management-2026", "snippet": "Forrester: The Forrester Wave — Work Management Platforms Q1 2026..."}],
    ),
    (
        "The top productivity apps of 2026 according to user reviews and expert analysis: 1) Notion — all-in-one workspace, 2) Linear — engineering project management, 3) Raycast — macOS productivity launcher, 4) Arc — thoughtful web browser, 5) Things 4 — personal task management, 6) Obsidian — networked note-taking, 7) Fantastical — smart calendar, 8) Cron (Notion Calendar) — meeting scheduling, 9) Superhuman — fast email, 10) Loom — async video.",
        ["top productivity apps 2026 ranked"],
        [{"url": "https://www.producthunt.com/golden-kitty-awards-2026", "snippet": "Product Hunt: Golden Kitty Awards 2026 — Productivity category winners..."},
         {"url": "https://www.theverge.com/2026/best-productivity-apps", "snippet": "The Verge: The best productivity apps of 2026..."}],
    ),
    (
        "Notion AI, launched in 2024 and significantly upgraded for 2026, now includes: AI-powered search across connected workspaces, automatic meeting note summarization, document drafting and translation, database Q&A (ask questions about your data in natural language), and custom AI agents for repetitive workflows. Compared to Microsoft Copilot and Google Gemini, Notion AI is more deeply integrated into the workflow context because it has access to all your team's documents and databases.",
        ["Notion AI features review 2026"],
        [{"url": "https://www.notion.so/product/ai", "snippet": "Official Notion AI: Features, pricing, and use cases..."},
         {"url": "https://techcrunch.com/2026/02/notion-ai-review", "snippet": "TechCrunch: Notion AI review — the most practical AI for team productivity..."}],
    ),
    (
        "Product roadmap planning tools range from specialized (Productboard, Aha!) to general-purpose (Notion, Google Sheets). Notion's timeline and board views make it capable for roadmap planning, especially for early-stage startups that don't need specialized roadmapping features. The advantage is that the roadmap lives alongside specs, user research, and sprint plans. For companies with dedicated product ops teams, Productboard's prioritization frameworks offer more structure.",
        ["best tool for product roadmap planning 2026"],
        [{"url": "https://www.productplan.com/learn/best-roadmap-tools-2026/", "snippet": "ProductPlan: Best product roadmap tools compared..."},
         {"url": "https://www.lennysnewsletter.com/p/product-roadmap-tools", "snippet": "Lenny's Newsletter: The product roadmap tools top PMs actually use..."}],
    ),
    (
        "Agencies need an all-in-one workspace that handles client onboarding, project tracking, asset management, and reporting. Notion is increasingly popular among agencies because it can replace multiple tools (spreadsheets, docs, wikis, project trackers). Agency-specific templates on Notion's marketplace include client portals, creative brief databases, and campaign trackers. For agencies that need time tracking and invoicing, tools like HoneyBook or Dubsado complement Notion well.",
        ["all-in-one workspace for agencies 2026"],
        [{"url": "https://www.notion.so/templates/category/agency", "snippet": "Official Notion Templates: Agency management and client portal templates..."},
         {"url": "https://www.agencyanalytics.com/blog/agency-tools-2026", "snippet": "Agency Analytics: Best tools for digital agencies in 2026..."}],
    ),
]


def build_mock_search_results():
    """Build 30 mock fc_search results matching the QUERIES list.
    Post-process: inject source URLs into answer text so citation_analyzer can extract them.
    """
    results = []
    for i, (answer, searched, citations) in enumerate(MOCK_ANSWERS):
        # Inject source URLs into answer text for citation_analyzer extraction
        if citations:
            url_list = ", ".join(c["url"] for c in citations[:2])
            answer = answer.rstrip(".") + f". (Sources: {url_list})"
        results.append({
            "answer": answer,
            "searched_queries": searched,
            "raw_citations": citations,
            "no_search": False,
            "error": None,
            "tokens": len(answer) // 3,
        })
    return results


# ─── Run pipeline ──────────────────────────────────────────

async def run_pipeline():
    """Run full probe pipeline with mock search results."""
    from langgraph_app.nodes.probe_node import (
        _stream_brand, _stream_search_phase1, _stream_mm_gap,
        _stream_cite, _stream_scorer_narrative, _stream_competitor,
        logger as probe_logger,
    )
    from langgraph_app.state import ProbeOutput, ProbeMeta, CompanyEvaluation, MarketPerception, GapReport, CitationMetrics
    import time

    ui = {
        "brand_name": "Notion",
        "domain": "notion.so",
        "industry": "B2B SaaS",
        "target_market": "全球",
        "core_product": "all-in-one workspace",
        "seed_queries": ["best productivity tool", "team collaboration software", "knowledge management platform"],
        "competitors": [],
    }
    errors = {}
    start_time = time.time()

    # ── Inject mock search results ─────────────────────
    mock_results = build_mock_search_results()
    search_tokens = sum(r.get("tokens", 0) for r in mock_results)
    search_statuses = {}
    all_ddg_snippets = []

    for i, r in enumerate(mock_results):
        q = QUERIES[i] if i < len(QUERIES) else "unknown"
        search_statuses[q] = "success"
        all_ddg_snippets.extend(r.get("raw_citations", []))

    ok = sum(1 for v in search_statuses.values() if v == "success")
    print(f"[Mock fc_search] → {ok}/{len(QUERIES)} mock results | {search_tokens} tokens")

    # ── Level 1: three streams in parallel ─────────────
    brand_task = asyncio.create_task(_stream_brand(ui))
    # Mock the search phase 1
    mock_sr_data = {
        "queries": QUERIES,
        "search_results": mock_results,
        "search_tokens": search_tokens,
        "search_statuses": search_statuses,
        "all_ddg_snippets": all_ddg_snippets,
        "ok": ok, "skipped": 0, "failed": 0,
        "circuit_open": False,
    }
    comp_task = asyncio.create_task(_stream_competitor(ui))

    bp, brand_error = await brand_task
    if brand_error:
        errors["probe_brand"] = brand_error
    print(f"[brand流] → {bp.one_liner[:80] if bp else 'fallback'}")

    await comp_task  # start it, will await later

    # ── Level 2: mm_gap || cite ────────────────────────
    mm_gap_task = asyncio.create_task(_stream_mm_gap(ui, mock_results, all_ddg_snippets, bp))
    cite_task = asyncio.create_task(_stream_cite(QUERIES, mock_results, ui))

    mp, market_perception, gr, gap_report, company_evaluation, mm_gap_error = await mm_gap_task
    if mm_gap_error:
        errors["probe_mm_gap"] = mm_gap_error
    print(f"[mm_gap] → alignment={gap_report.alignment_score}/100")

    cite_details, citation_metrics, source_authority, cite_error = await cite_task
    if cite_error:
        errors["probe_cite"] = cite_error
    cite_rate = citation_metrics.rate
    sa_sources = source_authority.total_sources if source_authority else 0
    print(f"[cite+sa] → {citation_metrics.mentioned_count}/{citation_metrics.total_queries} mentioned ({cite_rate:.1f}%) | {sa_sources} sources")

    # ── Level 3: scorer → narrative ────────────────────
    cs, an, score_error, narrative_error = await _stream_scorer_narrative(
        bp, mp, gr, citation_metrics, ui)
    if score_error:
        errors["probe_scorer"] = score_error
    if narrative_error:
        errors["probe_narrative"] = narrative_error
    print(f"[scorer+narrative] → score={cs.overall if cs else 'N/A'}/100 | "
          f"keywords={len(an.keywords) if an else 0} | tone={an.tone if an else 'N/A'}")

    # ── Level 4: competitor ────────────────────────────
    comp_result = await comp_task
    comp_results = comp_result["comp_results"]
    comp_tokens = comp_result["comp_tokens"]
    if comp_result.get("error"):
        errors["probe_competitor"] = comp_result["error"]
    print(f"[竞品流] → {len(comp_results)} comparisons | {comp_tokens} tokens")

    # ── Assemble ───────────────────────────────────────
    elapsed_ms = int((time.time() - start_time) * 1000)
    total_tokens = search_tokens + comp_tokens
    partial = bool(brand_error or mm_gap_error or cite_error or score_error or narrative_error)

    all_statuses = {**search_statuses}
    if ui.get("competitors"):
        all_statuses.update(comp_result.get("comp_statuses", {}))

    meta = ProbeMeta(
        total_tokens=total_tokens,
        total_cost=round(total_tokens / 1000 * 0.002, 4),
        total_duration_ms=elapsed_ms,
        query_statuses=all_statuses,
    )

    probe_output = ProbeOutput(
        company_evaluation=company_evaluation,
        market_perception=market_perception,
        gap_report=gap_report,
        citation_metrics=citation_metrics,
        competitor_analysis=comp_results,
        engines_queried=["chatgpt", "deepseek"],
        query_terms=QUERIES,
        meta=meta,
        status="partial" if partial else "success",
        error=None,
        brand_profile=bp,
        company_score=cs,
        ai_narrative=an,
        source_authority=source_authority,
    )

    print(f"\n{'='*60}")
    print(f"Pipeline complete in {elapsed_ms}ms ({elapsed_ms/1000:.1f}s)")
    print(f"Status: {probe_output.status}")
    print(f"Alignment: {gap_report.alignment_score}/100")
    print(f"Citation Rate: {cite_rate:.1f}%")
    print(f"Company Score: {cs.overall if cs else 'N/A'}/100")
    print(f"Source Authority: {sa_sources} sources, diversity={source_authority.source_diversity if source_authority else 'N/A'}")
    print(f"Total Tokens: {total_tokens}")
    print(f"Errors: {errors if errors else 'none'}")

    return probe_output.model_dump(), meta.model_dump(), errors


# ─── HTML Report Generator ────────────────────────────────

def generate_html(output: dict, meta: dict, errors: dict) -> str:
    """Generate a polished HTML report from ProbeOutput."""

    ce = output.get("company_evaluation") or {}
    bp = output.get("brand_profile") or {}
    mp = output.get("market_perception") or {}
    gr = output.get("gap_report") or {}
    cm = output.get("citation_metrics") or {}
    cs = output.get("company_score") or {}
    an = output.get("ai_narrative") or {}
    sa = output.get("source_authority") or {}
    comp = output.get("competitor_analysis") or []

    # Helpers
    def score_color(s):
        if s >= 80: return "#22c55e"
        if s >= 60: return "#f59e0b"
        if s >= 40: return "#f97316"
        return "#ef4444"

    def score_bar(s, label=""):
        color = score_color(s)
        return f'<div style="margin:4px 0"><span style="display:inline-block;width:80px">{label}</span><span style="display:inline-block;width:200px;height:18px;background:#1e293b;border-radius:9px;overflow:hidden"><span style="display:block;height:100%;width:{s}%;background:{color};border-radius:9px"></span></span><span style="margin-left:8px;font-weight:600;color:{color}">{s}/100</span></div>'

    # Brand Profile section
    bp_html = f"""
    <div class="card">
        <h2>🔍 品牌画像</h2>
        <div class="oneliner">{bp.get('one_liner', 'N/A')}</div>
        <div class="grid-2">
            <div>
                <h4>价值主张</h4>
                <ul>{"".join(f"<li>{v}</li>" for v in bp.get('value_props', []))}</ul>
            </div>
            <div>
                <h4>差异化</h4>
                <ul>{"".join(f"<li>{d}</li>" for d in bp.get('differentiators', []))}</ul>
            </div>
        </div>
        <div class="grid-2">
            <div>
                <h4>目标客户</h4>
                <ul>{"".join(f"<li>{p}</li>" for p in bp.get('target_personas', []))}</ul>
            </div>
            <div>
                <h4>品牌调性</h4>
                <div class="tags">{"".join(f'<span class="tag">{k}</span>' for k in bp.get('tone_keywords', []))}</div>
            </div>
        </div>
    </div>"""

    # Company Evaluation
    ce_html = f"""
    <div class="card">
        <h2>📊 企业评价</h2>
        <p class="overall">{ce.get('overall', 'N/A')}</p>
        <div class="grid-2">
            <div>
                <h4 style="color:#22c55e">✅ 优势</h4>
                <ul>{"".join(f"<li>{s}</li>" for s in ce.get('strengths', []))}</ul>
            </div>
            <div>
                <h4 style="color:#ef4444">⚠️ 劣势</h4>
                <ul>{"".join(f"<li>{w}</li>" for w in ce.get('weaknesses', []))}</ul>
            </div>
        </div>
        <p><strong>市场定位:</strong> {ce.get('positioning', 'N/A')}</p>
    </div>"""

    # Market Perception
    mp_html = f"""
    <div class="card">
        <h2>🌐 AI 市场感知</h2>
        <p><strong>AI认为你是谁:</strong> {mp.get('perceived_identity', 'N/A')}</p>
        <div class="grid-2">
            <div>
                <h4 style="color:#22c55e">感知优势</h4>
                <ul>{"".join(f"<li>{s}</li>" for s in mp.get('perceived_strengths', []))}</ul>
            </div>
            <div>
                <h4 style="color:#ef4444">感知劣势</h4>
                <ul>{"".join(f"<li>{w}</li>" for w in mp.get('perceived_weaknesses', []))}</ul>
            </div>
        </div>
        <p><strong>市场定位感知:</strong> {mp.get('perceived_positioning', 'N/A')}</p>
    </div>"""

    # Gap Analysis
    align = gr.get('alignment_score', 0)
    gr_html = f"""
    <div class="card">
        <h2>📐 差距分析</h2>
        {score_bar(align, "对齐度")}
        <p class="oneliner">{gr.get('one_line_summary', 'N/A')}</p>
        <div class="grid-3">
            <div><h4 style="color:#22c55e">✅ 对齐</h4><ul>{"".join(f"<li>{a}</li>" for a in gr.get('aligned', []))}</ul></div>
            <div><h4 style="color:#f59e0b">⚠️ 偏差</h4><ul>{"".join(f"<li>{m}</li>" for m in gr.get('misaligned', []))}</ul></div>
            <div><h4 style="color:#ef4444">🔴 盲点</h4><ul>{"".join(f"<li>{b}</li>" for b in gr.get('blind_spots', []))}</ul></div>
        </div>
        <div><h4 style="color:#3b82f6">💡 机会</h4><ul>{"".join(f"<li>{o}</li>" for o in gr.get('opportunities', []))}</ul></div>
    </div>"""

    # Citation Metrics
    cite_html = f"""
    <div class="card">
        <h2>📈 引用率分析</h2>
        <div class="metric-row">
            <div class="metric"><span class="metric-value">{cm.get('rate', 0)}%</span><span class="metric-label">引用率</span></div>
            <div class="metric"><span class="metric-value">{cm.get('mentioned_count', 0)}/{cm.get('total_queries', 0)}</span><span class="metric-label">被提及/总查询</span></div>
        </div>
    </div>"""

    # Company Score
    cs_html = ""
    if cs:
        dims_html = "".join(
            f'<div class="dim-row"><span class="dim-name">{d["name"]}</span>{score_bar(d["score"])}<span class="dim-evidence">{d.get("evidence", "")}</span></div>'
            for d in cs.get("dimensions", [])
        )
        cs_html = f"""
    <div class="card">
        <h2>🏆 量化评分</h2>
        <div class="metric-row">
            <div class="metric"><span class="metric-value" style="color:{score_color(cs.get('overall', 0))}">{cs.get('overall', 0)}</span><span class="metric-label">综合分</span></div>
            <div class="metric"><span class="metric-value">{cs.get('industry', '')}</span><span class="metric-label">行业</span></div>
        </div>
        <div class="dimensions">{dims_html}</div>
        <div class="weights">
            <h4>权重配置</h4>
            {"".join(f'<span class="tag">{k}: {v}</span>' for k, v in cs.get('weights_used', {}).items())}
        </div>
    </div>"""

    # AI Narrative
    an_html = ""
    if an:
        an_html = f"""
    <div class="card">
        <h2>💬 AI 推荐话术</h2>
        <div class="narrative-box">{an.get('ideal_description', '')}</div>
        <div class="grid-2">
            <div>
                <h4>必须包含的关键词</h4>
                <div class="tags">{"".join(f'<span class="tag tag-green">{k}</span>' for k in an.get('keywords', []))}</div>
            </div>
            <div>
                <h4>必须提及的价值主张</h4>
                <ul>{"".join(f"<li>{v}</li>" for v in an.get('value_props', []))}</ul>
            </div>
        </div>
        <div>
            <h4 style="color:#ef4444">禁忌话术（避免）</h4>
            <ul>{"".join(f"<li>{a}</li>" for a in an.get('avoid', []))}</ul>
        </div>
        <p><strong>推荐语气:</strong> <span class="tag tag-blue">{an.get('tone', 'N/A')}</span></p>
    </div>"""

    # Source Authority
    sa_html = ""
    if sa and sa.get("top_sources"):
        rows = "".join(
            f"""<tr>
                <td>{i+1}</td>
                <td><strong>{s['domain']}</strong></td>
                <td><span class="tag">{s['source_type']}</span></td>
                <td>{s['mention_count']}</td>
                <td>{s['avg_position']}</td>
                <td><span style="color:{score_color(s['authority_score'])};font-weight:600">{s['authority_score']}</span></td>
            </tr>"""
            for i, s in enumerate(sa["top_sources"])
        )
        sa_html = f"""
    <div class="card">
        <h2>🔗 引用源权威性</h2>
        <div class="metric-row">
            <div class="metric"><span class="metric-value">{sa.get('total_sources', 0)}</span><span class="metric-label">总来源数</span></div>
            <div class="metric"><span class="metric-value">{sa.get('source_diversity', 0)}</span><span class="metric-label">多样性指数</span></div>
        </div>
        <table>
            <thead><tr><th>#</th><th>域名</th><th>类型</th><th>提及次数</th><th>平均位置</th><th>权威分</th></tr></thead>
            <tbody>{rows}</tbody>
        </table>
    </div>"""

    # Citation Details (sample)
    details = cm.get("details", [])
    cited = [d for d in details if d.get("mentioned")]
    detail_rows = "".join(
        f"""<tr>
            <td>{d['query'][:50]}...</td>
            <td><span style="color:{'#22c55e' if d.get('mentioned') else '#ef4444'}">{'✅' if d.get('mentioned') else '❌'}</span></td>
            <td>{d.get('position', 'N/A')}</td>
            <td>{d.get('mention_context', '')[:80]}...</td>
            <td>{d.get('reference_source', '')[:50]}</td>
        </tr>"""
        for d in cited[:15]
    )

    detail_html = f"""
    <div class="card">
        <h2>📋 引用明细（Top 15）</h2>
        <table>
            <thead><tr><th>查询词</th><th>提及</th><th>位置</th><th>上下文</th><th>来源</th></tr></thead>
            <tbody>{detail_rows}</tbody>
        </table>
    </div>"""

    # Meta
    meta_html = f"""
    <div class="card meta-card">
        <h2>⚙️ 运行信息</h2>
        <div class="meta-grid">
            <div><strong>状态:</strong> <span class="tag tag-blue">{output.get('status', 'N/A')}</span></div>
            <div><strong>总耗时:</strong> {meta.get('total_duration_ms', 0)}ms ({meta.get('total_duration_ms', 0)/1000:.1f}s)</div>
            <div><strong>总 Token:</strong> {meta.get('total_tokens', 0)}</div>
            <div><strong>预估成本:</strong> ${meta.get('total_cost', 0)}</div>
            <div><strong>查询词数:</strong> {len(output.get('query_terms', []))}</div>
            <div><strong>使用引擎:</strong> {', '.join(output.get('engines_queried', []))}</div>
        </div>
    </div>"""

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CiteFlow Probe Report — {bp.get('brand_name', 'Brand')}</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:#0f172a; color:#e2e8f0; font-family:-apple-system,BlinkMacSystemFont,sans-serif; padding:20px; }}
.container {{ max-width:1100px; margin:0 auto; }}
.header {{ text-align:center; padding:40px 0; border-bottom:1px solid #1e293b; margin-bottom:30px; }}
.header h1 {{ font-size:2.2em; color:#f8fafc; }}
.header .subtitle {{ color:#94a3b8; margin-top:8px; }}
.card {{ background:#1e293b; border-radius:12px; padding:24px; margin-bottom:20px; border:1px solid #334155; }}
.card h2 {{ font-size:1.2em; color:#f1f5f9; margin-bottom:16px; border-bottom:1px solid #334155; padding-bottom:8px; }}
.card h4 {{ font-size:0.9em; color:#94a3b8; margin:12px 0 6px; text-transform:uppercase; letter-spacing:0.5px; }}
.oneliner {{ font-size:1.1em; color:#f8fafc; padding:8px 0; border-left:3px solid #3b82f6; padding-left:12px; margin:12px 0; }}
.overall {{ font-size:1.05em; line-height:1.6; }}
.grid-2 {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }}
.grid-3 {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }}
ul {{ list-style:none; padding:0; }}
li {{ padding:4px 0; color:#cbd5e1; font-size:0.93em; }}
li::before {{ content:"• "; color:#3b82f6; }}
.tags {{ display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }}
.tag {{ display:inline-block; padding:3px 10px; border-radius:12px; font-size:0.82em; background:#334155; color:#94a3b8; }}
.tag-green {{ background:#065f46; color:#6ee7b7; }}
.tag-blue {{ background:#1e3a5f; color:#93c5fd; }}
.metric-row {{ display:flex; gap:40px; margin:16px 0; }}
.metric {{ text-align:center; }}
.metric-value {{ display:block; font-size:2em; font-weight:700; color:#f8fafc; }}
.metric-label {{ display:block; font-size:0.85em; color:#94a3b8; margin-top:4px; }}
.dim-row {{ margin:8px 0; }}
.dim-name {{ display:inline-block; width:80px; font-size:0.9em; font-weight:600; }}
.dim-evidence {{ display:block; font-size:0.8em; color:#64748b; margin-left:80px; margin-top:2px; }}
.narrative-box {{ background:#0f172a; border:1px solid #334155; border-radius:8px; padding:16px; font-size:1em; line-height:1.7; color:#e2e8f0; margin:12px 0; }}
table {{ width:100%; border-collapse:collapse; font-size:0.88em; margin-top:12px; }}
th {{ text-align:left; padding:8px; border-bottom:2px solid #334155; color:#94a3b8; font-weight:600; }}
td {{ padding:8px; border-bottom:1px solid #1e293b; color:#cbd5e1; }}
tr:hover td {{ background:#1e293b; }}
.weights {{ margin-top:16px; }}
.meta-card {{ font-size:0.9em; }}
.meta-grid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }}
.meta-grid div {{ padding:4px 0; }}
.footer {{ text-align:center; padding:20px; color:#475569; font-size:0.85em; }}
</style>
</head>
<body>
<div class="container">
<div class="header">
    <h1>{bp.get('brand_name', 'Brand')} — AI 引用体检报告</h1>
    <div class="subtitle">CiteFlow Probe · {time.strftime('%Y-%m-%d %H:%M')} · 基于30个查询词</div>
</div>
{bp_html}
{ce_html}
{mp_html}
{gr_html}
{cite_html}
{cs_html}
{an_html}
{sa_html}
{detail_html}
{meta_html}
<div class="footer">Generated by CiteFlow Probe · Mock fc_search (GPT中转站余额不足) · All other steps: real DeepSeek API</div>
</div>
</body>
</html>"""


# ─── Main ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("CiteFlow Probe — Full Pipeline (Mock Search)")
    print("=" * 60)
    print()

    output, meta, errors = asyncio.run(run_pipeline())

    # Save JSON
    json_path = os.path.join(os.path.dirname(__file__), "probe_full_output.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"output": output, "meta": meta, "errors": errors}, f, ensure_ascii=False, indent=2)
    print(f"\nJSON saved → {json_path}")

    # Generate HTML
    html = generate_html(output, meta, errors)
    html_path = os.path.join(os.path.expanduser("~/Desktop"), "probe_report.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"HTML saved → {html_path}")

    print("\nDone!")

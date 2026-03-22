import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import { createToolError } from "@/lib/agents/shared"
import { searchTool } from "@/lib/tools/searchTool"

const WEB_SEARCH_SYSTEM_PROMPT = `You are a web search summarizer.

Use only the supplied search results.
If evidence is limited, say so.
Return markdown with these sections:
## Summary
## Key Points
## Sources`

export async function runWebSearchAgent(query: string) {
    let searchResults

    try {
        searchResults = await searchTool(query)
    } catch (error) {
        throw createToolError("searchTool", error, "Unable to fetch search results")
    }

    const context = searchResults
        .map((result, index) => `${index + 1}. ${result.title}\nSnippet: ${result.snippet}\nLink: ${result.link}`)
        .join("\n\n")

    const summary = await completeWithOpenRouter({
        system: WEB_SEARCH_SYSTEM_PROMPT,
        user: `User query: ${query}\n\nSearch results:\n${context}`,
        maxTokens: 1400,
        temperature: 0.2,
    })

    return {
        query,
        result: summary,
        sources: searchResults,
        hasLiveData: true,
    }
}

export interface SearchToolResult {
    title: string
    snippet: string
    link: string
}

interface SerpApiOrganicResult {
    title?: string
    snippet?: string
    link?: string
}

interface SerpApiResponse {
    organic_results?: SerpApiOrganicResult[]
}

function getSerpApiKey() {
    const apiKey = process.env.SERPAPI_API_KEY ?? process.env.SERP_API_KEY

    if (!apiKey) {
        throw new Error("SerpAPI key is not configured")
    }

    return apiKey
}

export async function searchTool(query: string) {
    const url = new URL("https://serpapi.com/search.json")
    url.searchParams.set("q", query)
    url.searchParams.set("api_key", getSerpApiKey())
    url.searchParams.set("engine", "google")

    const response = await fetch(url.toString(), {
        headers: { "User-Agent": "AgentForge/1.0" },
        cache: "no-store",
    })

    if (!response.ok) {
        throw new Error(`SerpAPI request failed with status ${response.status}`)
    }

    const data = await response.json() as SerpApiResponse
    const organicResults = Array.isArray(data.organic_results) ? data.organic_results : []

    const results: SearchToolResult[] = organicResults
        .map((item) => ({
            title: typeof item.title === "string" ? item.title : "",
            snippet: typeof item.snippet === "string" ? item.snippet : "",
            link: typeof item.link === "string" ? item.link : "",
        }))
        .filter((item) => item.title && item.snippet && item.link)
        .slice(0, 8)

    if (results.length === 0) {
        throw new Error("SerpAPI returned no usable search results")
    }

    return results
}

import { Octokit } from "octokit"

export function createOctokit(accessToken: string) {
    return new Octokit({
        auth: accessToken,
        request: {
            retries: 2,
        },
    })
}

import { Octokit } from "@octokit/rest";

export type TokenScope = "repo" | "project";

export function getOctokit(token: string) {
    return new Octokit({ auth: token });
}

/**
 * Returns an Octokit instance for the given scope.
 * - "repo"    → Token 1 (repos, issues, milestones)
 * - "project" → Token 2 (GitHub Projects v2)
 * Falls back to the other token if the scoped one is missing.
 */
export function getOctokitForScope(
    scope: TokenScope,
    token1: string | null | undefined,
    token2: string | null | undefined
): Octokit {
    if (scope === "repo") {
        const token = token1 ?? token2;
        if (!token) throw new Error("No token available for repo scope");
        return new Octokit({ auth: token });
    }

    if (scope === "project") {
        const token = token2 ?? token1;
        if (!token) throw new Error("No token available for project scope");
        return new Octokit({ auth: token });
    }

    throw new Error(`Unknown token scope: ${scope}`);
}

export async function validateToken(token: string) {
    try {
        const octokit = getOctokit(token);
        const { data } = await octokit.rest.users.getAuthenticated();
        return {
            valid: true,
            login: data.login,
            avatarUrl: data.avatar_url,
        };
    } catch {
        return { valid: false, login: null, avatarUrl: null };
    }
}
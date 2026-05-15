import { adminDb } from "@/lib/firebaseAdmin"
import type { CommitRecord, PullRequestRecord } from "@/lib/github/types"

const COMMITS_COLLECTION = "git_commits"
const PRS_COLLECTION = "pull_requests"

export class ChangeStore {
    async saveCommit(record: CommitRecord) {
        await adminDb.collection(COMMITS_COLLECTION).doc(record.id).set(record)
        return record
    }

    async listCommitsByWorkspace(workspaceId: string, limit = 10) {
        const snapshot = await adminDb
            .collection(COMMITS_COLLECTION)
            .where("workspaceId", "==", workspaceId)
            .get()

        return snapshot.docs
            .map((doc) => doc.data() as CommitRecord)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, limit)
    }

    async savePullRequest(record: PullRequestRecord) {
        await adminDb.collection(PRS_COLLECTION).doc(record.id).set(record)
        return record
    }

    async listPullRequestsByWorkspace(workspaceId: string, limit = 10) {
        const snapshot = await adminDb
            .collection(PRS_COLLECTION)
            .where("workspaceId", "==", workspaceId)
            .get()

        return snapshot.docs
            .map((doc) => doc.data() as PullRequestRecord)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, limit)
    }
}

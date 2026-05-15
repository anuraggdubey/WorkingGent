import { adminDb } from "@/lib/firebaseAdmin"
import type { RepositoryIssueRecord } from "@/lib/github/types"

const COLLECTION = "repository_issues"

export class IssueStore {
    async replaceForWorkspace(workspaceId: string, findings: RepositoryIssueRecord[]) {
        const snapshot = await adminDb
            .collection(COLLECTION)
            .where("workspaceId", "==", workspaceId)
            .get()

        const batch = adminDb.batch()

        for (const doc of snapshot.docs) {
            batch.delete(doc.ref)
        }

        for (const finding of findings) {
            batch.set(adminDb.collection(COLLECTION).doc(finding.id), finding)
        }

        await batch.commit()
        return findings
    }

    async listByWorkspace(workspaceId: string, limit = 50) {
        const snapshot = await adminDb
            .collection(COLLECTION)
            .where("workspaceId", "==", workspaceId)
            .get()

        return snapshot.docs
            .map((doc) => doc.data() as RepositoryIssueRecord)
            .sort((a, b) => {
                if (a.severity === b.severity) {
                    return b.updatedAt.localeCompare(a.updatedAt)
                }

                const severityOrder = ["critical", "high", "medium", "low", "info"]
                return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
            })
            .slice(0, limit)
    }
}

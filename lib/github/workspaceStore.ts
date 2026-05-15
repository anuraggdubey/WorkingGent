import { adminDb } from "@/lib/firebaseAdmin"
import type { RepositoryWorkspaceRecord } from "@/lib/github/types"

const COLLECTION = "repository_workspaces"

export class WorkspaceStore {
    async listByUser(userId: string) {
        const snapshot = await adminDb
            .collection(COLLECTION)
            .where("userId", "==", userId)
            .get()

        return snapshot.docs
            .map((doc) => doc.data() as RepositoryWorkspaceRecord)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }

    async getById(id: string) {
        const snapshot = await adminDb.collection(COLLECTION).doc(id).get()
        return snapshot.exists ? snapshot.data() as RepositoryWorkspaceRecord : null
    }

    async save(record: RepositoryWorkspaceRecord) {
        await adminDb.collection(COLLECTION).doc(record.id).set(record)
        return record
    }

    async delete(id: string) {
        await adminDb.collection(COLLECTION).doc(id).delete()
    }
}

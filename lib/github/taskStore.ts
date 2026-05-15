import { adminDb } from "@/lib/firebaseAdmin"
import type { AgentTaskRecord } from "@/lib/github/types"

const COLLECTION = "agent_tasks"

export class TaskStore {
    async getById(id: string) {
        const snapshot = await adminDb.collection(COLLECTION).doc(id).get()
        return snapshot.exists ? snapshot.data() as AgentTaskRecord : null
    }

    async save(record: AgentTaskRecord) {
        await adminDb.collection(COLLECTION).doc(record.id).set(record)
        return record
    }

    async listByWorkspace(workspaceId: string, limit = 20) {
        const snapshot = await adminDb
            .collection(COLLECTION)
            .where("workspaceId", "==", workspaceId)
            .get()

        return snapshot.docs
            .map((doc) => doc.data() as AgentTaskRecord)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, limit)
    }
}

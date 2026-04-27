import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"

function getServiceAccount(): ServiceAccount {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Firebase Admin SDK is not configured. " +
            "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment."
        )
    }

    return { projectId, clientEmail, privateKey }
}

const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(getServiceAccount()) })

export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)
export const adminStorage = getStorage(adminApp)
export default adminApp

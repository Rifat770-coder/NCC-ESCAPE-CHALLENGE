/**
 * Centralised Appwrite configuration.
 *
 * Pulled from environment variables when available, but the values supplied
 * by the Appwrite starter (endpoint + project id) are baked in as defaults
 * so the app boots correctly out of the box. Server-only secrets
 * (APPWRITE_API_KEY, APPWRITE_DATABASE_ID, collection IDs) still come from
 * environment variables so they are never committed to the repository.
 */
export const APPWRITE_CONFIG = {
  endpoint:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    "https://fra.cloud.appwrite.io/v1",
  projectId:
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    "6ac3e7c0001469e247da",
  databaseId: process.env.APPWRITE_DATABASE_ID || "demo-db",
  collections: {
    participants:
      process.env.APPWRITE_COLLECTION_PARTICIPANTS || "participants",
    attempts: process.env.APPWRITE_COLLECTION_ATTEMPTS || "gameAttempts",
    settings: process.env.APPWRITE_COLLECTION_SETTINGS || "gameSettings",
  },
} as const;

export function appwriteReady() {
  return (
    !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID &&
    !!process.env.APPWRITE_DATABASE_ID &&
    !!process.env.APPWRITE_API_KEY
  );
}
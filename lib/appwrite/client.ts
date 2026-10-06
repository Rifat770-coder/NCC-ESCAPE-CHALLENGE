"use client";

import { Client, Account, Databases } from "appwrite";
import { APPWRITE_CONFIG } from "./config";

let _client: Client | null = null;
let _databases: Databases | null = null;
let _account: Account | null = null;

export function getAppwriteClient(): Client {
  if (!_client) {
    _client = new Client();
    _client
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);
  }
  return _client;
}

export function getDatabases(): Databases {
  if (!_databases) {
    _databases = new Databases(getAppwriteClient());
  }
  return _databases;
}

export function getAccount(): Account {
  if (!_account) {
    _account = new Account(getAppwriteClient());
  }
  return _account;
}

/**
 * Re-export the configured endpoint + project id so the AppwriteBoot
 * component (and any other code) can read them in one place.
 */
export const appwriteEndpoint = APPWRITE_CONFIG.endpoint;
export const appwriteProjectId = APPWRITE_CONFIG.projectId;
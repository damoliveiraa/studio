'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { getVtexOrders } from '../lib/vtex';
import { smartSyncSheet } from '../lib/sheets'; // Using the new smart sync function
import { convertToCSV } from '../lib/csv';

// --- Base Interfaces ---
export interface ClientConfig {
  name: string;
  vtex_account_name: string;
  vtex_app_key: string;
  vtex_app_token: string;
  sheet_id: string;
  sheet_name: string;
}

export interface SyncResult {
    clientName: string;
    status: 'success' | 'failed';
    newOrdersAdded: number;
    error?: string;
}

export interface SyncActionResult {
    success: boolean;
    message: string;
    results: SyncResult[];
}

// The entry that will be stored in the history file
export interface HistoryEntry extends SyncActionResult {
  timestamp: Date;
}

// --- File Paths ---
const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');


// --- Utility Functions ---
async function ensureDataDirectoryExists() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// --- History Management ---

/**
 * Fetches sync history from the JSON file.
 */
export async function getSyncHistory(): Promise<HistoryEntry[]> {
  try {
    await ensureDataDirectoryExists();
    const fileContent = await fs.readFile(HISTORY_PATH, 'utf-8');
    const history = JSON.parse(fileContent);
    return history.map((entry: any) => ({ ...entry, timestamp: new Date(entry.timestamp) }));
  } catch (error: any) {
    if (error.code === 'ENOENT') { 
      return [];
    }
    console.error('[getSyncHistory] Error:', error);
    throw new Error('Could not read sync history.');
  }
}

/**
 * Saves a new sync result to the history file.
 */
async function saveSyncResult(result: SyncActionResult) {
  try {
    const history = await getSyncHistory();
    const newHistoryEntry: HistoryEntry = { ...result, timestamp: new Date() };
    history.unshift(newHistoryEntry);
    const limitedHistory = history.slice(0, 50);
    await ensureDataDirectoryExists();
    await fs.writeFile(HISTORY_PATH, JSON.stringify(limitedHistory, null, 2));
  } catch (error: any) {
    console.error('[saveSyncResult] Error saving history:', error);
  }
}

// --- Client Management ---

export async function getClientConfigs(): Promise<ClientConfig[]> {
  const clientNamesStr = process.env.CLIENT_NAMES;
  if (!clientNamesStr) {
    console.log("[Client Config] CLIENT_NAMES environment variable not set. No clients to process.");
    return [];
  }

  const clientNames = clientNamesStr.split(',').map(name => name.trim().toLowerCase());
  const clientConfigs: ClientConfig[] = [];

  for (const name of clientNames) {
    const upperName = name.toUpperCase();

    const config: ClientConfig = {
      name: process.env[`${upperName}_NAME`] || name,
      vtex_account_name: process.env[`${upperName}_VTEX_ACCOUNT_NAME`] || '',
      vtex_app_key: process.env[`${upperName}_VTEX_APP_KEY`] || '',
      vtex_app_token: process.env[`${upperName}_VTEX_APP_TOKEN`] || '',
      sheet_id: process.env[`${upperName}_SHEET_ID`] || '',
      sheet_name: process.env[`${upperName}_SHEET_NAME`] || name,
    };

    if (!config.vtex_account_name || !config.vtex_app_key || !config.vtex_app_token || !config.sheet_id) {
        console.warn(`[Client Config] Configuration for client '${name}' is incomplete. Skipping.`);
        continue;
    }

    clientConfigs.push(config);
  }
  
  console.log(`[Client Config] Loaded ${clientConfigs.length} client(s): ${clientNames.join(', ')}`);
  return clientConfigs;
}


// --- Core Server Actions ---

export async function syncVtexToSheets(): Promise<SyncActionResult> {
  console.log('Starting intelligent VTEX to Google Sheets sync...');
  
  const clients = await getClientConfigs();
  if (clients.length === 0) {
    const result: SyncActionResult = { success: true, message: "Nenhum cliente configurado.", results: [] };
    await saveSyncResult(result);
    return result;
  }

  const results: SyncResult[] = [];
  let overallSuccess = true;

  for (const client of clients) {
    try {
      console.log(`Processing client: ${client.name}`);
      if (!client.sheet_id || !client.sheet_name) {
          throw new Error(`Sheet ID or Sheet Name not configured for client ${client.name}`);
      }
      // 1. Fetch today's orders from VTEX
      const orders = await getVtexOrders(client);
      
      // 2. Use the smart sync function to update the sheet
      const syncResult = await smartSyncSheet(client.sheet_id, client.sheet_name, orders);
      
      const newOrdersCount = syncResult?.updates?.updatedRows || 0;
      results.push({ clientName: client.name, status: 'success', newOrdersAdded: newOrdersCount });
      console.log(`Successfully synced ${client.name}. Synced ${newOrdersCount} new orders.`);

    } catch (error: any) {
      console.error(`Failed to sync for client ${client.name}:`, error);
      overallSuccess = false;
      results.push({ clientName: client.name, status: 'failed', newOrdersAdded: 0, error: error.message });
    }
  }

  const totalNewOrders = results.reduce((sum, result) => sum + result.newOrdersAdded, 0);
  const finalSyncResult: SyncActionResult = {
    success: overallSuccess,
    message: overallSuccess ? `Sync complete. Total of ${totalNewOrders} new orders synced across all clients.` : `Sync completed with errors.`,
    results: results
  };

  await saveSyncResult(finalSyncResult);
  return finalSyncResult;
}

export async function getVtexOrdersAsCsv(): Promise<{ success: boolean; csvContent?: string; fileName?: string; message: string; }> {
  console.log('Fetching orders to generate CSV...');
  try {
    const clients = await getClientConfigs();
    if (clients.length === 0) {
      return { success: false, message: 'Nenhum cliente configurado.' };
    }
    const defaultClient = clients[0];
    const orders = await getVtexOrders(defaultClient);
    if (orders.length === 0) {
      return { success: true, message: `Nenhum pedido encontrado para ${defaultClient.name} hoje.` };
    }
    const csvContent = convertToCSV(orders);
    const fileName = `vtex-orders-${defaultClient.name}-${new Date().toISOString().split('T')[0]}.csv`;
    return { success: true, csvContent, fileName, message: 'CSV gerado com sucesso.' };
  } catch (error: any) {
    console.error('CSV generation failed:', error);
    return { success: false, message: `Falha na geração do CSV: ${error.message}` };
  }
}

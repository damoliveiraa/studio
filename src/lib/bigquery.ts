'use server';

import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';

dotenv.config(); // Explicitly load variables from .env file

/**
 * Inserts an array of order data into a BigQuery table.
 */
export async function sendDataToBigQuery(rows: Record<string, any>[]) {
  // 1. Basic validation
  if (!rows || rows.length === 0) {
    throw new Error('No data provided to send to BigQuery.');
  }

  // 2. Check for required environment variables
  const {
    GOOGLE_APPLICATION_CREDENTIALS,
    GOOGLE_PROJECT_ID, // projectId is still needed for the BigQuery constructor
    BIGQUERY_DATASET_ID,
    BIGQUERY_TABLE_ID
  } = process.env;

  if (!GOOGLE_APPLICATION_CREDENTIALS || !GOOGLE_PROJECT_ID || !BIGQUERY_DATASET_ID || !BIGQUERY_TABLE_ID) {
    throw new Error(
      'Missing Google Cloud config. Ensure GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_PROJECT_ID, BIGQUERY_DATASET_ID, and BIGQUERY_TABLE_ID are set in .env file.'
    );
  }

  // 3. Initialize BigQuery client using a key file
  // This is a more robust method than using a raw private key from env vars.
  const bigquery = new BigQuery({
    keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
    projectId: GOOGLE_PROJECT_ID,
  });

  // 4. Insert data into the specified table
  try {
    console.log(`Inserting ${rows.length} rows into BigQuery table: ${BIGQUERY_DATASET_ID}.${BIGQUERY_TABLE_ID}`);
    await bigquery
      .dataset(BIGQUERY_DATASET_ID)
      .table(BIGQUERY_TABLE_ID)
      .insert(rows);
    console.log('Successfully inserted data into BigQuery.');
    return { success: true, message: `Successfully inserted ${rows.length} rows.` };
  } catch (error: any) {
    // Log detailed error information from BigQuery if available
    if (error.errors) {
      console.error('BigQuery Insert Errors:', JSON.stringify(error.errors, null, 2));
    }
    throw new Error(`Failed to insert data into BigQuery. Details: ${error.message}`);
  }
}

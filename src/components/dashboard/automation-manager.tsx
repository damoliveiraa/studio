'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from '../../hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, PlusCircle, Download, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  syncVtexToSheets,
  getVtexOrdersAsCsv,
  getSyncHistory,
  HistoryEntry,
  SyncResult as ClientSyncResult,
} from '../../app/actions';

const AutomationManager = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const historyData = await getSyncHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sync history.',
        variant: 'destructive',
      });
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      const result = await syncVtexToSheets();
      if (result.success) {
        toast({
          title: 'Sync Successful',
          description: result.message,
        });
      } else {
        toast({
          title: 'Sync Partially Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Sync Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      loadHistory();
    }
  }

  async function handleDownloadCsv() {
    setIsDownloading(true);
    try {
      const result = await getVtexOrdersAsCsv();
      if (result.success && result.csvContent && result.fileName) {
        const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', result.fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: 'Download Ready',
          description: 'Your CSV file has been downloaded.',
        });
      } else {
        toast({
          title: 'Download Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Download Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Automation Manager</CardTitle>
          <CardDescription>
            Manage and monitor your VTEX data automations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button onClick={handleSync} disabled={isSyncing}>
              {
                isSyncing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  'Sync VTEX to Google Sheets'
                )
              }
            </Button>
            <Button onClick={handleDownloadCsv} disabled={isDownloading} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? 'Downloading...' : 'Download Orders as CSV (Default Client)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            <CardTitle>Sync History</CardTitle>
          </div>
          <CardDescription>View the log of the last 50 synchronization runs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {entry.success ? 'Success' : 'Failed'}
                    </span>
                  </TableCell>
                  <TableCell>{entry.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm">No sync history yet.</p>
              <p className="text-xs">Run a sync to see the results here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationManager;

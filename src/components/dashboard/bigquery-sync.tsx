'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFormState, useFormStatus } from 'react-dom';
import { syncVtexToBigQuery } from '@/app/actions';
import { useEffect, useState } from 'react';

const initialState = {
  message: '',
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Syncing...' : 'Sync to BigQuery'}
    </Button>
  );
}

export function BigQuerySync() {
  const [state, formAction] = useFormState(syncVtexToBigQuery, initialState);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (state.message) {
      setShowStatus(true);
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer); // Cleanup timer
    }
  }, [state]);

  return (
    <Card className="sm:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle>VTEX to BigQuery Sync</CardTitle>
        <CardDescription className="max-w-lg text-balance leading-relaxed">
          Manually trigger a synchronization to fetch the latest orders from VTEX and upload them to your BigQuery table.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
      {showStatus && (
        <div className={`mt-4 text-center p-2 rounded-lg ${state.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {state.message}
        </div>
      )}
    </Card>
  );
}

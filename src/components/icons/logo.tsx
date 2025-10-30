import { Bot } from 'lucide-react';

export const Logo = () => (
  <div className="flex items-center gap-2">
    <Bot className="size-7 text-primary" />
    <h1 className="text-xl font-bold tracking-tighter text-foreground group-data-[collapsible=icon]:hidden">
      Vtex Data Sync
    </h1>
  </div>
);

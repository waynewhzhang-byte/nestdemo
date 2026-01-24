import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { Button } from '../ui/button';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-secondary/20">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col md:flex fixed inset-y-0 z-50">
        <Sidebar className="h-full" />
      </aside>

      {/* Mobile Sidebar (Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/80" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex w-64 flex-col bg-background">
             <Sidebar className="h-full border-r-0" />
             <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-2" 
                onClick={() => setIsMobileOpen(false)}
             >
                <span className="sr-only">Close</span>
             </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:pl-64">
        <div className="flex h-16 items-center border-b bg-background px-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-2 font-semibold">Library System</span>
        </div>
        <div className="p-4 md:p-8 animate-in fade-in duration-500">
            {children}
        </div>
      </main>
    </div>
  );
}

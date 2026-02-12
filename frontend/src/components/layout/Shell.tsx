import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Menu, LibraryBig } from 'lucide-react';
import { Button } from '../ui/button';

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

interface ShellProps {
  children: React.ReactNode;
  userRole?: UserRole;
  userName?: string;
}

export function Shell({ children, userRole = 'STUDENT', userName = 'John Doe' }: ShellProps) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-secondary/20">
      <aside className="hidden w-64 flex-col md:flex fixed inset-y-0 z-50">
        <Sidebar className="h-full" role={userRole} userName={userName} />
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/80" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex w-64 flex-col bg-background">
            <Sidebar className="h-full border-r-0" role={userRole} userName={userName} />
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

      <main className="flex-1 md:pl-64">
        <div className="flex h-16 items-center border-b bg-background px-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-2 flex items-center gap-2">
            <LibraryBig className="h-5 w-5 text-primary" />
            <span className="font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Library System</span>
          </div>
        </div>
        <div className="p-4 md:p-8 animate-in fade-in duration-500">
            {children}
        </div>
      </main>
    </div>
  );
}

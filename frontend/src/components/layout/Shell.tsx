import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Menu, LibraryBig } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:z-30">
        <Sidebar
          role={user?.role}
          userName={user?.name ?? ''}
        />
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 w-56 md:hidden">
            <Sidebar
              role={user?.role}
              userName={user?.name ?? ''}
            />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 md:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileOpen(true)}
            aria-label="打开菜单"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <LibraryBig className="h-4 w-4" />
            </div>
            <span
              className="font-semibold text-foreground"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              图书馆
            </span>
          </div>
        </header>
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

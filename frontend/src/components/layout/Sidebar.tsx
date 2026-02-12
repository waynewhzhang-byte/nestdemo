import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CalendarClock, 
  Settings, 
  LogOut, 
  LibraryBig,
  BookMarked,
  TrendingUp
} from 'lucide-react';
import { Button } from '../ui/button';

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: UserRole;
  userName?: string;
}

export function Sidebar({ className, role = 'STUDENT', userName = 'John Doe' }: SidebarProps) {
  const baseLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/books', label: 'Books Catalog', icon: BookOpen },
  ];

  const userLinks = [
    { href: '/borrowings', label: 'My Borrowings', icon: CalendarClock },
    { href: '/reservations', label: 'My Reservations', icon: BookMarked },
  ];

  const adminLinks = [
    { href: '/borrowings', label: 'Borrowings', icon: CalendarClock },
    { href: '/reservations', label: 'Reservations', icon: BookMarked },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/statistics', label: 'Statistics', icon: TrendingUp },
  ];

  const profileLink = { href: '/profile', label: 'Profile', icon: Settings };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const links = [
    ...baseLinks,
    ...(role === 'ADMIN' ? adminLinks : userLinks),
    profileLink,
  ];

  return (
    <div className={cn("pb-12 min-h-screen border-r bg-background", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <LibraryBig className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
            LMS <span className="text-muted-foreground font-normal">Portal</span>
          </h2>
        </div>
        
        <div className="px-3 py-2">
          <div className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                    isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground"
                  )
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-0 w-full px-4">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{getInitials(userName)}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{role.toLowerCase()}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

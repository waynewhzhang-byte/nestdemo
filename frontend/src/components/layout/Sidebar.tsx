import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: UserRole;
  userName?: string;
}

export function Sidebar({ className, role = 'STUDENT', userName = '' }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = userName || (user?.name ?? '');
  const displayRole = role || (user?.role ?? 'STUDENT');

  const baseLinks = [
    { href: '/', label: '首页', icon: LayoutDashboard },
    { href: '/books', label: '图书', icon: BookOpen },
  ];

  const userLinks = [
    { href: '/borrowings', label: '借阅', icon: CalendarClock },
    { href: '/reservations', label: '预约', icon: BookMarked },
  ];

  const adminLinks = [
    { href: '/borrowings', label: '借阅管理', icon: CalendarClock },
    { href: '/reservations', label: '预约管理', icon: BookMarked },
    { href: '/users', label: '用户', icon: Users },
    { href: '/statistics', label: '统计', icon: TrendingUp },
  ];

  const profileLink = { href: '/profile', label: '个人', icon: Settings };

  const links = [
    ...baseLinks,
    ...(displayRole === 'ADMIN' || displayRole === 'TEACHER' ? adminLinks : userLinks),
    profileLink,
  ];

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className={cn(
        'min-h-screen w-56 flex flex-col border-r border-border bg-card',
        className
      )}
    >
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <LibraryBig className="h-5 w-5" />
          </div>
          <span
            className="font-semibold text-foreground tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            图书馆
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {links.map((link) => (
            <li key={link.href}>
              <NavLink
                to={link.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              {getInitials(displayName)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{displayName || '用户'}</p>
            <p className="text-xs text-muted-foreground">{displayRole}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

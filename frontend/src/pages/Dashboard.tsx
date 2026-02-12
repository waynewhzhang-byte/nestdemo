import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatCard } from '../components/ui/stat-card';
import { EmptyState } from '../components/ui/empty-state';
import { Loading } from '../components/ui/loading';
import {
  BookOpen,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  Calendar,
  BookMarked,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { borrowingsApi, finesApi, statisticsApi } from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const userRole = user?.role ?? 'STUDENT';
  const userName = user?.name ?? 'Student';
  const isAdmin = userRole === 'ADMIN' || userRole === 'TEACHER';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            {isAdmin ? 'Admin Dashboard' : `Welcome back, ${userName}`}
          </h2>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Here's an overview of your library system."
              : "Here's your library overview."}
          </p>
        </div>
        {!isAdmin && (
          <Button asChild>
            <Link to="/books">
              <BookOpen className="mr-2 h-4 w-4" />
              Browse Books
            </Link>
          </Button>
        )}
      </div>

      {isAdmin ? <AdminDashboard /> : <UserDashboard />}
    </div>
  );
}

function UserDashboard() {
  const { data: borrowingsData } = useQuery({
    queryKey: ['borrowings'],
    queryFn: () => borrowingsApi.getMy(),
  });
  const { data: finesData } = useQuery({
    queryKey: ['fines', 'my'],
    queryFn: () => finesApi.getMy(),
  });

  interface BorrowingItem {
    id: string;
    status: string;
    dueDate: string;
    book?: { title?: string; author?: string };
  }
  const borrowings: BorrowingItem[] = borrowingsData?.borrowings ?? [];
  const activeBorrows = borrowings.filter((b: BorrowingItem) => b.status === 'ACTIVE');
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const dueSoon = activeBorrows.filter((b: BorrowingItem) => {
    const due = new Date(b.dueDate);
    return due >= now && due <= threeDaysFromNow;
  }).length;
  const overdue = borrowings.filter((b: BorrowingItem) => b.status === 'OVERDUE').length;
  const totalFines = finesData?.summary?.grandTotal ?? finesData?.summary?.totalUnpaidAmount ?? 0;

  const currentReadings = activeBorrows.slice(0, 5).map((b: BorrowingItem) => {
    const due = new Date(b.dueDate);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: b.id,
      title: b.book?.title ?? '',
      author: b.book?.author ?? '',
      due: b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '',
      status: daysLeft <= 3 && daysLeft > 0 ? 'warning' : 'success',
    };
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Borrows"
          value={activeBorrows.length}
          description="Books currently borrowed"
          icon={BookOpen}
          variant="default"
        />
        <StatCard
          title="Due Soon"
          value={dueSoon}
          description="Due within 3 days"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Overdue"
          value={overdue}
          description={overdue === 0 ? 'Great job!' : 'Needs attention'}
          icon={AlertCircle}
          variant={overdue > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          title="Outstanding Fines"
          value={`$${totalFines.toFixed(2)}`}
          description={totalFines === 0 ? 'No outstanding payments' : 'Please pay soon'}
          icon={DollarSign}
          variant={totalFines > 0 ? 'destructive' : 'success'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Readings</CardTitle>
                <CardDescription>Books you are currently borrowing</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/borrowings">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {currentReadings.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No active borrowings"
                description="You don't have any books checked out. Browse our catalog to find your next read!"
                action={{
                  label: 'Browse Books',
                  onClick: () => (window.location.href = '/books'),
                }}
              />
            ) : (
              <div className="space-y-4">
                {currentReadings.map((book: { id: string; title: string; author: string; due: string; status: string }) => (
                  <div key={book.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-10 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <BookMarked className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
                          {book.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className="text-sm font-medium">{book.due}</p>
                      </div>
                      <Badge variant={book.status === 'warning' ? 'warning' : 'success'}>
                        {book.status === 'warning' ? 'Due Soon' : 'On Time'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Library services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/books">
                  <BookOpen className="mr-3 h-5 w-5" />
                  Browse Catalog
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/reservations">
                  <BookMarked className="mr-3 h-5 w-5" />
                  My Reservations
                </Link>
              </Button>
            </div>
            <Button variant="link" className="p-0 h-auto mt-4" asChild>
              <Link to="/books">
                View all books
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/books">
            <BookOpen className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Browse Catalog</div>
              <div className="text-xs text-muted-foreground">Find your next read</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/borrowings">
            <Calendar className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">My Borrowings</div>
              <div className="text-xs text-muted-foreground">View history & due dates</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/reservations">
            <BookMarked className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">My Reservations</div>
              <div className="text-xs text-muted-foreground">Check queue status</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/profile">
            <Users className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">My Profile</div>
              <div className="text-xs text-muted-foreground">Manage account</div>
            </div>
          </Link>
        </Button>
      </div>
    </>
  );
}

function AdminDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['statistics', 'dashboard'],
    queryFn: () => statisticsApi.getDashboard(),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  const books = dashboardData?.books ?? {};
  const users = dashboardData?.users ?? {};
  const borrowings = dashboardData?.borrowings ?? {};
  const fines = dashboardData?.fines ?? {};
  const totalBooks = books.total ?? 0;
  const activeBorrows = borrowings.active ?? 0;
  const overdueBooks = borrowings.overdue ?? 0;
  const totalFines = fines.unpaidAmount ?? 0;
  const totalUsers = users.total ?? 0;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Books"
          value={totalBooks.toLocaleString()}
          icon={BookOpen}
        />
        <StatCard
          title="Active Borrowings"
          value={activeBorrows}
          icon={BookMarked}
        />
        <StatCard
          title="Overdue Books"
          value={overdueBooks}
          icon={AlertCircle}
          variant={overdueBooks > 10 ? 'destructive' : 'warning'}
        />
        <StatCard
          title="Outstanding Fines"
          value={`$${Number(totalFines).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Library system at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Books in catalog:</span> <span className="font-medium">{books.total ?? 0}</span></p>
              <p><span className="text-muted-foreground">Available copies:</span> <span className="font-medium">{books.availableCopies ?? 0}</span></p>
              <p><span className="text-muted-foreground">Active borrowings:</span> <span className="font-medium">{borrowings.active ?? 0}</span></p>
              <p><span className="text-muted-foreground">Overdue:</span> <span className="font-medium">{borrowings.overdue ?? 0}</span></p>
              <p><span className="text-muted-foreground">Unpaid fines:</span> <span className="font-medium">${Number(fines.unpaidAmount ?? 0).toFixed(2)}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Period overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Users</span>
                <span className="font-medium">{users.total ?? 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recent borrowings (period)</span>
                <span className="font-medium">{borrowings.recentBorrowings ?? 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recent returns (period)</span>
                <span className="font-medium">{borrowings.recentReturns ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/books">
            <BookOpen className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Manage Books</div>
              <div className="text-xs text-muted-foreground">Add, edit, or remove</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/users">
            <Users className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Manage Users</div>
              <div className="text-xs text-muted-foreground">View all users</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/statistics">
            <TrendingUp className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">View Statistics</div>
              <div className="text-xs text-muted-foreground">Detailed analytics</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/borrowings">
            <Calendar className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">All Borrowings</div>
              <div className="text-xs text-muted-foreground">Overdue & active</div>
            </div>
          </Link>
        </Button>
      </div>
    </>
  );
}

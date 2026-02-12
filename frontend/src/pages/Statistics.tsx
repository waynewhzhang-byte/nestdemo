import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatCard } from '../components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  BookOpen,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BookMarked,
  AlertCircle,
  BarChart3,
  Activity,
} from 'lucide-react';
import { statisticsApi } from '../services/api';
import { Loading } from '../components/ui/loading';

const PERIOD_TO_PARAMS: Record<string, { timeRange?: string; startDate?: string; endDate?: string }> = {
  '7days': { timeRange: 'WEEK' },
  '30days': { timeRange: 'MONTH' },
  '90days': (() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  })(),
  year: { timeRange: 'YEAR' },
};

export default function Statistics() {
  const [period, setPeriod] = useState('30days');
  const params = PERIOD_TO_PARAMS[period] ?? { timeRange: 'MONTH' };

  const dashboardQuery = useQuery({
    queryKey: ['statistics', 'dashboard', params],
    queryFn: () => statisticsApi.getDashboard(params),
  });

  const borrowingsQuery = useQuery({
    queryKey: ['statistics', 'borrowings', params],
    queryFn: () => statisticsApi.getBorrowings(params),
  });

  const booksQuery = useQuery({
    queryKey: ['statistics', 'books'],
    queryFn: () => statisticsApi.getBooks(),
  });

  const usersQuery = useQuery({
    queryKey: ['statistics', 'users', params],
    queryFn: () => statisticsApi.getUsers(params),
  });

  const finesQuery = useQuery({
    queryKey: ['statistics', 'fines', params],
    queryFn: () => statisticsApi.getFines(params),
  });

  const trendsQuery = useQuery({
    queryKey: ['statistics', 'trends'],
    queryFn: () => statisticsApi.getTrends(),
  });

  const dashboard = dashboardQuery.data;
  const borrowings = borrowingsQuery.data;
  const books = booksQuery.data;
  const users = usersQuery.data;
  const fines = finesQuery.data;
  const trends = trendsQuery.data;

  const isLoading =
    dashboardQuery.isLoading ||
    borrowingsQuery.isLoading ||
    booksQuery.isLoading ||
    usersQuery.isLoading ||
    finesQuery.isLoading ||
    trendsQuery.isLoading;

  const stats = useMemo(() => {
    if (!dashboard) return null;
    const b = dashboard.books ?? {};
    const br = dashboard.borrowings ?? {};
    const f = fines?.summary;
    return {
      totalBooks: b.total ?? 0,
      totalUsers: dashboard.users?.total ?? 0,
      activeBorrowings: br.active ?? 0,
      overdueBooks: br.overdue ?? 0,
      totalFines: dashboard.fines?.unpaidAmount ?? 0,
      finesCollected: f?.collectedAmount ?? 0,
      newUsersThisMonth: users?.newUsers ?? 0,
      booksBorrowedThisMonth: br.recentBorrowings ?? 0,
      availableCopies: b.availableCopies ?? 0,
      borrowedCopies: b.borrowedCopies ?? 0,
      pendingReservations: dashboard.reservations?.pending ?? 0,
    };
  }, [dashboard, fines?.summary, users?.newUsers]);

  const topBorrowedBooks = useMemo(() => {
    const list = borrowings?.topBorrowedBooks ?? [];
    return list.map((item: { id: string; title: string; author: string; borrowCount: number }, i: number) => ({
      rank: i + 1,
      title: item.title ?? 'Unknown',
      author: item.author ?? '',
      borrowCount: item.borrowCount ?? 0,
    }));
  }, [borrowings?.topBorrowedBooks]);

  const categoryStats = useMemo(() => {
    const list = books?.byCategory ?? [];
    const total = list.reduce((sum: number, c: { count: number }) => sum + (c.count ?? 0), 0);
    return list.map((c: { category: string; count: number }) => ({
      category: c.category ?? 'Uncategorized',
      count: c.count ?? 0,
      percentage: total > 0 ? Math.round((c.count / total) * 100) : 0,
    }));
  }, [books?.byCategory]);

  const monthlyTrends = useMemo(() => {
    const borrows = trends?.borrowings ?? [];
    const returns = trends?.returns ?? [];
    const byMonth = new Map<string, { borrowings: number; returns: number }>();
    const add = (arr: { month: string | Date; count: number }[], key: 'borrowings' | 'returns') => {
      arr.forEach((item) => {
        const m = typeof item.month === 'string' ? item.month : (item.month as Date).toISOString().slice(0, 7);
        const existing = byMonth.get(m) ?? { borrowings: 0, returns: 0 };
        existing[key] = item.count ?? 0;
        byMonth.set(m, existing);
      });
    };
    add(borrows, 'borrowings');
    add(returns, 'returns');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([ym, v]) => {
        const [, m] = ym.split('-');
        const monthLabel = months[parseInt(m, 10) - 1] || m;
        return { month: monthLabel, borrowings: v.borrowings, returns: v.returns };
      });
  }, [trends?.borrowings, trends?.returns]);

  if (isLoading && !dashboard) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  const s = stats ?? {
    totalBooks: 0,
    totalUsers: 0,
    activeBorrowings: 0,
    overdueBooks: 0,
    totalFines: 0,
    finesCollected: 0,
    newUsersThisMonth: 0,
    booksBorrowedThisMonth: 0,
    availableCopies: 0,
    borrowedCopies: 0,
    pendingReservations: 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            Statistics & Analytics
          </h2>
          <p className="text-muted-foreground">
            Overview of library performance and usage metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Books"
          value={s.totalBooks.toLocaleString()}
          icon={BookOpen}
        />
        <StatCard
          title="Active Users"
          value={s.totalUsers}
          icon={Users}
        />
        <StatCard
          title="Active Borrowings"
          value={s.activeBorrowings}
          icon={BookMarked}
          variant="default"
        />
        <StatCard
          title="Overdue Books"
          value={s.overdueBooks}
          icon={AlertCircle}
          variant={s.overdueBooks > 10 ? 'destructive' : 'warning'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Fines Collected"
          value={`$${s.finesCollected.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Outstanding Fines"
          value={`$${s.totalFines.toFixed(2)}`}
          icon={AlertCircle}
          variant="warning"
        />
        <StatCard
          title="New Users (Period)"
          value={s.newUsersThisMonth}
          icon={TrendingUp}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="books">
            <BookOpen className="h-4 w-4 mr-2" />
            Books
          </TabsTrigger>
          <TabsTrigger value="trends">
            <BarChart3 className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Borrowed Books</CardTitle>
                <CardDescription>Most borrowed books (all time)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead className="text-right">Borrows</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topBorrowedBooks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No borrowing data yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      topBorrowedBooks.map((book: { rank: number; title: string; author: string; borrowCount: number }) => (
                        <TableRow key={book.rank}>
                          <TableCell className="font-medium">
                            <span
                              className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                                book.rank === 1
                                  ? 'bg-warning/20 text-warning'
                                  : book.rank === 2
                                    ? 'bg-muted text-muted-foreground'
                                    : book.rank === 3
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-muted/50 text-muted-foreground'
                              }`}
                            >
                              {book.rank}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
                                {book.title}
                              </p>
                              <p className="text-xs text-muted-foreground">{book.author}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{book.borrowCount}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Period Activity</CardTitle>
                <CardDescription>Borrowings and returns in the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                      <BookMarked className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Borrowings in period</p>
                      <p className="text-xs text-muted-foreground">{s.booksBorrowedThisMonth} books borrowed</p>
                    </div>
                    <span className="text-sm font-medium">{s.booksBorrowedThisMonth}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 bg-success/10 text-success">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Returns in period</p>
                      <p className="text-xs text-muted-foreground">
                        {dashboard?.borrowings?.recentReturns ?? 0} books returned
                      </p>
                    </div>
                    <span className="text-sm font-medium">{dashboard?.borrowings?.recentReturns ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 bg-info/10 text-info">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">New users in period</p>
                      <p className="text-xs text-muted-foreground">{s.newUsersThisMonth} new accounts</p>
                    </div>
                    <span className="text-sm font-medium">{s.newUsersThisMonth}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collection by Category</CardTitle>
              <CardDescription>Distribution of books across categories</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No category data yet</p>
              ) : (
                <div className="space-y-4">
                  {categoryStats.map((cat: { category: string; count: number; percentage: number }) => (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{cat.category}</span>
                        <span className="text-muted-foreground">
                          {cat.count} books ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="books" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Book Inventory Status</CardTitle>
                <CardDescription>Current state of the book collection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-success/10">
                    <p className="text-2xl font-bold text-success">{s.availableCopies}</p>
                    <p className="text-sm text-muted-foreground">Available</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-2xl font-bold text-primary">{s.borrowedCopies}</p>
                    <p className="text-sm text-muted-foreground">Borrowed</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10">
                    <p className="text-2xl font-bold text-warning">{s.pendingReservations}</p>
                    <p className="text-sm text-muted-foreground">Reserved</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10">
                    <p className="text-2xl font-bold text-destructive">{s.overdueBooks}</p>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Books by category</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Books</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      categoryStats.map((cat: { category: string; count: number; percentage: number }) => (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell className="text-right">{cat.count}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={cat.percentage > 20 ? 'success' : 'secondary'}>
                              {cat.percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Borrowing Trends</CardTitle>
              <CardDescription>Borrowings vs Returns over the past 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrends.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No trend data yet</p>
              ) : (
                <div className="space-y-6">
                  {monthlyTrends.map((month) => {
                    const maxVal = Math.max(
                      ...monthlyTrends.map((m) => Math.max(m.borrowings, m.returns)),
                      1
                    );
                    const borrowWidth = (month.borrowings / maxVal) * 100;
                    const returnWidth = (month.returns / maxVal) * 100;
                    return (
                      <div key={month.month} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium w-12">{month.month}</span>
                          <div className="flex gap-4 text-xs">
                            <span className="text-primary">Borrowed: {month.borrowings}</span>
                            <span className="text-success">Returned: {month.returns}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${borrowWidth}%` }}
                            />
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success rounded-full"
                              style={{ width: `${returnWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-center gap-6 mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-8 bg-primary rounded" />
                      <span className="text-sm text-muted-foreground">Borrowings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-8 bg-success rounded" />
                      <span className="text-sm text-muted-foreground">Returns</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Growth Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">New Users (Period)</span>
                  <span className="font-medium">{s.newUsersThisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Books Borrowed (Period)</span>
                  <span className="font-medium">{s.booksBorrowedThisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fines Collected (Total)</span>
                  <span className="font-medium">${s.finesCollected.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-warning" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overdue Rate</span>
                  <Badge variant="warning">
                    {s.activeBorrowings > 0
                      ? ((s.overdueBooks / s.activeBorrowings) * 100).toFixed(1)
                      : 0}
                    %
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Unpaid Fines</span>
                  <Badge variant="destructive">${s.totalFines.toFixed(2)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Inactive Users</span>
                  <Badge variant="secondary">
                    {users?.byStatus?.inactive ?? 0} users
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
  const userName = user?.name ?? '学生';
  const isAdmin = userRole === 'ADMIN' || userRole === 'TEACHER';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
            {isAdmin ? '工作台' : `${userName}，你好`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin ? '系统概览' : '借阅与预约概览'}
          </p>
        </div>
        {!isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/books">
              <BookOpen className="mr-2 h-4 w-4" />
              去借书
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
          title="当前借阅"
          value={activeBorrows.length}
          description="正在借阅的图书"
          icon={BookOpen}
          variant="default"
        />
        <StatCard
          title="即将到期"
          value={dueSoon}
          description="3天内到期"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="已逾期"
          value={overdue}
          description={overdue === 0 ? '表现优秀！' : '需要关注'}
          icon={AlertCircle}
          variant={overdue > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          title="待缴罚金"
          value={`¥${totalFines.toFixed(2)}`}
          description={totalFines === 0 ? '无待缴金额' : '请尽快缴纳'}
          icon={DollarSign}
          variant={totalFines > 0 ? 'destructive' : 'success'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>正在阅读</CardTitle>
                <CardDescription>您目前借阅的图书</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/borrowings">
                  查看全部
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {currentReadings.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="暂无借阅"
                description="您目前没有借阅任何图书。浏览馆藏寻找下一本好书！"
                action={{
                  label: '浏览图书',
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
                        <p className="text-xs text-muted-foreground">到期日期</p>
                        <p className="text-sm font-medium">{book.due}</p>
                      </div>
                      <Badge variant={book.status === 'warning' ? 'warning' : 'success'}>
                        {book.status === 'warning' ? '即将到期' : '正常'}
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
            <CardTitle>快捷链接</CardTitle>
            <CardDescription>图书馆服务</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/books">
                  <BookOpen className="mr-3 h-5 w-5" />
                  浏览馆藏
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/reservations">
                  <BookMarked className="mr-3 h-5 w-5" />
                  我的预约
                </Link>
              </Button>
            </div>
            <Button variant="link" className="p-0 h-auto mt-4" asChild>
              <Link to="/books">
                查看全部图书
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/books">
            <BookOpen className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">浏览馆藏</div>
              <div className="text-xs text-muted-foreground">寻找下一本好书</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/borrowings">
            <Calendar className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">我的借阅</div>
              <div className="text-xs text-muted-foreground">查看历史与到期日期</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/reservations">
            <BookMarked className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">我的预约</div>
              <div className="text-xs text-muted-foreground">查看排队状态</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/profile">
            <Users className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">个人中心</div>
              <div className="text-xs text-muted-foreground">管理账号</div>
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
          title="图书总数"
          value={totalBooks.toLocaleString()}
          icon={BookOpen}
        />
        <StatCard
          title="当前借阅"
          value={activeBorrows}
          icon={BookMarked}
        />
        <StatCard
          title="逾期图书"
          value={overdueBooks}
          icon={AlertCircle}
          variant={overdueBooks > 10 ? 'destructive' : 'warning'}
        />
        <StatCard
          title="待缴罚金"
          value={`¥${Number(totalFines).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="用户总数"
          value={totalUsers}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>概览</CardTitle>
            <CardDescription>图书馆系统一览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">馆藏图书：</span> <span className="font-medium">{books.total ?? 0}</span></p>
              <p><span className="text-muted-foreground">可借副本：</span> <span className="font-medium">{books.availableCopies ?? 0}</span></p>
              <p><span className="text-muted-foreground">当前借阅：</span> <span className="font-medium">{borrowings.active ?? 0}</span></p>
              <p><span className="text-muted-foreground">逾期数量：</span> <span className="font-medium">{borrowings.overdue ?? 0}</span></p>
              <p><span className="text-muted-foreground">未缴罚金：</span> <span className="font-medium">¥{Number(fines.unpaidAmount ?? 0).toFixed(2)}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>快速统计</CardTitle>
            <CardDescription>周期概览</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">用户总数</span>
                <span className="font-medium">{users.total ?? 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">近期借阅（周期）</span>
                <span className="font-medium">{borrowings.recentBorrowings ?? 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">近期归还（周期）</span>
                <span className="font-medium">{borrowings.recentReturns ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/books">
            <BookOpen className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">图书管理</div>
              <div className="text-xs text-muted-foreground">添加、编辑或删除</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/users">
            <Users className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">用户管理</div>
              <div className="text-xs text-muted-foreground">查看所有用户</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/statistics">
            <TrendingUp className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">数据统计</div>
              <div className="text-xs text-muted-foreground">详细分析</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start" asChild>
          <Link to="/borrowings">
            <Calendar className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">全部借阅</div>
              <div className="text-xs text-muted-foreground">逾期与活跃</div>
            </div>
          </Link>
        </Button>
      </div>
    </>
  );
}

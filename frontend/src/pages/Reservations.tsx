import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatCard } from '../components/ui/stat-card';
import { EmptyState } from '../components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  BookMarked,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Link } from 'react-router-dom';
import { reservationsApi } from '../services/api';
import { Loading } from '../components/ui/loading';

type ReservationStatus = 'PENDING' | 'READY' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

interface Reservation {
  id: string;
  bookId: string;
  book?: { id: string; title: string; author: string };
  createdAt: string;
  expiresAt: string;
  status: ReservationStatus;
}

export default function Reservations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => reservationsApi.getMy(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setCancelDialogOpen(false);
      setSelectedReservation(null);
    },
  });

  const reservations: Reservation[] = data?.reservations ?? [];
  const pendingReservations = reservations.filter((r) => r.status === 'PENDING');
  const readyReservations = reservations.filter((r) => r.status === 'READY');
  const historyReservations = reservations.filter((r) =>
    ['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(r.status),
  );

  const filteredReservations = (list: Reservation[]) =>
    list.filter(
      (r) =>
        r.book?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.book?.author?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const stats = {
    pending: pendingReservations.length,
    ready: readyReservations.length,
    total: pendingReservations.length + readyReservations.length,
  };

  const handleCancel = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    if (selectedReservation) cancelMutation.mutate(selectedReservation.id);
  };

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">排队中</Badge>;
      case 'READY':
        return <Badge variant="success">可取书</Badge>;
      case 'FULFILLED':
        return <Badge variant="secondary">已完成</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">已取消</Badge>;
      case 'EXPIRED':
        return <Badge variant="outline">已过期</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            我的预约
          </h2>
          <p className="text-muted-foreground">
            追踪您的图书预约和排队情况
          </p>
        </div>
        <Button asChild>
          <Link to="/books">
            <BookMarked className="mr-2 h-4 w-4" />
            预约图书
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="等待中预约" value={stats.pending} icon={Clock} variant="warning" />
        <StatCard title="可取书" value={stats.ready} icon={CheckCircle} variant="success" />
        <StatCard title="总计活跃" value={stats.total} icon={BookMarked} variant="default" />
      </div>

      {stats.ready > 0 && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium text-success">
                  您有 {stats.ready} 本图书可以取书了！
                </p>
                <p className="text-sm text-muted-foreground">
                  请在 3 天内取书，否则预约可能会过期。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索预约..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">等待中 ({pendingReservations.length})</TabsTrigger>
          <TabsTrigger value="ready">可取书 ({readyReservations.length})</TabsTrigger>
          <TabsTrigger value="history">历史记录 ({historyReservations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredReservations(pendingReservations).length === 0 ? (
                <EmptyState
                  icon={BookMarked}
                  title="暂无等待中的预约"
                  description="您目前不在任何排队队列中。去图书库预约图书吧！"
                />
              ) : (
                <div className="divide-y">
                  {filteredReservations(pendingReservations).map((reservation) => (
                    <div key={reservation.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-16 w-12 rounded bg-warning/10 flex items-center justify-center text-warning flex-shrink-0">
                          <Clock className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ fontFamily: 'var(--font-serif)' }}>
                            {reservation.book?.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{reservation.book?.author}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              预约日期: {reservation.createdAt ? new Date(reservation.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleCancel(reservation)}>
                          <XCircle className="h-4 w-4 mr-1" />
                          取消
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ready" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredReservations(readyReservations).length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="暂无待取的图书"
                  description="当您预约的图书可取时，它们将显示在这里。"
                />
              ) : (
                <div className="divide-y">
                  {filteredReservations(readyReservations).map((reservation) => (
                    <div key={reservation.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-success/5">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-16 w-12 rounded bg-success/20 flex items-center justify-center text-success flex-shrink-0">
                          <CheckCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ fontFamily: 'var(--font-serif)' }}>
                            {reservation.book?.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{reservation.book?.author}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="success" className="text-xs">
                              可取书
                            </Badge>
                            <span className="text-xs text-warning font-medium">
                              取书截止日期: {reservation.expiresAt ? new Date(reservation.expiresAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <Button variant="destructive" size="sm" onClick={() => handleCancel(reservation)}>
                          取消
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredReservations(historyReservations).length === 0 ? (
                <EmptyState
                  icon={BookMarked}
                  title="暂无预约历史"
                  description="您过去的预约将显示在这里。"
                />
              ) : (
                <div className="divide-y">
                  {filteredReservations(historyReservations).map((reservation) => (
                    <div key={reservation.id} className="p-4 flex items-center gap-4">
                      <div className="h-16 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                        <BookMarked className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ fontFamily: 'var(--font-serif)' }}>
                          {reservation.book?.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{reservation.book?.author}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          预约日期: {reservation.createdAt ? new Date(reservation.createdAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>取消预约</DialogTitle>
            <DialogDescription>
              您确定要取消 &quot;{selectedReservation?.book?.title}&quot; 的预约吗？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              此操作无法撤销。如果您改变主意，需要重新预约。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              保留预约
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              取消预约
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

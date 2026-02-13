import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatCard } from '../components/ui/stat-card';
import { EmptyState } from '../components/ui/empty-state';
import { Loading } from '../components/ui/loading';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  BookOpen, 
  AlertCircle, 
  Clock, 
  RotateCcw,
  Search,
  BookMarked,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { borrowingsApi } from '../services/api';

interface Borrowing {
  id: string;
  bookId: string;
  book: {
    id: string;
    title: string;
    author: string;
    isbn?: string;
    coverImage?: string;
  };
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST';
  renewedCount: number;
  maxRenewals: number;
}

export default function Borrowings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);

  const { data: borrowingsData, isLoading } = useQuery({
    queryKey: ['borrowings'],
    queryFn: () => borrowingsApi.getMy(),
  });

  const renewMutation = useMutation({
    mutationFn: (borrowingId: string) => borrowingsApi.renew(borrowingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowings'] });
      setRenewDialogOpen(false);
      setSelectedBorrowing(null);
    },
  });

  const returnMutation = useMutation({
    mutationFn: (borrowingId: string) => borrowingsApi.return(borrowingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowings'] });
    },
  });

  if (isLoading && !borrowingsData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  const borrowings: Borrowing[] = borrowingsData?.borrowings || [];
  
  const currentBorrows = borrowings.filter(b => b.status === 'ACTIVE');
  const overdueBorrows = borrowings.filter(b => b.status === 'OVERDUE');
  const historyBorrows = borrowings.filter(b => b.status === 'RETURNED');

  const filteredBorrowings = (borrowingsList: Borrowing[]) => 
    borrowingsList.filter(b => 
      b.book?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.book?.author?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = {
    active: currentBorrows.length,
    overdue: overdueBorrows.length,
    totalFines: 0,
  };

  const handleRenew = (borrowing: Borrowing) => {
    setSelectedBorrowing(borrowing);
    setRenewDialogOpen(true);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            我的借阅
          </h2>
          <p className="text-muted-foreground">
            管理您的借阅图书并查看历史记录
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="当前借阅"
          value={stats.active}
          icon={BookOpen}
          variant="default"
        />
        <StatCard
          title="已逾期"
          value={stats.overdue}
          icon={AlertCircle}
          variant={stats.overdue > 0 ? "destructive" : "success"}
        />
        <StatCard
          title="待缴罚金"
          value={`$${stats.totalFines.toFixed(2)}`}
          icon={Clock}
          variant={stats.totalFines > 0 ? "warning" : "success"}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索书名或作者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="按状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部图书</SelectItem>
            <SelectItem value="due-soon">即将到期</SelectItem>
            <SelectItem value="overdue">已逾期</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">
            当前 ({currentBorrows.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            已逾期 ({overdueBorrows.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            历史记录 ({historyBorrows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredBorrowings(currentBorrows).length === 0 ? (
                <EmptyState
                  icon={BookMarked}
                  title="暂无借阅中的图书"
                  description="您目前没有借阅任何图书。去图书库看看吧！"
                />
              ) : (
                <div className="divide-y">
                  {filteredBorrowings(currentBorrows).map((borrowing) => {
                    const daysLeft = getDaysUntilDue(borrowing.dueDate);
                    const isDueSoon = daysLeft <= 3 && daysLeft > 0;
                    
                    return (
                      <div key={borrowing.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="h-16 w-12 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <BookMarked className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ fontFamily: 'var(--font-serif)' }}>
                              {borrowing.book?.title}
                            </p>
                            <p className="text-sm text-muted-foreground">{borrowing.book?.author}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={isDueSoon ? "warning" : "outline"} className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                应还日期 {borrowing.dueDate ? new Date(borrowing.dueDate).toLocaleDateString() : ''}
                              </Badge>
                              {isDueSoon && (
                                <span className="text-xs text-warning font-medium">
                                  还剩 {daysLeft} 天到期
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                          {(borrowing.maxRenewals - borrowing.renewedCount) > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRenew(borrowing)}
                              disabled={renewMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              续借 ({borrowing.maxRenewals - borrowing.renewedCount})
                            </Button>
                          )}
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => returnMutation.mutate(borrowing.id)}
                            disabled={returnMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            归还
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredBorrowings(overdueBorrows).length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="暂无逾期图书"
                  description="太棒了！您没有任何逾期图书。"
                />
              ) : (
                <div className="divide-y">
                  {filteredBorrowings(overdueBorrows).map((borrowing) => (
                    <div key={borrowing.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-destructive/5">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-16 w-12 rounded bg-destructive/20 flex items-center justify-center text-destructive flex-shrink-0">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ fontFamily: 'var(--font-serif)' }}>
                            {borrowing.book?.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{borrowing.book?.author}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="destructive" className="text-xs">
                              原定还书日期 {borrowing.dueDate ? new Date(borrowing.dueDate).toLocaleDateString() : ''}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => returnMutation.mutate(borrowing.id)}
                          disabled={returnMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          立即归还
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
              {filteredBorrowings(historyBorrows).length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="暂无借阅历史"
                  description="您归还的图书将显示在这里。"
                />
              ) : (
                <div className="divide-y">
                  {filteredBorrowings(historyBorrows).map((borrowing) => (
                    <div key={borrowing.id} className="p-4 flex items-center gap-4">
                      <div className="h-16 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                        <BookMarked className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ fontFamily: 'var(--font-serif)' }}>
                          {borrowing.book?.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{borrowing.book?.author}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          借阅日期: {borrowing.borrowedAt ? new Date(borrowing.borrowedAt).toLocaleDateString() : ''} • 归还日期: {borrowing.returnedAt ? new Date(borrowing.returnedAt).toLocaleDateString() : '-'}
                        </p>
                      </div>
                      <Badge variant="secondary">已归还</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>续借图书</DialogTitle>
            <DialogDescription>
              您确定要续借 "{selectedBorrowing?.book?.title}" 吗？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedBorrowing && (
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">当前应还日期：</span> {selectedBorrowing.dueDate ? new Date(selectedBorrowing.dueDate).toLocaleDateString() : ''}</p>
                <p><span className="text-muted-foreground">新应还日期：</span> {
                  selectedBorrowing.dueDate
                    ? new Date(new Date(selectedBorrowing.dueDate).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()
                    : ''
                }</p>
                <p><span className="text-muted-foreground">续借剩余次数：</span> {selectedBorrowing.maxRenewals - selectedBorrowing.renewedCount - 1}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={() => selectedBorrowing && renewMutation.mutate(selectedBorrowing.id)}
              disabled={renewMutation.isPending}
            >
              确认续借
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

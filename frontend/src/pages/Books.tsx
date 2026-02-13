import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Filter, LibraryBig } from 'lucide-react';
import { booksApi, borrowingsApi } from '../services/api';
import { useToast } from '../components/ui/toast';
import { Loading } from '../components/ui/loading';
import { EmptyState } from '../components/ui/empty-state';
import { BookOpen } from 'lucide-react';

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  status: string;
  availableCopies?: number;
  totalCopies?: number;
}

export default function Books() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['books', { search, category, page, limit }],
    queryFn: () => booksApi.getAll({ search: search || undefined, category: category || undefined, page, limit }),
  });

  const borrowMutation = useMutation({
    mutationFn: (bookId: string) => borrowingsApi.borrow(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['borrowings'] });
      success('成功', '图书借阅成功。');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toastError('借阅失败', err.response?.data?.message || '无法借阅图书。');
    },
  });

  const books = data?.books ?? [];
  const pagination = data?.pagination;
  const categoriesQuery = useQuery({
    queryKey: ['books', 'categories'],
    queryFn: () => booksApi.getCategories(),
  });
  const categories = categoriesQuery.data ?? [];

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
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/60">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-semibold tracking-wider text-primary uppercase">
            <LibraryBig className="h-3 w-3" />
            馆藏图书
          </div>
          <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>浏览图书库</h2>
          <p className="text-muted-foreground text-lg max-w-xl">探索我们精心策划的知识与文学收藏。按书名、作者或类别进行搜索。</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索书名、作者、ISBN..."
            className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary/50"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="h-11 rounded-lg border border-input bg-background px-4 text-sm min-w-[200px] cursor-pointer hover:border-primary/50 transition-colors"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="">所有类别</option>
          {categories.map((c: { name: string; count: number }) => (
            <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
          ))}
        </select>
        <Button variant="outline" size="icon" title="Filter" className="h-11 w-11">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="未找到相关图书"
          description="您的搜索没有结果。请尝试放宽搜索条件或探索不同类别。"
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book: Book, index: number) => (
              <Card key={book.id} className="archivist-card overflow-hidden flex flex-col group" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="aspect-[3/4] bg-gradient-to-br from-muted/50 to-muted/30 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl font-black text-muted-foreground/10 rotate-[-15deg] tracking-widest uppercase">
                      {book.title.substring(0, 1)}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-end pb-6">
                    <Button variant="default" className="shadow-xl shadow-primary/20 translate-y-4 group-hover:translate-y-0 transition-transform duration-300" asChild>
                      <a href={`/books/${book.id}`}>查看详情</a>
                    </Button>
                  </div>
                  <StatusBadge status={book.status} />
                </div>
                <CardHeader className="p-4 pb-2 flex-1">
                  <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wider w-fit">
                    {book.category}
                  </Badge>
                  <CardTitle className="line-clamp-2 text-lg leading-tight font-serif" title={book.title}>{book.title}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{book.author}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 font-mono">{book.isbn}</p>
                </CardHeader>
                <CardFooter className="p-4 pt-2 mt-auto border-t bg-muted/20">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-muted-foreground">
                      {book.availableCopies ?? 0} / {book.totalCopies ?? 0} 可用
                    </span>
                    <Button
                      size="sm"
                      disabled={book.status !== 'AVAILABLE' || borrowMutation.isPending}
                      variant={book.status === 'AVAILABLE' ? 'default' : 'secondary'}
                      onClick={() => book.status === 'AVAILABLE' && borrowMutation.mutate(book.id)}
                      className="shadow-sm"
                    >
                      {book.status === 'AVAILABLE' ? '借阅' : '不可用'}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                第 <span className="font-medium text-foreground">{pagination.page}</span> 页，共 <span className="font-medium text-foreground">{pagination.totalPages}</span> 页
                <span className="mx-2">·</span>
                <span className="font-medium text-foreground">{pagination.total}</span> 本图书
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'AVAILABLE':
      return <Badge variant="success" className="h-5">可借阅</Badge>;
    case 'BORROWED':
      return <Badge variant="warning" className="h-5">已借出</Badge>;
    case 'RESERVED':
      return <Badge variant="info" className="h-5">已预约</Badge>;
    default:
      return <Badge variant="secondary" className="h-5">{status}</Badge>;
  }
}

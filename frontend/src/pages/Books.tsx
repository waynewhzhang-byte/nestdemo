import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Filter } from 'lucide-react';
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
      success('Success', 'Book borrowed successfully.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toastError('Borrow failed', err.response?.data?.message || 'Could not borrow book.');
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Library Catalog</h2>
          <p className="text-muted-foreground">Browse and search for books in our collection.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              className="pl-8"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <option value="">All categories</option>
            {categories.map((c: { name: string; count: number }) => (
              <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
            ))}
          </select>
          <Button variant="outline" size="icon" title="Filter">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books found"
          description="Try adjusting your search or category filter."
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book: Book) => (
              <Card key={book.id} className="overflow-hidden flex flex-col transition-all hover:shadow-md">
                <div className="aspect-[3/4] bg-muted relative group">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 text-4xl font-black uppercase tracking-widest rotate-[-45deg]">
                    Cover
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" className="translate-y-4 group-hover:translate-y-0 transition-transform" asChild>
                      <a href={`/books/${book.id}`}>View Details</a>
                    </Button>
                  </div>
                </div>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wider">
                      {book.category}
                    </Badge>
                    <StatusBadge status={book.status} />
                  </div>
                  <CardTitle className="line-clamp-1 text-lg" title={book.title}>{book.title}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
                </CardHeader>
                <CardFooter className="p-4 pt-0 mt-auto">
                  <Button
                    className="w-full"
                    disabled={book.status !== 'AVAILABLE' || borrowMutation.isPending}
                    variant={book.status === 'AVAILABLE' ? 'default' : 'secondary'}
                    onClick={() => book.status === 'AVAILABLE' && borrowMutation.mutate(book.id)}
                  >
                    {book.status === 'AVAILABLE' ? 'Borrow Now' : 'Unavailable'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} books)
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
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
      return <Badge variant="success" className="h-5">Available</Badge>;
    case 'BORROWED':
      return <Badge variant="warning" className="h-5">Borrowed</Badge>;
    case 'RESERVED':
      return <Badge variant="info" className="h-5">Reserved</Badge>;
    default:
      return <Badge variant="secondary" className="h-5">{status}</Badge>;
  }
}

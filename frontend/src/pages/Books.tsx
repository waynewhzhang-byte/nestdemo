import { Card, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Filter } from 'lucide-react';

const MOCK_BOOKS = [
  { id: 1, title: "Clean Code", author: "Robert C. Martin", category: "Computer Science", status: "AVAILABLE" },
  { id: 2, title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Fiction", status: "BORROWED" },
  { id: 3, title: "Introduction to Algorithms", author: "Thomas H. Cormen", category: "Education", status: "RESERVED" },
  { id: 4, title: "Design Patterns", author: "Erich Gamma", category: "Computer Science", status: "AVAILABLE" },
  { id: 5, title: "To Kill a Mockingbird", author: "Harper Lee", category: "Fiction", status: "AVAILABLE" },
  { id: 6, title: "1984", author: "George Orwell", category: "Fiction", status: "BORROWED" },
];

export default function Books() {
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
                <Input placeholder="Search books..." className="pl-8" />
            </div>
            <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
            </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MOCK_BOOKS.map((book) => (
            <Card key={book.id} className="overflow-hidden flex flex-col transition-all hover:shadow-md">
                <div className="aspect-[3/4] bg-muted relative group">
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 text-4xl font-black uppercase tracking-widest rotate-[-45deg]">
                        Cover
                    </div>
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="secondary" className="translate-y-4 group-hover:translate-y-0 transition-transform">
                            View Details
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
                    <Button className="w-full" disabled={book.status !== 'AVAILABLE'} variant={book.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                        {book.status === 'AVAILABLE' ? 'Borrow Now' : 'Unavailable'}
                    </Button>
                </CardFooter>
            </Card>
        ))}
      </div>
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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BookOpen, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, Student. Here is your library overview.</p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Borrows</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+1 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Due in 2 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Great job!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
            <span className="text-sm font-bold text-muted-foreground">$0.00</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Clean</div>
            <p className="text-xs text-muted-foreground">No outstanding payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Borrowings Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Current Readings</CardTitle>
            <CardDescription>
              Books you are currently borrowing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "Design Systems", author: "Alla Kholmatova", due: "2023-10-15", status: "warning" },
                { title: "Refactoring UI", author: "Adam Wathan", due: "2023-10-20", status: "success" },
                { title: "The Pragmatic Programmer", author: "Andy Hunt", due: "2023-11-01", status: "success" },
              ].map((book, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-8 rounded bg-muted flex-shrink-0" />
                      <div>
                        <p className="font-medium leading-none">{book.title}</p>
                        <p className="text-sm text-muted-foreground">{book.author}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className="text-sm font-medium">{book.due}</p>
                      </div>
                      <Badge variant={book.status as any}>
                        {book.status === 'warning' ? 'Due Soon' : 'On Time'}
                      </Badge>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>New Arrivals</CardTitle>
            <CardDescription>
              Recently added to the library.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                 {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="h-16 w-12 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                           BOOK
                        </div>
                        <div>
                           <p className="font-medium">Modern Software Engineering</p>
                           <p className="text-xs text-muted-foreground">David Farley</p>
                           <Button variant="link" className="h-auto p-0 text-xs mt-1">View Details</Button>
                        </div>
                    </div>
                 ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

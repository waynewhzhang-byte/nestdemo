import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { User, Mail, Phone, History, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { borrowingsApi, finesApi } from '../services/api';
import { Loading } from '../components/ui/loading';
import { EmptyState } from '../components/ui/empty-state';

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: borrowingsData, isLoading: borrowingsLoading } = useQuery({
    queryKey: ['borrowings', 'my'],
    queryFn: () => borrowingsApi.getMy({ limit: 20 }),
  });

  const { data: finesData, isLoading: finesLoading } = useQuery({
    queryKey: ['fines', 'my'],
    queryFn: () => finesApi.getMy(),
  });

  const borrowings = borrowingsData?.borrowings ?? [];
  const fines = finesData?.fines ?? [];
  const totalOwed = finesData?.summary?.grandTotal ?? finesData?.summary?.totalUnpaidAmount ?? 0;
  const hasOutstanding = totalOwed > 0;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  const roleLabel = user.role === 'ADMIN' ? 'Admin' : user.role === 'TEACHER' ? 'Teacher' : 'Student';
  const idLabel = user.studentId ? `ID: ${user.studentId}` : user.teacherId ? `ID: ${user.teacherId}` : '';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
          {roleLabel} Profile
        </h2>
        <p className="text-muted-foreground">Manage your account settings and view history.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{user.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {roleLabel}
                  {idLabel ? ` • ${idLabel}` : ''}
                </p>
                <Badge variant="success" className="mt-2">
                  Account Active
                </Badge>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>

              <Button variant="outline" className="w-full">
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Borrowing History</CardTitle>
                  <CardDescription>Your recent library activity.</CardDescription>
                </div>
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {borrowingsLoading ? (
                <div className="flex justify-center py-8">
                  <Loading />
                </div>
              ) : borrowings.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No borrowings yet"
                  description="Your borrowing history will appear here."
                />
              ) : (
                <div className="space-y-6">
                  {borrowings.map((item: { id: string; status: string; dueDate?: string; returnedAt?: string; borrowedAt?: string; book?: { title?: string; author?: string } }) => {
                    const title = item.book?.title ?? 'Unknown';
                    const isReturned = item.status === 'RETURNED' && item.returnedAt;
                    const dateStr = isReturned && item.returnedAt
                      ? `Returned ${new Date(item.returnedAt).toLocaleDateString()}`
                      : item.dueDate
                        ? `Due ${new Date(item.dueDate).toLocaleDateString()}`
                        : item.borrowedAt
                          ? `Borrowed ${new Date(item.borrowedAt).toLocaleDateString()}`
                          : '';
                    const statusLabel = item.status === 'ACTIVE' ? 'Active' : item.status === 'OVERDUE' ? 'Overdue' : 'Returned';
                    return (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{title}</p>
                          <p className="text-sm text-muted-foreground">{dateStr}</p>
                        </div>
                        <span
                          className={`text-sm ${
                            statusLabel === 'Active' ? 'text-primary font-bold' : statusLabel === 'Overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fines & Fees</CardTitle>
                  <CardDescription>Outstanding payments for overdue items.</CardDescription>
                </div>
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {finesLoading ? (
                <div className="flex justify-center py-8">
                  <Loading />
                </div>
              ) : !hasOutstanding && fines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No outstanding fines.</p>
                  <p className="text-xs mt-1">Good job keeping your returns on time!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <span className="font-medium">Total outstanding</span>
                    <span className="text-destructive font-bold">${Number(totalOwed).toFixed(2)}</span>
                  </div>
                  {fines.filter((f: { status: string }) => f.status === 'UNPAID' || f.status === 'PARTIAL').length > 0 && (
                    <ul className="space-y-2 text-sm">
                      {fines
                        .filter((f: { status: string }) => f.status === 'UNPAID' || f.status === 'PARTIAL')
                        .map((f: { id: string; amount: number; status: string; borrowing?: { book?: { title?: string } } }) => (
                          <li key={f.id} className="flex justify-between">
                            <span className="text-muted-foreground">{f.borrowing?.book?.title ?? 'Fine'}</span>
                            <span>${Number(f.amount).toFixed(2)}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

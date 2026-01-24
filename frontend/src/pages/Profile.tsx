import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { User, Mail, Phone, MapPin, History, CreditCard } from 'lucide-react';

export default function Profile() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Student Profile</h2>
        <p className="text-muted-foreground">Manage your account settings and view history.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* User Info Sidebar */}
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
                        <h3 className="text-xl font-bold">John Doe</h3>
                        <p className="text-sm text-muted-foreground">Student • ID: 2023001</p>
                        <Badge variant="success" className="mt-2">Account Active</Badge>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>john.doe@university.edu</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>+1 (555) 000-0000</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>Dormitory A, Room 101</span>
                        </div>
                    </div>
                    
                    <Button variant="outline" className="w-full">Edit Profile</Button>
                </CardContent>
            </Card>
        </div>

        {/* History & Fines */}
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
                    <div className="space-y-8">
                        {[
                            { title: "Clean Code", date: "Returned Oct 10, 2023", status: "Returned" },
                            { title: "The Pragmatic Programmer", date: "Returned Sep 15, 2023", status: "Returned" },
                            { title: "Design Patterns", date: "Due Oct 20, 2023", status: "Active" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">{item.title}</p>
                                    <p className="text-sm text-muted-foreground">{item.date}</p>
                                </div>
                                <div className={`text-sm ${item.status === 'Active' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                    {item.status}
                                </div>
                            </div>
                        ))}
                    </div>
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
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No outstanding fines.</p>
                        <p className="text-xs mt-1">Good job keeping your returns on time!</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

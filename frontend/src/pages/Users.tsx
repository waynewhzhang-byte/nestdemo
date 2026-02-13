import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatCard } from '../components/ui/stat-card';
import { EmptyState } from '../components/ui/empty-state';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Users,
  Search,
  MoreHorizontal,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  GraduationCap,
  BookOpen,
  DollarSign,
} from 'lucide-react';
import { usersApi } from '../services/api';
import { useToast } from '../components/ui/toast';
import { Loading } from '../components/ui/loading';

type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  borrowingsCount: number;
  finesOwed: number;
  createdAt: string;
  updatedAt: string;
  phone?: string;
  studentId?: string;
  teacherId?: string;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', { search, role: roleFilter === 'all' ? undefined : roleFilter, page }],
    queryFn: () =>
      usersApi.getAll({
        search: search || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        page,
        limit: 10,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; isActive?: boolean } }) =>
      usersApi.update(id, data),
      onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      success('成功', '用户信息已更新。');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toastError('更新失败', err.response?.data?.message || '无法更新用户信息。');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      success('成功', '用户已禁用。');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toastError('禁用失败', err.response?.data?.message || '无法禁用用户。');
    },
  });

  const users: User[] = data?.users ?? [];
  const pagination = data?.pagination;

  const stats = {
    total: pagination?.total ?? 0,
    students: users.filter((u) => u.role === 'STUDENT').length,
    teachers: users.filter((u) => u.role === 'TEACHER').length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    active: users.filter((u) => u.isActive).length,
    withFines: users.filter((u) => u.finesOwed > 0).length,
    totalFines: users.reduce((sum, u) => sum + u.finesOwed, 0),
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <Badge variant="destructive">
            <Shield className="h-3 w-3 mr-1" />
            管理员
          </Badge>
        );
      case 'TEACHER':
        return (
          <Badge variant="secondary">
            <GraduationCap className="h-3 w-3 mr-1" />
            教师
          </Badge>
        );
      case 'STUDENT':
        return (
          <Badge variant="outline">
            <BookOpen className="h-3 w-3 mr-1" />
            学生
          </Badge>
        );
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (role: string, isActive: boolean) => {
    if (!selectedUser) return;
    updateMutation.mutate({
      id: selectedUser.id,
      data: { role, isActive },
    });
  };

  const handleDeactivate = (user: User) => {
    if (window.confirm(`确定要禁用用户 ${user.name} 吗？禁用后该用户将无法登录。`)) {
      removeMutation.mutate(user.id);
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
            用户管理
          </h2>
          <p className="text-muted-foreground">管理图书馆用户、角色和权限</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          添加用户
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="总用户数" value={pagination?.total ?? 0} icon={Users} />
        <StatCard title="活跃用户" value={stats.active} icon={Users} variant="success" />
        <StatCard title="欠费用户" value={stats.withFines} icon={DollarSign} variant="warning" />
        <StatCard
          title="总欠费"
          value={`$${stats.totalFines.toFixed(2)}`}
          icon={DollarSign}
          variant={stats.totalFines > 0 ? 'destructive' : 'success'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.students}</p>
              <p className="text-sm text-muted-foreground">学生（当前页）</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.teachers}</p>
              <p className="text-sm text-muted-foreground">教师（当前页）</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-sm text-muted-foreground">管理员（当前页）</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名或邮箱..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="按角色筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有角色</SelectItem>
                <SelectItem value="STUDENT">学生</SelectItem>
                <SelectItem value="TEACHER">教师</SelectItem>
                <SelectItem value="ADMIN">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="未找到用户"
              description="请尝试调整您的搜索或筛选条件。"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-center">借阅数</TableHead>
                  <TableHead className="text-right">罚金</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="success">激活</Badge>
                      ) : (
                        <Badge variant="warning">禁用</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{user.borrowingsCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.finesOwed > 0 ? (
                        <span className="text-destructive font-medium">${user.finesOwed.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑用户
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeactivate(user)}
                            disabled={!user.isActive}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            禁用用户
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                第 {pagination.page} 页，共 {pagination.totalPages} 页（{pagination.total} 名用户）
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSave={handleSaveEdit}
        isLoading={updateMutation.isPending}
      />

      <CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })} />
    </div>
  );
}

function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: User | null;
  onSave: (role: string, isActive: boolean) => void;
  isLoading: boolean;
}) {
  const [role, setRole] = useState<string>(user?.role ?? 'STUDENT');
  const [isActive, setIsActive] = useState<boolean>(user?.isActive ?? true);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setIsActive(user.isActive);
    }
  }, [user?.id, user?.role, user?.isActive, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>更新用户角色和状态</DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg" style={{ fontFamily: 'var(--font-serif)' }}>
                  {user.name}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">学生</SelectItem>
                  <SelectItem value="TEACHER">教师</SelectItem>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">状态</label>
              <Select value={isActive ? 'ACTIVE' : 'INACTIVE'} onValueChange={(v) => setIsActive(v === 'ACTIVE')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">激活</SelectItem>
                  <SelectItem value="INACTIVE">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
              <div>
                <p className="text-muted-foreground">注册时间</p>
                <p className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">借阅数</p>
                <p className="font-medium">{user.borrowingsCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">待缴罚金</p>
                <p className="font-medium text-destructive">${user.finesOwed.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onSave(role, isActive)} disabled={isLoading}>
            保存更改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('STUDENT');
  const { success, error: toastError } = useToast();

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ email, password, name, role }),
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      setEmail('');
      setPassword('');
      setName('');
      setRole('STUDENT');
      success('成功', '用户已创建。');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toastError('创建失败', err.response?.data?.message || '无法创建用户。');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加用户</DialogTitle>
          <DialogDescription>创建一个新的图书馆用户账号</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">电子邮箱</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@school.edu" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">密码</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 个字符" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">姓名</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="全名" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">角色</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">学生</SelectItem>
                <SelectItem value="TEACHER">教师</SelectItem>
                <SelectItem value="ADMIN">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!email || !password || !name || createMutation.isPending}
          >
            创建用户
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

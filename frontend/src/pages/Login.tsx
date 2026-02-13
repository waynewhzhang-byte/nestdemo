import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { LibraryBig, Loader2, BookOpen } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-accent/10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-primary/10 rounded-full" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <div className="h-24 w-24 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 rotate-3 mb-8">
            <LibraryBig className="h-14 w-14" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-center mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
            现代 <span className="text-accent italic">档案管理系统</span>
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-md">
            知识的大门为您敞开。探索我们精选的文献和资源宝库。
          </p>
          <div className="mt-12 flex items-center gap-8 text-sm text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>10,000+ 藏书</span>
            </div>
            <div className="flex items-center gap-2">
              <LibraryBig className="h-4 w-4" />
              <span>全天候访问</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-1 pb-8 text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                <LibraryBig className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                现代档案管理系统
              </span>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
              欢迎回来
            </CardTitle>
            <CardDescription>请输入您的账号信息登录</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in slide-in-from-top-2">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">邮箱地址</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-background/50 backdrop-blur-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-background/50 backdrop-blur-sm"
                />
              </div>
              <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              还没有账号？{' '}
              <Link to="/register" className="text-primary hover:text-accent font-medium transition-colors">
                立即注册
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

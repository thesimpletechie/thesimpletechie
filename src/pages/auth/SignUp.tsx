import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Loader2, Check, X, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password strength criteria
  const passwordCriteria = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'At least one lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'At least one special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const strength = passwordCriteria.filter(c => c.test(password)).length;
  const strengthPercentage = (strength / passwordCriteria.length) * 100;

  const getStrengthColor = () => {
    if (strength <= 1) return 'bg-destructive';
    if (strength <= 3) return 'bg-yellow-500';
    if (strength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (!password) return '';
    if (strength <= 1) return 'Very Weak';
    if (strength <= 3) return 'Weak';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };
  const { signUp, signInWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (strength < passwordCriteria.length) {
      toast({
        title: 'Weak password',
        description: 'Please meet all password requirements.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    const result = await signUp(name, email, password);

    if (result.success) {
      toast({
        title: 'Account created',
        description: 'Welcome to TheSimpleTechie!',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Sign up failed',
        description: result.error || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <div className="flex items-center justify-center w-48 h-16 rounded-2xl overflow-hidden mb-4">
            <img src="/logo.svg" alt="DevSuite AI" className="w-full h-full object-contain" />
          </div>
        </div>

        <Card className="border-border-subtle/30">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription>Get started with TheSimpleTechie</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                {password && (
                  <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider">
                        <span className="text-muted-foreground">Strength: {getStrengthLabel()}</span>
                        <span className={cn(
                          strength === passwordCriteria.length ? "text-green-500" : "text-muted-foreground"
                        )}>
                          {strength}/{passwordCriteria.length}
                        </span>
                      </div>
                      <Progress value={strengthPercentage} className="h-1" indicatorClassName={getStrengthColor()} />
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {passwordCriteria.map((criterion, i) => {
                        const isMet = criterion.test(password);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            {isMet ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-muted-foreground/30" />
                            )}
                            <span className={cn(
                              "text-[11px] transition-colors",
                              isMet ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                              {criterion.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border-subtle/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-border-subtle/30"
                onClick={async () => {
                  const result = await signInWithGoogle();
                  if (result.success) navigate('/dashboard');
                }}
                disabled={isLoading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.01.68-2.33 1.09-3.71 1.09-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.87 14.15c-.21-.65-.33-1.33-.33-2.05s.12-1.4.33-2.05V7.21H2.18C1.43 8.68 1 10.3 1 12s.43 3.32 1.18 4.79l3.69-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.21l3.69 2.84c.86-2.59 3.28-4.51 6.13-4.51z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/signin"
                  className="text-foreground hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

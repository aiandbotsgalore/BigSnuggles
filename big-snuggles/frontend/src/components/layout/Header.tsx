import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Settings, Mic, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <Mic className="h-6 w-6" />
            <span className="text-xl font-bold">Big Snuggles</span>
          </Link>
          {user && (
            <nav className="flex items-center space-x-4 text-sm font-medium">
              <Link to="/chat" className="transition-colors hover:text-foreground/80">
                Chat
              </Link>
              <Link to="/stories" className="transition-colors hover:text-foreground/80 flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                Stories
              </Link>
              <Link to="/preferences" className="transition-colors hover:text-foreground/80">
                Preferences
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="icon" onClick={() => navigate('/preferences')} title="Preferences">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

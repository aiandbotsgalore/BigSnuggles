import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mic, Zap, Brain, Users } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center py-20 px-4 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900">
        <div className="container max-w-5xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
            <Mic className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Big Snuggles
          </h1>
          <p className="mb-8 text-xl text-muted-foreground sm:text-2xl">
            Your Voice-First AI Companion
          </p>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            Experience real-time conversations with an AI that remembers, adapts, and evolves with you.
            Meet Big Snuggles, your gangster teddy bear companion.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Voice-First Interface</h3>
              <p className="text-sm text-muted-foreground">
                Natural conversations powered by Google Gemini Live API
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Persistent Memory</h3>
              <p className="text-sm text-muted-foreground">
                Remembers your conversations and builds relationships
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Adaptive Personality</h3>
              <p className="text-sm text-muted-foreground">
                Multiple personality modes for different moods
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">3D Avatar</h3>
              <p className="text-sm text-muted-foreground">
                Immersive 3D gangster teddy bear character (Coming Soon)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-20 px-4">
        <div className="container max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Meet Big Snuggles?</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join now and start your first conversation with the most unique AI companion
          </p>
          <Button size="lg" onClick={() => navigate('/signup')}>
            Create Your Account
          </Button>
        </div>
      </section>
    </div>
  );
}

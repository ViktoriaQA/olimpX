import { Terminal } from "lucide-react";

interface LoadingProps {
  fullScreen?: boolean;
}

export function Loading({ fullScreen = true }: LoadingProps) {
  return (
    <div className={`${fullScreen ? 'fixed inset-0' : 'flex items-center justify-center min-h-screen'} flex items-center justify-center bg-background matrix-bg z-50`}>
      <div className="flex items-center gap-3">
        <Terminal className="w-8 h-8 text-primary animate-pulse-glow" />
        <div className="animate-pulse-glow text-primary font-mono text-lg">Loading...</div>
      </div>
    </div>
  );
}

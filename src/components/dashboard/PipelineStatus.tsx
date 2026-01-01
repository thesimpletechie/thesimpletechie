import React from 'react';
import { Circle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Pipeline {
  id: string;
  name: string;
  branch: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  duration?: string;
}

const pipelines: Pipeline[] = [
  { id: '1', name: 'Build & Test', branch: 'main', status: 'success', duration: '2m 34s' },
  { id: '2', name: 'Deploy Staging', branch: 'develop', status: 'running', duration: '1m 12s' },
  { id: '3', name: 'Security Scan', branch: 'main', status: 'success', duration: '45s' },
  { id: '4', name: 'Deploy Production', branch: 'main', status: 'pending' },
];

const statusConfig = {
  running: { icon: Loader2, className: 'text-foreground animate-spin' },
  success: { icon: CheckCircle2, className: 'text-muted-foreground' },
  failed: { icon: XCircle, className: 'text-foreground' },
  pending: { icon: Circle, className: 'text-muted-foreground/50' },
};

export const PipelineStatus: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Pipeline Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {pipelines.map((pipeline, index) => {
          const config = statusConfig[pipeline.status];
          const Icon = config.icon;
          
          return (
            <div
              key={pipeline.id}
              className={cn(
                'flex items-center justify-between py-3',
                index !== pipelines.length - 1 && 'border-b border-border-subtle/20'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-4 h-4', config.className)} />
                <div>
                  <p className="text-sm font-medium text-foreground">{pipeline.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{pipeline.branch}</p>
                </div>
              </div>
              {pipeline.duration && (
                <span className="text-xs text-muted-foreground font-mono">
                  {pipeline.duration}
                </span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Code2, Bug, FileText, GitBranch, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';

const iconMap = {
  code: Code2,
  debug: Bug,
  docs: FileText,
  devops: GitBranch,
  team: Users,
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const ActivityFeed: React.FC = () => {
  const { activities } = useDashboard();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type];
          return (
            <div
              key={activity.id}
              className={cn(
                'flex items-start gap-3 py-3 animate-fade-in',
                index !== activities.length - 1 && 'border-b border-border-subtle/20'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-1.5 rounded-md bg-surface mt-0.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTimeAgo(activity.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

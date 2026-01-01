import React from 'react';
import { Code2, Bug, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { PipelineStatus } from '@/components/dashboard/PipelineStatus';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Dashboard: React.FC = () => {
  const { metrics, refreshMetrics } = useDashboard();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Refresh bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Last updated: <span className="font-mono">{formatTime(metrics.lastUpdated)}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Code Suggestions"
            value={metrics.codeGenerations}
            icon={Code2}
          />
          <MetricCard
            title="Issues Detected"
            value={metrics.issuesDetected}
            icon={Bug}
          />
          <MetricCard
            title="Doc Coverage"
            value={metrics.documentationCoverage}
            suffix="%"
            icon={FileText}
          />
          <MetricCard
            title="Pipeline Success"
            value={metrics.pipelineSuccessRate}
            suffix="%"
            icon={CheckCircle2}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>

          {/* Pipeline Status */}
          <div>
            <PipelineStatus />
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

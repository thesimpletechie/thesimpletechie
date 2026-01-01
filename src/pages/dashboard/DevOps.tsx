import React, { useState, useEffect } from 'react';
import {
  GitBranch, Clock, CheckCircle2, XCircle, Loader2, RefreshCw, Play,
  Activity, Cpu, Database, Server, Zap, AlertTriangle, Terminal,
  TrendingUp, ArrowUpRight, ArrowDownRight, Search, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/contexts/DashboardContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Pipeline {
  id: string;
  name: string;
  branch: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  duration: string;
  commit: string;
  author: string;
  timestamp: Date;
}

interface Deployment {
  id: string;
  environment: string;
  version: string;
  status: 'live' | 'deploying' | 'failed';
  timestamp: Date;
}

const initialPipelines: Pipeline[] = [
  { id: '1', name: 'Build & Test', branch: 'main', status: 'success', duration: '2m 34s', commit: 'a1b2c3d', author: 'alex', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: '2', name: 'Lint & Format', branch: 'main', status: 'success', duration: '45s', commit: 'a1b2c3d', author: 'alex', timestamp: new Date(Date.now() - 1000 * 60 * 6) },
  { id: '3', name: 'Security Scan', branch: 'develop', status: 'running', duration: '1m 12s', commit: 'e4f5g6h', author: 'sarah', timestamp: new Date(Date.now() - 1000 * 60 * 2) },
  { id: '4', name: 'Deploy Staging', branch: 'develop', status: 'pending', duration: '-', commit: 'e4f5g6h', author: 'sarah', timestamp: new Date() },
  { id: '5', name: 'E2E Tests', branch: 'feature/auth', status: 'failed', duration: '5m 18s', commit: 'i7j8k9l', author: 'mike', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
];

const initialDeployments: Deployment[] = [
  { id: '1', environment: 'Production', version: 'v2.4.1', status: 'live', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { id: '2', environment: 'Staging', version: 'v2.5.0-beta', status: 'deploying', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: '3', environment: 'Development', version: 'v2.5.0-dev', status: 'live', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
];

const buildHistoryData = [
  { time: '10:00', duration: 180, status: 'success' },
  { time: '11:00', duration: 210, status: 'success' },
  { time: '12:00', duration: 150, status: 'success' },
  { time: '13:00', duration: 240, status: 'failed' },
  { time: '14:00', duration: 190, status: 'success' },
  { time: '15:00', duration: 200, status: 'success' },
  { time: '16:00', duration: 170, status: 'success' },
];

const healthMetrics = [
  { label: 'CPU Usage', value: 42, color: 'bg-blue-500' },
  { label: 'Memory', value: 68, color: 'bg-purple-500' },
  { label: 'Disk IO', value: 12, color: 'bg-green-500' },
  { label: 'Network', value: 25, color: 'bg-yellow-500' },
];

const aiInsights = [
  { id: 1, type: 'optimization', text: 'Dependency caching could reduce build time by 24s', impact: 'High' },
  { id: 2, type: 'warning', text: 'Staging database latency is higher than usual (120ms)', impact: 'Medium' },
  { id: 3, type: 'info', text: 'Auto-scaling triggered: 2 new instances added to cluster-1', impact: 'Neutral' },
];

const metrics = [
  { label: 'Avg Build Time', value: '3m 24s', trend: '-12%', icon: Clock },
  { label: 'Success Rate', value: '94%', trend: '+2%', icon: CheckCircle2 },
  { label: 'Deploys Today', value: '12', trend: '+4', icon: Zap },
  { label: 'Network Load', value: '1.2 GB/s', trend: '+15%', icon: Activity },
];

const statusConfig = {
  running: { icon: Loader2, className: 'text-foreground animate-spin' },
  success: { icon: CheckCircle2, className: 'text-muted-foreground' },
  failed: { icon: XCircle, className: 'text-foreground' },
  pending: { icon: Clock, className: 'text-muted-foreground/50' },
  live: { icon: CheckCircle2, className: 'text-muted-foreground' },
  deploying: { icon: Loader2, className: 'text-foreground animate-spin' },
};

const serviceMesh = [
  { id: 'auth', status: 'optimal', latency: '12ms', load: 12 },
  { id: 'api-gateway', status: 'optimal', latency: '8ms', load: 45 },
  { id: 'user-db', status: 'warning', latency: '142ms', load: 88 },
  { id: 'cache-redis', status: 'optimal', latency: '2ms', load: 5 },
  { id: 'storage-s3', status: 'optimal', latency: '45ms', load: 22 },
  { id: 'cdn-edge', status: 'optimal', latency: '5ms', load: 15 },
  { id: 'analytics', status: 'optimal', latency: '24ms', load: 30 },
  { id: 'worker-1', status: 'optimal', latency: '10ms', load: 50 },
  { id: 'worker-2', status: 'optimal', latency: '12ms', load: 40 },
];

export const DevOps: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>(initialPipelines);
  const [deployments, setDeployments] = useState<Deployment[]>(initialDeployments);
  const { addActivity } = useDashboard();
  const { toast } = useToast();

  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Simulate pipeline updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPipelines(prev => {
        const updated = [...prev];
        const runningPipeline = updated.find(p => p.status === 'running');
        if (runningPipeline) {
          if (Math.random() > 0.7) {
            runningPipeline.status = Math.random() > 0.05 ? 'success' : 'failed';
            runningPipeline.duration = `${Math.floor(Math.random() * 3) + 1}m ${Math.floor(Math.random() * 59)}s`;
            const pendingPipeline = updated.find(p => p.status === 'pending');
            if (pendingPipeline) pendingPipeline.status = 'running';
          }
        }
        return updated;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Log simulation
  useEffect(() => {
    const running = pipelines.find(p => p.status === 'running');
    if (running && isConsoleOpen) {
      const logLines = [
        `[${new Date().toLocaleTimeString()}] >> DISPATCHER: Initializing build sequence...`,
        `[${new Date().toLocaleTimeString()}] >> RUNNER: Compiling kernel-modules...`,
        `[${new Date().toLocaleTimeString()}] >> SYSTEM: Optimization pass completed.`,
        `[${new Date().toLocaleTimeString()}] >> CLOUD: Synchronizing S3 objects...`,
        `[${new Date().toLocaleTimeString()}] >> AUTH: Validating security tokens...`,
        `[${new Date().toLocaleTimeString()}] >> DEPLOY: Purging edge-locations...`,
      ];
      const logInterval = setInterval(() => {
        setActiveLogs(prev => [...prev.slice(-12), logLines[Math.floor(Math.random() * logLines.length)]]);
      }, 1500);
      return () => clearInterval(logInterval);
    }
  }, [pipelines, isConsoleOpen]);

  const handleRefresh = () => {
    setPipelines(initialPipelines);
    setDeployments(initialDeployments);
    addActivity('devops', 'Recalibrated system insights');
    toast({ title: 'Systems Calibrated', description: 'Real-time telemetry updated.' });
  };

  const handleRunPipeline = (pipeline: Pipeline) => {
    setPipelines(prev =>
      prev.map(p => p.id === pipeline.id ? { ...p, status: 'running' as const, timestamp: new Date() } : p)
    );
    addActivity('devops', `Triggered: ${pipeline.name}`);
    toast({ title: 'Pipeline Triggered', description: 'Deployment sequence initiated.' });
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'NOW';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}M`;
    return `${Math.floor(seconds / 3600)}H`;
  };

  return (
    <DashboardLayout title="Operational Command">
      <div className="relative space-y-8 pb-12">
        {/* Background Immersive Elements */}
        <div className="absolute inset-0 -top-24 -left-24 pointer-events-none opacity-20">
          <div className="w-[1000px] h-[1000px] bg-gradient-radial from-blue-500/10 to-transparent blur-[120px]" />
        </div>

        {/* Top Intelligence Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => (
            <Card key={i} className="group relative overflow-hidden bg-black/40 backdrop-blur-xl border-white/5 hover:border-white/20 transition-all duration-500">
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                <metric.icon className="w-12 h-12 -mr-4 -mt-4 text-white" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white group-hover:scale-110 transition-transform">
                    <metric.icon className="w-4 h-4" />
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1",
                    metric.trend.startsWith('+') ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
                  )}>
                    {metric.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {metric.trend}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">{metric.label}</p>
                  <p className="text-3xl font-black text-white font-mono">{metric.value}</p>
                </div>
              </CardContent>
              <div className="absolute bottom-0 left-0 h-[2px] bg-white opacity-0 group-hover:opacity-100 transition-all duration-700 w-0 group-hover:w-full" />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Visual Monitor - Col Span 8 */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-black/40 backdrop-blur-xl border-white/5 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between px-6 py-6 border-b border-white/5">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-white">System Telemetry</CardTitle>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase mt-1 tracking-widest">Real-time build latency analysis</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Live Signal</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-6">
                <div className="h-[320px] w-full px-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={buildHistoryData}>
                      <defs>
                        <linearGradient id="glowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fff" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#666', fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#666', fontWeight: 700 }}
                        tickFormatter={(v) => `${Math.floor(v / 60)}M`}
                      />
                      <Tooltip
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        contentStyle={{
                          backgroundColor: '#000',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          fontSize: '10px',
                          padding: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="duration"
                        stroke="#fff"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#glowGradient)"
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sub-Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Service Mesh Monitor */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/5">
                <CardHeader className="px-5 py-5 border-b border-white/5">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Service Mesh Status</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {serviceMesh.map((node) => (
                      <div key={node.id} className="group relative p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-crosshair">
                        <div className="flex flex-col items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full shadow-[0_0_8px]",
                            node.status === 'optimal' ? "bg-green-500 shadow-green-500/50" : "bg-yellow-500 shadow-yellow-500/50 animate-pulse"
                          )} />
                          <span className="text-[8px] font-black uppercase text-neutral-500 tracking-tighter text-center line-clamp-1">{node.id}</span>
                          <span className="text-[10px] font-mono text-white opacity-40 group-hover:opacity-100 transition-opacity">{node.latency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Infrastructure Intelligence */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/5">
                <CardHeader className="px-5 py-5 border-b border-white/5">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-white">System Guard</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {healthMetrics.map((m, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">{m.label}</span>
                        <span className="text-xs font-black text-white font-mono">{m.value}%</span>
                      </div>
                      <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-1000", m.color.replace('bg-', 'bg-opacity-80 bg-'))}
                          style={{ width: `${m.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Optimization Ready</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-medium">Auto-scaling cluster-4 could reduce global latency by 12%.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Panel - Col Span 4 */}
          <div className="lg:col-span-4 space-y-8">
            {/* Control Terminal */}
            <Card className="bg-black border-white/10 overflow-hidden ring-1 ring-white/5">
              <div className="px-4 py-3 bg-white/5 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  <span className="ml-2 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Live Terminal</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-white/10 rounded-md"
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                >
                  <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                </Button>
              </div>
              <CardContent className="p-0">
                <div className={cn(
                  "bg-black transition-all duration-700 overflow-hidden",
                  isConsoleOpen ? "h-[360px]" : "h-0"
                )}>
                  <div className="p-5 font-mono text-[10px] leading-relaxed text-neutral-400 space-y-1">
                    {activeLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40 py-20">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="uppercase tracking-[0.3em] font-black">Awaiting System Stream</p>
                      </div>
                    ) : (
                      activeLogs.map((log, i) => (
                        <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis animate-in fade-in slide-in-from-left duration-300">
                          <span className="text-white font-black opacity-30 mr-3 underline decoration-white/20">0{i}</span>
                          <span className={cn(
                            log.includes('SYSTEM') ? "text-green-400" :
                              log.includes('DISPATCHER') ? "text-blue-400" : "text-neutral-400"
                          )}>{log}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Sequencer */}
            <Card className="bg-black/40 backdrop-blur-xl border-white/5">
              <CardHeader className="flex flex-row items-center justify-between px-5 py-5 border-b border-white/5">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Sequencer</CardTitle>
                <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-6 w-6 text-neutral-500 hover:text-white transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-white/5">
                {pipelines.slice(0, 4).map((p) => {
                  const Icon = statusConfig[p.status].icon;
                  return (
                    <div key={p.id} className="p-5 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500",
                            p.status === 'running' ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-neutral-500"
                          )}>
                            <Icon className={cn('w-4 h-4', p.status === 'running' && 'animate-spin')} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black text-white uppercase tracking-wider">{p.name}</p>
                            <div className="flex items-center gap-2 text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                              <span className="font-mono text-white/40">{p.commit}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              <span>{formatTimeAgo(p.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <span className="text-[10px] font-mono font-black text-white/40">{p.duration}</span>
                          {(p.status === 'failed' || p.status === 'pending') && (
                            <button
                              onClick={() => handleRunPipeline(p)}
                              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group/btn"
                            >
                              <Play className="w-3.5 h-3.5 fill-current group-hover/btn:scale-125 transition-transform" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Global Dispatch */}
            <Card className="bg-black/40 backdrop-blur-xl border-white/5 overflow-hidden">
              <CardHeader className="px-5 py-5 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Global Dispatch</CardTitle>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-tighter">
                  <Activity className="w-3 h-3" />
                  Optimal
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {deployments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_8px_white]" />
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">{d.environment}</p>
                        <p className="text-[9px] font-mono text-neutral-500 leading-none">{d.version}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-neutral-500 tracking-[0.2em] uppercase">{formatTimeAgo(d.timestamp)}</span>
                  </div>
                ))}
              </CardContent>
              <div className="px-5 py-4 bg-white/5 border-t border-white/5 flex justify-center">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-neutral-500 uppercase mb-1">USA</p>
                    <div className="w-1 h-3 bg-white/10 rounded-full overflow-hidden mx-auto"><div className="h-full w-full bg-blue-500" /></div>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-neutral-500 uppercase mb-1">EUR</p>
                    <div className="w-1 h-3 bg-white/10 rounded-full overflow-hidden mx-auto"><div className="h-full w-full bg-purple-500 shadow-[0_0_8px_purple]" /></div>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-neutral-500 uppercase mb-1">ASV</p>
                    <div className="w-1 h-3 bg-white/10 rounded-full overflow-hidden mx-auto"><div className="h-full w-full bg-green-500" /></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Info: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
  </svg>
);

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface DashboardMetrics {
  codeGenerations: number;
  issuesDetected: number;
  documentationCoverage: number;
  pipelineSuccessRate: number;
  lastUpdated: Date;
}

interface Activity {
  id: string;
  type: 'code' | 'debug' | 'docs' | 'devops' | 'team';
  message: string;
  timestamp: Date;
}

interface DashboardContextType {
  metrics: DashboardMetrics;
  activities: Activity[];
  incrementCodeGenerations: () => void;
  addActivity: (type: Activity['type'], message: string) => void;
  refreshMetrics: () => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const initialMetrics: DashboardMetrics = {
  codeGenerations: 127,
  issuesDetected: 12,
  documentationCoverage: 78,
  pipelineSuccessRate: 94,
  lastUpdated: new Date(),
};

const getInitialActivities = (): Activity[] => {
  const savedGlobal = localStorage.getItem('global_activities');
  if (savedGlobal) {
    try {
      const parsed = JSON.parse(savedGlobal);
      return parsed.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) }));
    } catch (e) {
      console.error('Failed to parse global_activities', e);
    }
  }

  // If no global history, aggregate strictly from real-world history logs on other pages
  const aggregated: Activity[] = [];

  try {
    const debugHist = JSON.parse(localStorage.getItem('debug_history') || '[]');
    debugHist.forEach((h: any) => {
      aggregated.push({
        id: `debug-${h.id}`,
        type: 'debug',
        message: `Analyzed code: found ${h.issues?.length || 0} issues`,
        timestamp: new Date(h.timestamp)
      });
    });

    const docsHist = JSON.parse(localStorage.getItem('docs_history') || '[]');
    docsHist.forEach((h: any) => {
      aggregated.push({
        id: `docs-${h.id}`,
        type: 'docs',
        message: `Generated documentation for ${h.fileName}`,
        timestamp: new Date(h.timestamp)
      });
    });

    const codeHist = JSON.parse(localStorage.getItem('code_generation_history') || '[]');
    codeHist.forEach((h: any) => {
      aggregated.push({
        id: `code-${h.id}`,
        type: 'code',
        message: `Generated project: ${h.prompt?.slice(0, 40)}...`,
        timestamp: new Date(h.timestamp)
      });
    });
  } catch (e) {
    console.warn('Failed to aggregate existing histories', e);
  }

  return aggregated
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 15);
};

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [activities, setActivities] = useState<Activity[]>(getInitialActivities);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Persist activities locally whenever they change
  useEffect(() => {
    localStorage.setItem('global_activities', JSON.stringify(activities));
  }, [activities]);

  const incrementCodeGenerations = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      codeGenerations: prev.codeGenerations + 1,
      lastUpdated: new Date(),
    }));
  }, []);

  const addActivity = useCallback((type: Activity['type'], message: string) => {
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date(),
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 14)]);
  }, []);

  const refreshMetrics = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      codeGenerations: prev.codeGenerations + Math.floor(Math.random() * 3),
      issuesDetected: Math.max(0, prev.issuesDetected + Math.floor(Math.random() * 3) - 1),
      documentationCoverage: Math.min(100, prev.documentationCoverage + Math.floor(Math.random() * 2)),
      pipelineSuccessRate: Math.min(100, Math.max(80, prev.pipelineSuccessRate + Math.floor(Math.random() * 4) - 2)),
      lastUpdated: new Date(),
    }));
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        metrics,
        activities,
        incrementCodeGenerations,
        addActivity,
        refreshMetrics,
        isMobileSidebarOpen,
        setMobileSidebarOpen,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

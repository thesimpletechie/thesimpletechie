import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle2, Wrench } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CodeEditor } from '@/components/code/CodeEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/contexts/DashboardContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils';
import { analyzeCode } from '@/lib/groq';
import { Upload, FolderTree, FileCode, Folder, ChevronRight, File, RefreshCw, X } from 'lucide-react';

interface ProjectFile {
  name: string;
  path: string;
  content: string;
  issues: Issue[];
  fixedCode?: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

const buildFileTree = (files: ProjectFile[]): FileNode[] => {
  const root: FileNode[] = [];
  files.forEach((file) => {
    const parts = file.path.split('/');
    let currentLevel = root;
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join('/');
      let node = currentLevel.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part,
          type: isLast ? 'file' : 'folder',
          path: path,
          children: isLast ? undefined : [],
        };
        currentLevel.push(node);
      }
      if (!isLast && node.children) {
        currentLevel = node.children;
      }
    });
  });
  return root;
};

const FileExplorerItem: React.FC<{
  node: FileNode;
  level: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  hasIssues?: boolean;
}> = ({ node, level, selectedPath, onSelect, hasIssues }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full py-1.5 px-2 hover:bg-surface rounded text-sm transition-colors text-muted-foreground"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <ChevronRight className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')} />
          <Folder className="w-4 h-4 text-primary/70" />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            {node.children.map((child, i) => (
              <FileExplorerItem
                key={i}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                hasIssues={hasIssues}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        'flex items-center gap-2 w-full py-1.5 px-2 hover:bg-surface rounded text-sm transition-colors mb-0.5 relative',
        selectedPath === node.path ? 'bg-surface text-foreground font-medium' : 'text-muted-foreground'
      )}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
    >
      <FileCode className={cn('w-4 h-4', selectedPath === node.path ? 'text-primary' : 'text-muted-foreground/50')} />
      <span className="truncate">{node.name}</span>
      {hasIssues && (
        <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
      )}
    </button>
  );
};

interface Issue {
  line: number;
  message: string;
  severity: 'error' | 'warning';
  fix?: string;
}

interface DebugHistoryItem {
  id: string;
  code: string;
  issues: Issue[];
  fixedCode: string;
  timestamp: string;
}

import { History, Trash2, Clock, Check, Columns, Layout, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const sampleCode = `function fetchUserData(userId) {
  const response = fetch('/api/users/' + userId);
  const data = response.json();
  
  if (data.error) {
    console.log(data.error);
    return null;
  }
  
  return {
    name: data.name,
    email: data.email,
    age: data.age
  };
}

const user = fetchUserData(123);
console.log(user.name);`;

const fixedCode = `async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      return null;
    }
    
    return {
      name: data.name,
      email: data.email,
      age: data.age
    };
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

const user = await fetchUserData('123');
if (user) {
  console.log(user.name);
}`;

const mockIssues: Issue[] = [
  { line: 2, message: 'fetch() returns a Promise - missing await', severity: 'error', fix: 'Add async/await' },
  { line: 3, message: 'response.json() returns a Promise - missing await', severity: 'error', fix: 'Add await keyword' },
  { line: 2, message: 'String concatenation for URLs - use template literals', severity: 'warning', fix: 'Use template literal' },
  { line: 6, message: 'Using console.log for errors - use console.error', severity: 'warning', fix: 'Replace with console.error' },
  { line: 16, message: 'Potential null reference on user.name', severity: 'error', fix: 'Add null check' },
  { line: 1, message: 'Missing TypeScript types', severity: 'warning', fix: 'Add type annotations' },
];

export const Debugging: React.FC = () => {
  const [code, setCode] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(false);

  const [history, setHistory] = useState<DebugHistoryItem[]>(() => {
    const saved = localStorage.getItem('debug_history');
    return saved ? JSON.parse(saved) : [];
  });
  const { addActivity } = useDashboard();
  const { toast } = useToast();

  const saveToHistory = (newItem: DebugHistoryItem) => {
    const updatedHistory = [newItem, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('debug_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('debug_history');
    toast({
      title: 'History cleared',
      description: 'Your debugging history has been removed.',
    });
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsProjectLoading(true);
    const newProjectFiles: ProjectFile[] = [];

    const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = (file as any).webkitRelativePath || file.name;

      // Filter out node_modules, .git, etc
      if (relativePath.includes('node_modules') || relativePath.includes('.git')) continue;

      const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(ext)) continue;

      try {
        const content = await file.text();
        newProjectFiles.push({
          name: file.name,
          path: relativePath,
          content,
          issues: []
        });
      } catch (err) {
        console.error("Error reading file:", relativePath, err);
      }
    }

    if (newProjectFiles.length > 0) {
      setProjectFiles(newProjectFiles);
      const firstFile = newProjectFiles[0];
      setSelectedFilePath(firstFile.path);
      setCode(firstFile.content);
      setIssues([]);
      setFixedVersion('');
      setViewMode('editor');

      addActivity('debug', `Uploaded project: ${newProjectFiles.length} files`);
      toast({
        title: 'Project uploaded',
        description: `Successfully loaded ${newProjectFiles.length} files.`,
      });
    } else {
      toast({
        title: 'No files found',
        description: 'Could not find any supported code files in the selected folder.',
        variant: 'destructive'
      });
    }
    setIsProjectLoading(false);
  };

  const handleFileSelect = (path: string) => {
    // If there's an active fix view, we'll lose it unless we apply it. 
    // For now, just switch.
    const file = projectFiles.find(f => f.path === path);
    if (file) {
      // Save current code to prev file if needed? No, let's keep it simple.
      setSelectedFilePath(path);
      setCode(file.content);
      setIssues(file.issues);
      setFixedVersion(file.fixedCode || '');
      setViewMode(file.fixedCode ? 'diff' : 'editor');
    }
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast({
        title: 'Enter some code',
        description: 'Please provide code to analyze.',
      });
      return;
    }

    setIsAnalyzing(true);
    setIssues([]);

    try {
      const result = await analyzeCode(code);
      const newIssues = result.issues || [];
      const newFixedCode = result.fixedCode || '';

      setIssues(newIssues);
      setFixedVersion(newFixedCode);
      setViewMode('diff');

      // Update file in projectFiles
      if (selectedFilePath) {
        setProjectFiles(prev => prev.map(f =>
          f.path === selectedFilePath
            ? { ...f, issues: newIssues, fixedCode: newFixedCode }
            : f
        ));
      }

      addActivity('debug', `Analyzed code: found ${newIssues.length} issues`);

      saveToHistory({
        id: Math.random().toString(36).substr(2, 9),
        code,
        issues: result.issues || [],
        fixedCode: result.fixedCode || '',
        timestamp: new Date().toISOString(),
      });

      toast({
        title: 'Analysis complete',
        description: `Found ${(result.issues || []).length} issues in your code.`,
      });
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'There was an error analyzing your code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [fixedVersion, setFixedVersion] = useState('');

  const handleApplyFix = async (issue: Issue) => {
    setIsFixing(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setIssues(prev => prev.filter(i => i !== issue));
    setIsFixing(false);

    toast({
      title: 'Fix applied',
      description: issue.fix,
    });
  };

  const handleApplyAllFixes = async () => {
    if (!fixedVersion) return;

    setIsFixing(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setCode(fixedVersion);
    setIssues([]);
    setFixedVersion('');

    // Update file in projectFiles
    if (selectedFilePath) {
      setProjectFiles(prev => prev.map(f =>
        f.path === selectedFilePath
          ? { ...f, content: fixedVersion, issues: [], fixedCode: '' }
          : f
      ));
    }

    addActivity('debug', 'Applied all suggested fixes');
    setIsFixing(false);

    toast({
      title: 'All fixes applied',
      description: 'Your code has been updated with all suggestions.',
    });
    setViewMode('editor');
  };

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return (
    <DashboardLayout title="Debugging Assistant">
      <div className={cn(
        "grid gap-6 transition-all duration-300",
        isSidebarCollapsed
          ? "grid-cols-1"
          : projectFiles.length > 0
            ? "grid-cols-1 lg:grid-cols-12" // Use 12 col grid for better control
            : "grid-cols-1 lg:grid-cols-3"
      )}>
        {/* Project Explorer - Only shown if repo is uploaded */}
        {projectFiles.length > 0 && !isSidebarCollapsed && (
          <div className="lg:col-span-3 space-y-4 animate-in slide-in-from-left-4 duration-300">
            <Card className="h-full">
              <CardHeader className="py-4 border-b border-border-subtle/10 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Project
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setProjectFiles([]);
                    setSelectedFilePath(null);
                    setCode('');
                    setIssues([]);
                    setFixedVersion('');
                  }}
                  title="Close Project"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-2 overflow-y-auto max-h-[600px]">
                <div className="space-y-0.5">
                  {buildFileTree(projectFiles).map((node, i) => (
                    <FileExplorerItem
                      key={i}
                      node={node}
                      level={0}
                      selectedPath={selectedFilePath}
                      onSelect={handleFileSelect}
                      hasIssues={projectFiles.find(f => f.path === node.path)?.issues.length! > 0}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Code Editor Area */}
        <div className={cn(
          "space-y-4 transition-all duration-300",
          !isSidebarCollapsed && (projectFiles.length > 0 ? "lg:col-span-6" : "lg:col-span-2"),
          isSidebarCollapsed && "lg:col-span-1"
        )}>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-base font-medium">
                    {selectedFilePath ? (
                      <span className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-primary" />
                        {selectedFilePath}
                      </span>
                    ) : 'Code Input'}
                  </CardTitle>
                  {fixedVersion && (
                    <div className="flex items-center bg-surface border border-border-subtle/20 rounded-lg p-1">
                      <Button
                        variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('editor')}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <Layout className="w-3.5 h-3.5" />
                        Editor
                      </Button>
                      <Button
                        variant={viewMode === 'diff' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('diff')}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <Columns className="w-3.5 h-3.5" />
                        Compare
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="relative w-full md:w-auto">
                    <input
                      type="file"
                      id="folder-upload"
                      className="hidden"
                      onChange={handleFolderUpload}
                      webkitdirectory=""
                      directory=""
                      multiple
                      {...({ webkitdirectory: "", directory: "" } as any)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full md:w-auto gap-2"
                      onClick={() => document.getElementById('folder-upload')?.click()}
                      disabled={isProjectLoading}
                    >
                      <Upload className="w-4 h-4" />
                      Upload Folder
                    </Button>
                  </div>

                  <Button onClick={handleAnalyze} disabled={isAnalyzing || !code.trim()} className="w-full md:w-auto gap-2">
                    {isAnalyzing ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Analyze Code
                  </Button>
                  {isSidebarCollapsed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSidebarCollapsed(false)}
                      className="hidden lg:flex gap-2"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                      Show Issues
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'diff' && fixedVersion ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
                  <div className="flex flex-col gap-2 h-full">
                    <div className="text-xs font-medium text-muted-foreground px-2 flex items-center justify-between">
                      <span>Original Code</span>
                    </div>
                    <div className="flex-1 overflow-hidden border border-border-subtle/20 rounded-lg">
                      <CodeEditor
                        code={code}
                        language="typescript"
                        readOnly
                        minHeight="100%"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 h-full animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="text-xs font-medium text-primary px-2 flex items-center justify-between">
                      <span>Proposed Fixes</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">Formatted</span>
                    </div>
                    <div className="flex-1 overflow-hidden border border-primary/20 rounded-lg bg-primary/[0.02]">
                      <CodeEditor
                        code={fixedVersion}
                        language="typescript"
                        readOnly
                        minHeight="100%"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <CodeEditor
                  code={code}
                  onChange={setCode}
                  language="typescript"
                  minHeight="500px"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Issues Panel */}
        {!isSidebarCollapsed && (
          <div className={cn(
            "space-y-4 animate-in fade-in slide-in-from-right-4 duration-300",
            projectFiles.length > 0 ? "lg:col-span-3" : "lg:col-span-1"
          )}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-medium">Issues</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="hidden lg:flex h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <PanelLeftClose className="w-3.5 h-3.5" />
                      Hide
                    </Button>
                  </div>
                  {issues.length > 0 && (
                    <div className="flex gap-3 text-xs font-mono">
                      <span className="text-foreground">{errorCount} errors</span>
                      <span className="text-muted-foreground">{warningCount} warnings</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" text="Analyzing..." />
                  </div>
                ) : issues.length > 0 ? (
                  <div className="space-y-3">
                    {issues.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyAllFixes}
                        disabled={isFixing}
                        className="w-full gap-2 mb-4"
                      >
                        <Wrench className="w-4 h-4" />
                        Apply All Fixes
                      </Button>
                    )}

                    {issues.map((issue, index) => (
                      <div
                        key={index}
                        className={cn(
                          'p-3 rounded-lg border animate-fade-in',
                          issue.severity === 'error'
                            ? 'border-border-subtle/40 bg-surface/50'
                            : 'border-border-subtle/20 bg-surface/30'
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className={cn(
                            'w-4 h-4 mt-0.5 flex-shrink-0',
                            issue.severity === 'error' ? 'text-foreground' : 'text-muted-foreground'
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">
                                Line {issue.line}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{issue.message}</p>
                            {issue.fix && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApplyFix(issue)}
                                disabled={isFixing}
                                className="mt-2 h-7 text-xs gap-1 px-2"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {issue.fix}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Search className="w-8 h-8 mb-3 opacity-50" />
                    <p className="text-sm">Click "Analyze Code" to find issues</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History Section */}
            <Card>
              <CardHeader className="pb-4 border-b border-border-subtle/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg font-medium">Debug History</CardTitle>
                  </div>
                  {history.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="text-muted-foreground hover:text-foreground gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {history.length > 0 ? (
                  <div className="divide-y divide-border-subtle/10">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 hover:bg-surface/30 transition-colors group cursor-pointer"
                        onClick={() => {
                          setCode(item.code);
                          setIssues(item.issues);
                          setFixedVersion(item.fixedCode);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {item.issues.length} issues
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {item.code.split('\n')[0].slice(0, 60)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <History className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm">No debugging history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

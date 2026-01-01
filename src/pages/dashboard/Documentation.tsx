import React, { useState } from 'react';
import { FileText, FolderTree, Download, RefreshCw, ChevronRight, File, Folder, Upload, X, History, Trash2, Clock, FileCode } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/contexts/DashboardContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils';
import { generateDocs, generateProjectReport } from '@/lib/groq';

interface ProjectFile {
  name: string;
  path: string;
  content: string;
  docs?: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

interface DocHistoryItem {
  id: string;
  fileName: string;
  content: string;
  timestamp: string;
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

const FileTreeItem: React.FC<{
  node: FileNode;
  level: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  hasDocs?: boolean;
}> = ({ node, level, selectedPath, onSelect, hasDocs }) => {
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
              <FileTreeItem
                key={i}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                hasDocs={hasDocs}
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
      {hasDocs && (
        <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      )}
    </button>
  );
};

export const Documentation: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [documentation, setDocumentation] = useState('');
  const [projectReport, setProjectReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [isProjectLoading, setIsProjectLoading] = useState(false);

  const [history, setHistory] = useState<DocHistoryItem[]>(() => {
    const saved = localStorage.getItem('docs_history');
    return saved ? JSON.parse(saved) : [];
  });

  const { addActivity } = useDashboard();
  const { toast } = useToast();

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsProjectLoading(true);
    const newProjectFiles: ProjectFile[] = [];
    const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = (file as any).webkitRelativePath || file.name;

      if (relativePath.includes('node_modules') || relativePath.includes('.git')) continue;

      const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(ext)) continue;

      try {
        const content = await file.text();
        newProjectFiles.push({
          name: file.name,
          path: relativePath,
          content,
        });
      } catch (err) {
        console.error("Error reading file:", relativePath, err);
      }
    }

    if (newProjectFiles.length > 0) {
      setProjectFiles(newProjectFiles);
      const firstFile = newProjectFiles[0];
      setSelectedFilePath(firstFile.path);
      setDocumentation(firstFile.docs || '');
      addActivity('docs', `Uploaded project for docs: ${newProjectFiles.length} files`);
      toast({
        title: 'Project uploaded',
        description: `Successfully loaded ${newProjectFiles.length} files.`,
      });
    }
    setIsProjectLoading(false);
  };

  const handleFileSelect = (path: string) => {
    const file = projectFiles.find(f => f.path === path);
    if (file) {
      setSelectedFilePath(path);
      setDocumentation(file.docs || '');
    }
  };

  const saveToHistory = (item: DocHistoryItem) => {
    const newHistory = [item, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('docs_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('docs_history');
  };

  const handleGenerate = async () => {
    const currentFile = projectFiles.find(f => f.path === selectedFilePath);
    const contentToDoc = currentFile?.content || '';

    if (!contentToDoc && !selectedFilePath) {
      toast({
        title: 'No file selected',
        description: 'Please upload a project and select a file to generate documentation.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const fileName = selectedFilePath ? selectedFilePath.split('/').pop()! : 'Project';
      const docs = await generateDocs(fileName, contentToDoc);

      setDocumentation(docs);

      // Update file in projectFiles
      if (selectedFilePath) {
        setProjectFiles(prev => prev.map(f =>
          f.path === selectedFilePath ? { ...f, docs } : f
        ));
      }

      saveToHistory({
        id: Math.random().toString(36).substr(2, 9),
        fileName: fileName,
        content: docs,
        timestamp: new Date().toISOString(),
      });

      addActivity('docs', `Generated documentation for ${fileName}`);

      toast({
        title: 'Documentation generated',
        description: `Docs ready for ${fileName}.`,
      });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Error generating docs.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    if (projectFiles.length === 0) return;

    setIsGeneratingAll(true);
    setGenProgress({ current: 0, total: projectFiles.length });

    let processedCount = 0;
    const updatedFiles = [...projectFiles];

    try {
      // Process in small batches to avoid rate limits and keep UI responsive
      for (let i = 0; i < updatedFiles.length; i++) {
        const file = updatedFiles[i];
        if (file.docs) {
          processedCount++;
          setGenProgress({ current: processedCount, total: updatedFiles.length });
          continue; // Skip if already documented
        }

        try {
          const docs = await generateDocs(file.name, file.content);
          updatedFiles[i] = { ...file, docs };
          setProjectFiles([...updatedFiles]); // Update state partially to show progress
        } catch (err) {
          console.error(`Failed to generate docs for ${file.path}`, err);
        }

        processedCount++;
        setGenProgress({ current: processedCount, total: updatedFiles.length });

        // Brief pause between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setProjectFiles(updatedFiles);
      addActivity('docs', `Bulk generated documentation for ${projectFiles.length} files`);
      toast({
        title: 'Batch generation complete',
        description: `Successfully documented ${projectFiles.length} files.`,
      });
    } catch (error) {
      toast({
        title: 'Bulk Generation paused',
        description: 'An error occurred during the process.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleGenerateProjectReport = async () => {
    if (projectFiles.length === 0) return;

    setIsGeneratingReport(true);
    setDocumentation(''); // Clear single file view
    setProjectReport('');

    try {
      // Filter out bulky/irrelevant files for architecture overview
      const relevantFiles = projectFiles.filter(f => {
        const name = f.name.toLowerCase();
        return !name.includes('package-lock') &&
          !name.includes('yarn.lock') &&
          !name.includes('.svg') &&
          !name.includes('.png') &&
          !name.includes('.jpg');
      });

      // Create a significantly more concise summary to fit within token limits (approx 12k tokens)
      const projectSummary = relevantFiles.map(f => {
        // Use a smaller snippet (300 chars) to stay within limits for multiple files
        const snippet = f.content.length > 300
          ? f.content.slice(0, 300) + '...'
          : f.content;
        return `File: ${f.path}\nContent Snippet:\n${snippet}`;
      }).join('\n\n---\n\n');

      const report = await generateProjectReport(projectSummary);
      setProjectReport(report);

      addActivity('docs', `Generated full project technical report: ${projectFiles.length} files`);
      toast({
        title: 'Project Report Ready',
        description: 'Complete project documentation has been generated.',
      });
    } catch (error) {
      toast({
        title: 'Report generation failed',
        description: error instanceof Error ? error.message : 'Error generating project report.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleExport = (format: 'markdown' | 'pdf') => {
    const content = projectReport || documentation;
    if (!content) return;

    toast({
      title: `Exporting as ${format.toUpperCase()}`,
      description: 'Your download will start shortly.',
    });

    if (format === 'markdown') {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = projectReport ? 'project_report.md' : 'documentation.md';
      a.click();
    }
  };

  return (
    <DashboardLayout title="Documentation">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Repository/File Selection */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Repository</CardTitle>
              </div>
              {projectFiles.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setProjectFiles([]);
                    setSelectedFilePath(null);
                    setDocumentation('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-2">
              {projectFiles.length > 0 ? (
                <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-1">
                  {buildFileTree(projectFiles).map((node, i) => (
                    <FileTreeItem
                      key={i}
                      node={node}
                      level={0}
                      selectedPath={selectedFilePath}
                      onSelect={handleFileSelect}
                      hasDocs={projectFiles.find(f => f.path === node.path)?.docs !== undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <div className="bg-surface/50 p-3 rounded-full mb-3">
                    <Upload className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload a folder to generate documentation for your project
                  </p>
                  <input
                    type="file"
                    id="doc-folder-upload"
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
                    className="w-full gap-2"
                    onClick={() => document.getElementById('doc-folder-upload')?.click()}
                    disabled={isProjectLoading}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Folder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium font-mono">History</CardTitle>
              </div>
              {history.length > 0 && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearHistory}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {history.length > 0 ? (
                <div className="divide-y divide-border-subtle/10">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setDocumentation(item.content)}
                      className="w-full text-left p-3 hover:bg-surface/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{item.fileName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No history yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Documentation Preview */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Documentation Preview</CardTitle>
              </div>
              {projectFiles.length > 0 && !documentation && !projectReport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateProjectReport}
                  disabled={isGeneratingReport || isGeneratingAll}
                  className="gap-2 text-primary border-primary/20 hover:bg-primary/10"
                >
                  {isGeneratingReport ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Generate Project Report
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || isGeneratingAll || isGeneratingReport}
                className="gap-2"
              >
                {isGenerating ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {documentation ? 'Regenerate Docs' : 'Generate Docs'}
              </Button>
              {(documentation || projectReport) && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('markdown')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Markdown
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('pdf')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isGenerating || isGeneratingReport ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" text={isGeneratingReport ? "Analyzing repository and generating technical report..." : "Generating documentation..."} />
              </div>
            ) : (documentation || projectReport) ? (
              <div className="prose prose-invert max-w-none">
                <div className="bg-[#1a1a1a] rounded-lg p-8 font-mono text-sm whitespace-pre-wrap text-foreground shadow-xl border border-border-subtle/10">
                  {projectReport && (
                    <div className="mb-6 flex items-center justify-between pb-4 border-b border-border-subtle/20">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">Project Architecture Report</h3>
                          <p className="text-xs text-muted-foreground">{projectFiles.length} files analyzed</p>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                        UNIFIED REPORT
                      </div>
                    </div>
                  )}
                  {projectReport || documentation}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border-subtle/30 rounded-lg">
                <FileText className="w-8 h-8 mb-3 opacity-50" />
                <p className="text-sm">Select a file to document, or generate a full project report</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout >
  );
};

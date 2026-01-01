import React, { useState } from 'react';
import { Wand2, Copy, RefreshCw, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { CodeEditor } from '@/components/code/CodeEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/contexts/DashboardContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateCode, type GeneratedFile } from '@/lib/groq';
import { FileCode, Files, ChevronRight, Folder, File, FolderTree, Download } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

const buildFileTree = (files: GeneratedFile[]): FileNode[] => {
  const root: FileNode[] = [];

  files.forEach((file) => {
    const parts = file.name.split('/');
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
}> = ({ node, level, selectedPath, onSelect }) => {
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
        'flex items-center gap-2 w-full py-1.5 px-2 hover:bg-surface rounded text-sm transition-colors mb-0.5',
        selectedPath === node.path ? 'bg-surface text-foreground font-medium' : 'text-muted-foreground'
      )}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
    >
      <FileCode className={cn('w-4 h-4', selectedPath === node.path ? 'text-primary' : 'text-muted-foreground/50')} />
      <span className="truncate">{node.name}</span>
    </button>
  );
};

const languages = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'sql', label: 'SQL' },
];

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings2, History, Trash2, Clock } from 'lucide-react';

interface HistoryItem {
  id: string;
  prompt: string;
  language: string;
  files: GeneratedFile[];
  timestamp: string;
}

const codeExamples: Record<string, string> = {
  typescript: `// Generated TypeScript code
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
}

export { fetchUsers, type User };`,
  javascript: `// Generated JavaScript code
async function fetchUsers() {
  const response = await fetch('/api/users');
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
}

module.exports = { fetchUsers };`,
  python: `# Generated Python code
from typing import List
from dataclasses import dataclass
import aiohttp

@dataclass
class User:
    id: str
    name: str
    email: str
    created_at: str

async def fetch_users() -> List[User]:
    async with aiohttp.ClientSession() as session:
        async with session.get('/api/users') as response:
            data = await response.json()
            return [User(**user) for user in data]`,
  go: `// Generated Go code
package main

import (
    "encoding/json"
    "net/http"
)

type User struct {
    ID        string \`json:"id"\`
    Name      string \`json:"name"\`
    Email     string \`json:"email"\`
    CreatedAt string \`json:"created_at"\`
}

func FetchUsers() ([]User, error) {
    resp, err := http.Get("/api/users")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var users []User
    err = json.NewDecoder(resp.Body).Decode(&users)
    return users, err
}`,
  rust: `// Generated Rust code
use serde::{Deserialize, Serialize};
use reqwest::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub created_at: String,
}

pub async fn fetch_users() -> Result<Vec<User>, Error> {
    let response = reqwest::get("/api/users")
        .await?
        .json::<Vec<User>>()
        .await?;
    
    Ok(response)
}`,
};

export const CodeGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    includeComments: true,
    addErrorHandling: true,
    productionReady: false,
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('code_generation_history');
    return saved ? JSON.parse(saved) : [];
  });
  const { incrementCodeGenerations, addActivity } = useDashboard();
  const { toast } = useToast();

  const saveToHistory = (newItem: HistoryItem) => {
    const updatedHistory = [newItem, ...history].slice(0, 50); // Keep last 50 items
    setHistory(updatedHistory);
    localStorage.setItem('code_generation_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('code_generation_history');
    toast({
      title: 'History cleared',
      description: 'Your generation history has been removed.',
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Enter a prompt',
        description: 'Please describe what code you want to generate.',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const files = await generateCode(prompt, language, settings);
      setGeneratedFiles(files);
      setSelectedFilePath(files[0]?.name || null);
      incrementCodeGenerations();
      addActivity('code', `Generated project: ${prompt.slice(0, 50)}...`);

      saveToHistory({
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        language,
        files,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: 'Code generated',
        description: `Successfully generated ${language} code.`,
      });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'There was an error generating your code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const files = await generateCode(prompt, language, settings);
      setGeneratedFiles(files);
      setSelectedFilePath(files[0]?.name || null);
      incrementCodeGenerations();

      saveToHistory({
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        language,
        files,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: 'Code regenerated',
        description: 'New variation generated.',
      });
    } catch (error) {
      toast({
        title: 'Regeneration failed',
        description: error instanceof Error ? error.message : 'There was an error regenerating your code.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    const activeFile = generatedFiles.find(f => f.name === selectedFilePath);
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: 'Copied to clipboard',
      description: `${activeFile.name} content has been copied.`,
    });
  };

  const handleDownloadZIP = async () => {
    if (generatedFiles.length === 0) return;

    try {
      const zip = new JSZip();

      generatedFiles.forEach((file) => {
        zip.file(file.name, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const fileName = `project-${language}-${Date.now()}.zip`;
      saveAs(blob, fileName);

      toast({
        title: 'Project downloaded',
        description: `Your project has been saved as ${fileName}`,
      });
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast({
        title: 'Download failed',
        description: 'There was an error creating your ZIP file.',
        variant: 'destructive',
      });
    }
  };

  const fileTree = buildFileTree(generatedFiles);
  const activeFile = generatedFiles.find(f => f.name === selectedFilePath);

  return (
    <DashboardLayout title="Code Generation">
      <div className="space-y-6">
        {/* Input Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Generate Code with AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Describe the code you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full md:w-auto gap-2">
                {isGenerating ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Generate
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrompt('Create a function to fetch users from an API')}
              >
                Fetch users function
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrompt('Create a React hook for form validation')}
              >
                Form validation hook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrompt('Create a debounce utility function')}
              >
                Debounce function
              </Button>
            </div>

            {/* Generation Settings */}
            <div className="pt-4 border-t border-border-subtle/10">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Generation Settings</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="comments"
                    checked={settings.includeComments}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, includeComments: checked === true }))}
                  />
                  <Label htmlFor="comments" className="text-sm cursor-pointer">Include comments</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="errorHandling"
                    checked={settings.addErrorHandling}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, addErrorHandling: checked === true }))}
                  />
                  <Label htmlFor="errorHandling" className="text-sm cursor-pointer">Add error handling</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="productionReady"
                    checked={settings.productionReady}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, productionReady: checked === true }))}
                  />
                  <Label htmlFor="productionReady" className="text-sm cursor-pointer">Production ready</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader className="pb-4 border-b border-border-subtle/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Files className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg font-medium">Project Structure</CardTitle>
              </div>
              {generatedFiles.length > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadZIP}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download ZIP
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isGenerating ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" text="Building project..." />
              </div>
            ) : generatedFiles.length > 0 ? (
              <div className="flex flex-col lg:flex-row min-h-[500px] lg:min-h-[600px]">
                {/* File Explorer Sidebar */}
                <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border-subtle/10 bg-surface/10 p-4 overflow-y-auto max-h-[300px] lg:max-h-[600px]">
                  <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <FolderTree className="w-3.5 h-3.5" />
                    Explorer
                  </div>
                  <div className="space-y-0.5">
                    {fileTree.map((node, i) => (
                      <FileExplorerItem
                        key={i}
                        node={node}
                        level={0}
                        selectedPath={selectedFilePath}
                        onSelect={setSelectedFilePath}
                      />
                    ))}
                  </div>
                </div>

                {/* Code Area */}
                <div className="flex-1 p-0 flex flex-col min-w-0">
                  <div className="border-b border-border-subtle/10 bg-surface/5 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground truncate">
                      <File className="w-3.5 h-3.5" />
                      {selectedFilePath}
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      code={activeFile?.content || ''}
                      language={language}
                      readOnly
                      minHeight="100%"
                      className="border-0 rounded-none h-full"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Files className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-medium">Run a generation to see project files</p>
                <p className="text-xs opacity-60 mt-1">Files will appear in a repository structure here</p>
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
                <CardTitle className="text-lg font-medium">Generation History</CardTitle>
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
                      setPrompt(item.prompt);
                      setLanguage(item.language);
                      setGeneratedFiles(item.files);
                      setSelectedFilePath(item.files[0]?.name || null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-border-subtle/20 text-muted-foreground uppercase">
                            {item.language}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Files className="w-3 h-3" />
                              {item.files.length} files
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {item.prompt}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm">No generation history yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

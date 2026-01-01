import React, { useState } from 'react';
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Users, Mail, Shield, UserPlus, MoreHorizontal, Activity, Zap, TrendingUp, Filter, Search, Star, MessageSquare, Clock, ArrowUpRight, Sparkles, Trash2, RefreshCw, Send, Plus, Settings, UserMinus, X } from 'lucide-react';
import { analyzeTeamActivity } from '@/lib/groq';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/contexts/DashboardContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  status: 'active' | 'away' | 'busy' | 'pending';
  avatar?: string;
  skills: string[];
  activeProjects: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
}

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[]; // member IDs
  type: 'project' | 'social' | 'emergency';
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: Date;
}

const initialMembers: TeamMember[] = [
  { id: '1', name: 'Alex Chen', email: 'alex@company.com', role: 'admin', status: 'active', skills: ['System Arch', 'Cloud'], activeProjects: 4 },
  { id: '2', name: 'Sarah Kim', email: 'sarah@company.com', role: 'developer', status: 'active', skills: ['React', 'Node.js'], activeProjects: 2 },
  { id: '3', name: 'Mike Johnson', email: 'mike@company.com', role: 'developer', status: 'busy', skills: ['Python', 'AI/ML'], activeProjects: 5 },
  { id: '4', name: 'Emily Davis', email: 'emily@company.com', role: 'viewer', status: 'pending', skills: ['UX Research'], activeProjects: 0 },
];

const initialActivity: ActivityItem[] = [
  { id: '1', user: 'Alex Chen', action: 'merged PR #234 into main', timestamp: new Date(Date.now() - 1000 * 60 * 10) },
  { id: '2', user: 'Sarah Kim', action: 'pushed 3 commits to feature/auth', timestamp: new Date(Date.now() - 1000 * 60 * 25) },
  { id: '3', user: 'Mike Johnson', action: 'created issue #156', timestamp: new Date(Date.now() - 1000 * 60 * 45) },
  { id: '4', user: 'Alex Chen', action: 'deployed v2.4.1 to production', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: '5', user: 'Sarah Kim', action: 'reviewed PR #233', timestamp: new Date(Date.now() - 1000 * 60 * 90) },
];

const roleColors = {
  admin: 'border-foreground/50 text-foreground',
  developer: 'border-muted-foreground/50 text-muted-foreground',
  viewer: 'border-muted-foreground/30 text-muted-foreground/70',
};

export const Team: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [activity] = useState<ActivityItem[]>(initialActivity);
  const [groups, setGroups] = useState<Group[]>([
    { id: 'g1', name: 'UI Overhaul', description: 'Redesigning the main dashboard', members: ['1', '2'], type: 'project' },
    { id: 'g2', name: 'Backend Scalability', description: 'Optimizing DB queries', members: ['1', '3'], type: 'project' }
  ]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [newMessage, setNewMessage] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'developer' | 'viewer'>('developer');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [teamPulse, setTeamPulse] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  const { addActivity } = useDashboard();
  const { toast } = useToast();

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Enter an email',
        description: 'Please enter an email address to invite.',
      });
      return;
    }

    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      skills: ['New Joiner'],
      activeProjects: 0
    };

    setMembers(prev => [...prev, newMember]);
    addActivity('team', `Invited ${inviteEmail} as ${inviteRole}`);
    setInviteEmail('');

    toast({
      title: 'Invitation sent',
      description: `Invited ${inviteEmail} to the team.`,
    });
  };

  const handleAnalyzePulse = async () => {
    setIsAnalyzing(true);
    try {
      const logs = activity.map(a => `${a.user}: ${a.action}`);
      const summary = await analyzeTeamActivity(logs);
      setTeamPulse(summary);
      toast({
        title: 'Team Pulse Updated',
        description: 'AI has analyzed recent collaborative activity.',
      });
    } catch (err) {
      toast({
        title: 'Analysis failed',
        description: 'Could not generate team pulse report.',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeChatId) return;

    const msg: Message = {
      id: crypto.randomUUID(),
      senderId: '1', // Current user (Alex Chen)
      content: newMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: newGroupName,
      description: 'New collaboration group',
      members: ['1', ...selectedGroupMembers],
      type: 'project'
    };

    setGroups(prev => [...prev, newGroup]);
    setIsGroupModalOpen(false);
    setNewGroupName('');
    setSelectedGroupMembers([]);

    addActivity('team', `Created group: ${newGroupName}`);
    toast({
      title: 'Group Created',
      description: `"${newGroupName}" has been established.`,
    });
  };

  const handleRemoveFromGroup = (groupId: string, memberId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, members: g.members.filter(id => id !== memberId) };
      }
      return g;
    }));

    toast({
      title: 'Member Removed',
      description: 'Access revoked for the selected group.',
    });
  };

  const handleAddToGroup = (groupId: string, memberId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId && !g.members.includes(memberId)) {
        return { ...g, members: [...g.members, memberId] };
      }
      return g;
    }));

    toast({
      title: 'Member Added',
      description: 'Team member added to the group successfully.',
    });
  };

  const handleRoleChange = (memberId: string, newRole: 'admin' | 'developer' | 'viewer') => {
    setMembers(prev =>
      prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)
    );

    toast({
      title: 'Role updated',
      description: 'Team member role has been changed.',
    });
  };

  const handleRemoveMember = (member: TeamMember) => {
    setMembers(prev => prev.filter(m => m.id !== member.id));
    addActivity('team', `Removed ${member.name} from the team`);

    toast({
      title: 'Member removed',
      description: `${member.name} has been removed from the team.`,
    });
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Team Collaboration">
      <div className="space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
          {[
            { label: 'Active Members', value: members.filter(m => m.status === 'active').length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Avg Velocity', value: '4.2', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Active Projects', value: members.reduce((acc, m) => acc + m.activeProjects, 0), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Pending Invites', value: members.filter(m => m.status === 'pending').length, icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((stat, i) => (
            <Card key={i} className="border-border-subtle/20 bg-surface/30 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-lg lg:text-2xl font-bold font-mono">{stat.value}</p>
                </div>
                <div className={cn('p-2 rounded-lg', stat.bg)}>
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border-subtle/20">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg font-bold">Team Directory</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 w-full md:w-64 bg-surface/50 border-border-subtle/20"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 h-9 border-border-subtle/20">
                      <Filter className="w-4 h-4" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="group p-4 rounded-xl border border-border-subtle/20 bg-surface/30 hover:bg-surface/50 hover:border-primary/30 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-surface flex items-center justify-center border border-primary/10 group-hover:scale-105 transition-transform">
                              <span className="text-base font-bold text-primary">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0A0A0A]",
                              member.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                member.status === 'busy' ? 'bg-rose-500' :
                                  member.status === 'away' ? 'bg-amber-500' : 'bg-muted-foreground'
                            )} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-surface/80 rounded-lg">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-surface backdrop-blur-xl border-border-subtle/20">
                            <DropdownMenuItem onClick={() => {
                              setActiveChatId(member.id);
                              setChatType('direct');
                            }} className="gap-2">
                              <MessageSquare className="w-4 h-4" /> Direct Chat
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin')} className="gap-2">
                              <Shield className="w-4 h-4" /> Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'developer')} className="gap-2">
                              <Clock className="w-4 h-4" /> Make Developer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'viewer')} className="gap-2">
                              <Users className="w-4 h-4" /> Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member)}
                              className="text-destructive focus:text-destructive gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Remove Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {member.skills.map((skill, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-raised/50 border border-border-subtle/10 text-muted-foreground">
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border-subtle/10 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{member.activeProjects} active projects</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 hover:text-primary p-0 px-2"
                          onClick={() => {
                            setActiveChatId(member.id);
                            setChatType('direct');
                          }}
                        >
                          Send Message <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add Member Placeholder */}
                  <button
                    onClick={() => document.getElementById('invite-email-input')?.focus()}
                    className="p-4 rounded-xl border border-dashed border-border-subtle/20 bg-surface/10 hover:bg-surface/20 flex flex-col items-center justify-center gap-2 group transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserPlus className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">Invite New Peer</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Invite Form */}
            <Card className="border-border-subtle/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Invite Team Contributors
                    </p>
                    <Input
                      id="invite-email-input"
                      placeholder="teammate@organization.ai"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-surface border-border-subtle/20 h-10"
                    />
                  </div>
                  <div className="w-full md:w-32 space-y-2">
                    <p className="text-xs text-muted-foreground">Assign Role</p>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                      <SelectTrigger className="h-10 bg-surface border-border-subtle/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border-subtle/20">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleInvite} className="h-10 px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <Sparkles className="w-4 h-4" />
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* AI Pulse */}
            <Card className="border-primary/20 bg-primary/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4">
                <Sparkles className="w-8 h-8 text-primary/10" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base font-bold">AI Team Pulse</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                    onClick={handleAnalyzePulse}
                    disabled={isAnalyzing}
                  >
                    <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-3">
                    <LoadingSpinner size="sm" />
                    <p className="text-[10px] text-muted-foreground font-mono">Synthesizing activity...</p>
                  </div>
                ) : teamPulse ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="text-xs text-foreground leading-relaxed font-mono whitespace-pre-wrap">
                      {teamPulse}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center bg-surface/20 rounded-xl border border-dashed border-primary/20">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary/20" />
                    <p className="text-[10px] text-muted-foreground px-4">Generate AI insights based on recent team activities.</p>
                    <Button
                      variant="link"
                      onClick={handleAnalyzePulse}
                      className="text-primary text-[10px] h-auto p-0 mt-2"
                    >
                      Analyze Pulse now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Groups */}
            <Card className="border-border-subtle/20">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <CardTitle className="text-base font-medium">Collaboration Groups</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                  onClick={() => setIsGroupModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {groups.map((group) => (
                  <div key={group.id} className="p-3 rounded-lg border border-border-subtle/10 bg-surface/30 group">
                    <div className="flex items-start justify-between">
                      <div className="cursor-pointer" onClick={() => { setActiveChatId(group.id); setChatType('group'); }}>
                        <p className="text-sm font-bold group-hover:text-primary transition-colors">{group.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{group.description}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-surface backdrop-blur-xl border-border-subtle/20">
                          <p className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase border-b border-border-subtle/10 mb-1">Add to Group</p>
                          {members.filter(m => !group.members.includes(m.id)).map(m => (
                            <DropdownMenuItem key={m.id} onClick={() => handleAddToGroup(group.id, m.id)} className="text-xs">
                              <Plus className="w-3 h-3 mr-2" /> {m.name}
                            </DropdownMenuItem>
                          ))}
                          <p className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase border-t border-border-subtle/10 my-1">Members</p>
                          {group.members.map(id => {
                            const m = members.find(mb => mb.id === id);
                            if (!m) return null;
                            return (
                              <DropdownMenuItem key={id} onClick={() => handleRemoveFromGroup(group.id, id)} className="text-xs text-destructive">
                                <UserMinus className="w-3 h-3 mr-2" /> Remove {m.name}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 3).map(id => {
                          const m = members.find(mb => mb.id === id);
                          return (
                            <div key={id} className="w-5 h-5 rounded-full bg-surface border border-[#0A0A0A] flex items-center justify-center text-[8px] font-bold text-primary">
                              {m?.name[0] || '?'}
                            </div>
                          );
                        })}
                        {group.members.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-surface-raised border border-[#0A0A0A] flex items-center justify-center text-[8px] text-muted-foreground">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] p-0 px-2 hover:bg-primary/10 text-primary"
                        onClick={() => { setActiveChatId(group.id); setChatType('group'); }}
                      >
                        Open Chat
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card className="border-border-subtle/20">
              <CardHeader className="pb-2 px-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Activity Log</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-0 relative">
                <div className="absolute top-0 left-6 bottom-0 w-[1px] bg-border-subtle/10" />
                <div className="space-y-0 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {activity.map((item, index) => (
                    <div
                      key={item.id}
                      className="group relative pl-12 pr-6 py-4 hover:bg-surface/30 transition-colors"
                    >
                      <div className="absolute left-[20px] top-[1.25rem] w-2 h-2 rounded-full bg-border-subtle/30 border-2 border-[#0A0A0A] group-hover:bg-primary/50 group-hover:scale-125 transition-all duration-300 z-10" />
                      <p className="text-xs text-foreground leading-relaxed">
                        <span className="font-bold group-hover:text-primary transition-colors">{item.user}</span>{' '}
                        <span className="text-muted-foreground">{item.action}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 font-mono flex items-center gap-1 opacity-70">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(item.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border-subtle/10 bg-surface/5">
                  <Button variant="ghost" size="sm" className="w-full text-[10px] h-8 text-muted-foreground hover:text-foreground">
                    View Full Audit Log
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Direct Messaging Interface (Sliding Panel via Sheet Portal) */}
      <Sheet open={!!activeChatId} onOpenChange={(open) => !open && setActiveChatId(null)}>
        <SheetContent className="w-full sm:max-w-[400px] p-0 bg-[#0A0A0A] border-l border-border-subtle/20 flex flex-col h-full ring-0 focus:ring-0">
          {/* Chat Header */}
          <SheetHeader className="p-4 border-b border-border-subtle/10 flex flex-row items-center justify-between bg-surface/10 backdrop-blur-xl space-y-0 text-left">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/10">
                <span className="text-sm font-bold text-primary">
                  {chatType === 'direct'
                    ? members.find(m => m.id === activeChatId)?.name.split(' ').map(n => n[0]).join('')
                    : groups.find(g => g.id === activeChatId)?.name[0]}
                </span>
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-foreground">
                  {chatType === 'direct'
                    ? members.find(m => m.id === activeChatId)?.name
                    : groups.find(g => g.id === activeChatId)?.name}
                </SheetTitle>
                <p className="text-[10px] text-muted-foreground">
                  {chatType === 'direct' ? 'Direct Message' : `${groups.find(g => g.id === activeChatId)?.members.length} members`}
                </p>
              </div>
            </div>
            <SheetPrimitive.Close className="h-8 w-8 rounded-lg hover:bg-surface/80 flex items-center justify-center">
              <X className="w-4 h-4" />
            </SheetPrimitive.Close>
          </SheetHeader>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="bg-primary/5 p-4 rounded-full mb-4">
                  <MessageSquare className="w-8 h-8 text-primary/30" />
                </div>
                <p className="text-sm font-medium text-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start the conversation by sending a message below.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex flex-col max-w-[80%]",
                  msg.senderId === '1' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                    msg.senderId === '1'
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-surface-raised border border-border-subtle/10 text-foreground rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 font-mono px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border-subtle/10 bg-surface/5 mt-auto">
            <div className="relative group">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="bg-surface border-border-subtle/10 pr-12 h-12 rounded-xl focus:ring-primary/20 transition-all"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="absolute right-1 top-1 h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-3">
              Press <span className="text-foreground border border-border-subtle/20 px-1 rounded bg-surface/50">Enter</span> to send
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Group Modal via Dialog Portal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="w-full max-w-md border-border-subtle/20 bg-[#0A0A0A] p-0 overflow-hidden ring-0 focus:ring-0">
          <DialogHeader className="p-6 pb-4 border-b border-border-subtle/10">
            <DialogTitle className="text-lg font-bold">Construct Collaboration Group</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Group Identity</label>
              <Input
                placeholder="e.g. Project 'Aegis' Core"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="bg-surface border-border-subtle/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Contributors</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                {members.filter(m => m.id !== '1').map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedGroupMembers(prev =>
                        prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                      )
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                      selectedGroupMembers.includes(m.id)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-surface/50 border-border-subtle/10 text-muted-foreground hover:bg-surface hover:text-foreground"
                    )}
                  >
                    <div className="w-6 h-6 rounded bg-surface border border-border-subtle/10 flex items-center justify-center text-[10px] font-bold">
                      {m.name[0]}
                    </div>
                    <span className="text-xs font-medium truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border-subtle/10 bg-surface/5 flex gap-3">
            <Button variant="ghost" onClick={() => setIsGroupModalOpen(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
              className="flex-1 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20"
            >
              Create Hub
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Square, Settings, GitBranch } from 'lucide-react';
import { api } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

interface CanvasToolbarProps {
  onZoneCreated?: (zone: any) => void;
  onWorktreeCreated?: (worktree: any) => void;
}

/**
 * CanvasToolbar Component
 *
 * Provides controls for the workflow canvas:
 * - Create zone button (with configuration dialog)
 * - Create worktree button (with branch/issue linking)
 * - Canvas settings
 */
export function CanvasToolbar({ onZoneCreated, onWorktreeCreated }: CanvasToolbarProps) {
  const { addZone, addWorktree } = useDashboardStore();

  // Zone creation state
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneDescription, setZoneDescription] = useState('');
  const [zoneTrigger, setZoneTrigger] = useState('onDrop');

  // Worktree creation state
  const [worktreeDialogOpen, setWorktreeDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [issueUrl, setIssueUrl] = useState('');
  const [taskId, setTaskId] = useState('');

  const handleCreateZone = async () => {
    try {
      const zone = await api.createZone({
        name: zoneName,
        description: zoneDescription,
        trigger: zoneTrigger,
        agents: [],
        promptTemplate: '',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
      });

      addZone(zone);
      onZoneCreated?.(zone);

      // Reset form
      setZoneName('');
      setZoneDescription('');
      setZoneTrigger('onDrop');
      setZoneDialogOpen(false);
    } catch (error) {
      console.error('[CanvasToolbar] Failed to create zone:', error);
    }
  };

  const handleCreateWorktree = async () => {
    try {
      const worktree = await api.createWorktree({
        branchName,
        issueUrl: issueUrl || undefined,
        taskId: taskId || undefined,
      });

      addWorktree(worktree);
      onWorktreeCreated?.(worktree);

      // Reset form
      setBranchName('');
      setIssueUrl('');
      setTaskId('');
      setWorktreeDialogOpen(false);
    } catch (error) {
      console.error('[CanvasToolbar] Failed to create worktree:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b border-gray-200">
      {/* Create Zone Button */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Square className="w-4 h-4 mr-2" />
            Create Zone
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Zone</DialogTitle>
            <DialogDescription>
              Create a workflow zone that can trigger actions when worktrees are assigned to it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Zone Name</Label>
              <Input
                id="zone-name"
                placeholder="e.g., Development, Testing, Review"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-description">Description (optional)</Label>
              <Input
                id="zone-description"
                placeholder="Brief description of this zone's purpose"
                value={zoneDescription}
                onChange={(e) => setZoneDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-trigger">Trigger Type</Label>
              <Select value={zoneTrigger} onValueChange={setZoneTrigger}>
                <SelectTrigger id="zone-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onDrop">On Drop (Automatic)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateZone} disabled={!zoneName}>
              Create Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Worktree Button */}
      <Dialog open={worktreeDialogOpen} onOpenChange={setWorktreeDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <GitBranch className="w-4 h-4 mr-2" />
            Create Worktree
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Worktree</DialogTitle>
            <DialogDescription>
              Create an isolated Git worktree with automatic port assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name *</Label>
              <Input
                id="branch-name"
                placeholder="e.g., feature-auth, fix-bug-123"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-url">GitHub Issue URL (optional)</Label>
              <Input
                id="issue-url"
                placeholder="https://github.com/owner/repo/issues/123"
                value={issueUrl}
                onChange={(e) => setIssueUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-id">Task ID (optional)</Label>
              <Input
                id="task-id"
                placeholder="e.g., TASK-123"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorktreeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorktree} disabled={!branchName}>
              Create Worktree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Canvas Settings */}
      <div className="ml-auto">
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

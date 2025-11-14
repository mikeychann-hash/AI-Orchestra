'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GitBranch, ExternalLink, MoreVertical, Trash2, Play, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

/**
 * WorktreeCard Component
 *
 * Displays a draggable card representing a Git worktree with:
 * - Branch name
 * - Port assignment
 * - Status indicator
 * - Linked GitHub issue/PR
 * - Agent status
 * - Context menu for actions
 */
export const WorktreeCard = memo(({ data, id }: NodeProps) => {
  const { removeWorktree } = useDashboardStore();

  const handleDelete = async () => {
    try {
      await api.deleteWorktree(id);
      removeWorktree(id);
    } catch (error) {
      console.error('[WorktreeCard] Failed to delete worktree:', error);
    }
  };

  const handleOpenInBrowser = () => {
    if (data.port) {
      window.open(`http://localhost:${data.port}`, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'idle':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-[280px] shadow-lg hover:shadow-xl transition-shadow cursor-move">
      {/* Connection handles for ReactFlow */}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status || 'idle')}`} />
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm truncate max-w-[160px]" title={data.branchName}>
              {data.branchName || 'Unnamed Branch'}
            </h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {data.port && (
                <DropdownMenuItem onClick={handleOpenInBrowser}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Browser
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Worktree
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Port Information */}
        {data.port && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Port:</span>
            <Badge variant="outline">{data.port}</Badge>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status:</span>
          <Badge variant={getStatusBadgeVariant(data.status || 'idle')}>
            {data.status || 'idle'}
          </Badge>
        </div>

        {/* GitHub Issue Link */}
        {data.issueUrl && (
          <div className="pt-2 border-t">
            <a
              href={data.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">
                {data.issueTitle || 'GitHub Issue'}
              </span>
            </a>
          </div>
        )}

        {/* Agent Status */}
        {data.agentStatus && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Agent:</span>
              <div className="flex items-center gap-1">
                {data.agentStatus === 'running' ? (
                  <>
                    <Play className="w-3 h-3 text-green-600 fill-green-600" />
                    <span className="text-green-600">Running</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600">Idle</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Task ID */}
        {data.taskId && (
          <div className="text-xs text-muted-foreground truncate" title={data.taskId}>
            Task: {data.taskId}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

WorktreeCard.displayName = 'WorktreeCard';

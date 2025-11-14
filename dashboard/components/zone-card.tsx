'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Zap, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

/**
 * ZoneCard Component
 *
 * Displays a zone boundary on the canvas with:
 * - Zone name and description
 * - Trigger type indicator
 * - Configured agents
 * - Edit/delete actions
 * - Visual boundary for drag-and-drop detection
 */
export const ZoneCard = memo(({ data, id }: NodeProps) => {
  const { removeZone } = useDashboardStore();

  const handleDelete = async () => {
    try {
      await api.deleteZone(id);
      removeZone(id);
    } catch (error) {
      console.error('[ZoneCard] Failed to delete zone:', error);
    }
  };

  const handleEdit = () => {
    // TODO: Open zone configuration dialog
    console.log('[ZoneCard] Edit zone:', id);
  };

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'onDrop':
        return 'text-blue-600 bg-blue-50';
      case 'manual':
        return 'text-purple-600 bg-purple-50';
      case 'scheduled':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div
      className="relative w-full h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50 backdrop-blur-sm hover:border-gray-400 transition-colors"
      style={{
        minWidth: '300px',
        minHeight: '200px',
      }}
    >
      {/* Zone Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-b border-gray-200 rounded-t-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{data.name || 'Unnamed Zone'}</h3>
              {data.trigger && (
                <Badge className={getTriggerColor(data.trigger)}>
                  <Zap className="w-3 h-3 mr-1" />
                  {data.trigger}
                </Badge>
              )}
            </div>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Zone
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Zone
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Agents */}
        {data.agents && data.agents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span>Agents:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.agents.map((agent: string) => (
                <Badge key={agent} variant="secondary" className="text-xs">
                  {agent}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Prompt Template Preview */}
        {data.promptTemplate && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Prompt:</span>{' '}
              {data.promptTemplate.length > 100
                ? `${data.promptTemplate.substring(0, 100)}...`
                : data.promptTemplate}
            </div>
          </div>
        )}

        {/* Actions */}
        {data.actions && data.actions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Actions:</span>{' '}
              {data.actions.map((action: any) => action.type).join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Drop Zone Area */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center text-gray-400 select-none">
          <p className="text-sm font-medium">Drop worktree here</p>
          {data.trigger === 'onDrop' && (
            <p className="text-xs mt-1">Triggers automatically on drop</p>
          )}
        </div>
      </div>
    </div>
  );
});

ZoneCard.displayName = 'ZoneCard';

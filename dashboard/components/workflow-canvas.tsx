'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDashboardStore } from '@/lib/store';
import { api } from '@/lib/api';
import { WorktreeCard } from './worktree-card';
import { ZoneCard } from './zone-card';
import { CanvasToolbar } from './canvas-toolbar';

/**
 * Node types for ReactFlow
 */
const nodeTypes: NodeTypes = {
  worktree: WorktreeCard,
  zone: ZoneCard,
};

/**
 * WorkflowCanvas Component
 *
 * Main visual canvas for workflow orchestration:
 * - ReactFlow-based interactive canvas
 * - Drag-and-drop worktrees and zones
 * - Real-time WebSocket updates
 * - Zone detection on drop
 * - Automatic state synchronization
 */
export function WorkflowCanvas() {
  const {
    worktrees,
    zones,
    setWorktrees,
    setZones,
    addWorktree,
    addZone,
    updateWorktree,
    updateZone,
    removeWorktree,
    removeZone,
    isConnected,
  } = useDashboardStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load initial canvas data from API
   */
  const loadCanvasData = useCallback(async () => {
    try {
      setLoading(true);

      // Load worktrees
      const worktreesData = await api.getWorktrees();
      setWorktrees(worktreesData);

      // Load zones
      const zonesData = await api.getZones();
      setZones(zonesData);

      // Convert to ReactFlow nodes
      const worktreeNodes: Node[] = worktreesData.map((wt: any) => ({
        id: wt.id,
        type: 'worktree',
        position: wt.position || { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
        data: wt,
        draggable: true,
      }));

      const zoneNodes: Node[] = zonesData.map((zone: any) => ({
        id: zone.id,
        type: 'zone',
        position: zone.position || { x: 50, y: 50 },
        data: zone,
        style: {
          width: zone.size?.width || 400,
          height: zone.size?.height || 300,
        },
        draggable: false, // Zones are fixed
        selectable: true,
      }));

      setNodes([...zoneNodes, ...worktreeNodes]);
    } catch (error) {
      console.error('[WorkflowCanvas] Failed to load canvas data:', error);
    } finally {
      setLoading(false);
    }
  }, [setWorktrees, setZones, setNodes]);

  /**
   * Initial data load
   */
  useEffect(() => {
    loadCanvasData();
  }, [loadCanvasData]);

  /**
   * Handle WebSocket updates for real-time synchronization
   */
  useEffect(() => {
    if (!isConnected) return;

    // TODO: Subscribe to WebSocket events
    // - worktree:created
    // - worktree:updated
    // - worktree:deleted
    // - zone:created
    // - zone:updated
    // - zone:deleted

    // Example implementation (requires backend WebSocket support):
    // const handleWorktreeCreated = (data: any) => {
    //   addWorktree(data.worktree);
    //   setNodes((nds) => [...nds, {
    //     id: data.worktree.id,
    //     type: 'worktree',
    //     position: { x: 100, y: 100 },
    //     data: data.worktree,
    //   }]);
    // };

    return () => {
      // Cleanup subscriptions
    };
  }, [isConnected, addWorktree, addZone, setNodes]);

  /**
   * Handle connections between nodes (optional for future use)
   */
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  /**
   * Detect if a node is inside a zone
   */
  const isNodeInsideZone = useCallback((node: Node, zone: Node): boolean => {
    if (!zone.style?.width || !zone.style?.height) return false;

    const nodeX = node.position.x;
    const nodeY = node.position.y;
    const zoneX = zone.position.x;
    const zoneY = zone.position.y;
    const zoneWidth = zone.style.width as number;
    const zoneHeight = zone.style.height as number;

    // Check if node center is inside zone
    const nodeCenterX = nodeX + 140; // WorktreeCard width is 280px, so center is 140px
    const nodeCenterY = nodeY + 100; // Approximate center

    return (
      nodeCenterX >= zoneX &&
      nodeCenterX <= zoneX + zoneWidth &&
      nodeCenterY >= zoneY &&
      nodeCenterY <= zoneY + zoneHeight
    );
  }, []);

  /**
   * Handle node drag stop
   * - Check if worktree was dropped on a zone
   * - Trigger zone assignment if applicable
   * - Save node position
   */
  const onNodeDragStop = useCallback(
    async (event: React.MouseEvent, node: Node) => {
      try {
        // Only handle worktree nodes
        if (node.type === 'worktree') {
          // Find if dropped on a zone
          const droppedOnZone = nodes.find(
            (n) => n.type === 'zone' && isNodeInsideZone(node, n)
          );

          if (droppedOnZone) {
            console.log(
              `[WorkflowCanvas] Worktree ${node.id} dropped on zone ${droppedOnZone.id}`
            );

            // Assign worktree to zone
            await api.assignWorktreeToZone(node.id, droppedOnZone.id, node.data);

            // Visual feedback (optional: highlight zone, show toast, etc.)
          }
        }

        // Save node position
        await api.updateNodePosition(node.id, node.position);
      } catch (error) {
        console.error('[WorkflowCanvas] Failed to handle node drag:', error);
      }
    },
    [nodes, isNodeInsideZone]
  );

  /**
   * Handle zone created from toolbar
   */
  const handleZoneCreated = useCallback(
    (zone: any) => {
      const newNode: Node = {
        id: zone.id,
        type: 'zone',
        position: zone.position,
        data: zone,
        style: {
          width: zone.size.width,
          height: zone.size.height,
        },
        draggable: false,
        selectable: true,
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  /**
   * Handle worktree created from toolbar
   */
  const handleWorktreeCreated = useCallback(
    (worktree: any) => {
      const newNode: Node = {
        id: worktree.id,
        type: 'worktree',
        position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
        data: worktree,
        draggable: true,
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <CanvasToolbar
        onZoneCreated={handleZoneCreated}
        onWorktreeCreated={handleWorktreeCreated}
      />

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'zone') return '#e5e7eb';
              return '#3b82f6';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      {/* Connection Status */}
      <div className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-md shadow-md border border-gray-200 text-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-gray-700">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}

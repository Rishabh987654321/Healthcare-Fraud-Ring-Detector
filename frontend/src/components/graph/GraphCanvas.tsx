import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { NetworkGraphData, NetworkNode } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Network } from 'lucide-react';

interface GraphCanvasProps {
  data: NetworkGraphData | null;
  loading: boolean;
  onSelectNode: (node: NetworkNode) => void;
  centerNodeId?: string;
  errorDetail?: string | null;
  onRetry?: () => void;
}

interface PositionedNode extends NetworkNode {
  x: number;
  y: number;
  hop: number;
  radius: number;
}

const COLOR_MAP: Record<string, string> = {
  provider: '#4F46E5',  // Indigo accent
  patient: '#2563EB',   // Blue
  address: '#059669',   // Emerald green
  phone: '#D97706',     // Amber
  procedure: '#9333EA', // Purple
  claim: '#6B7280',     // Slate gray
  unknown: '#9CA3AF',
};

export function GraphCanvas({
  data,
  loading,
  onSelectNode,
  centerNodeId,
  errorDetail = null,
  onRetry,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // ResizeObserver to track container bounds
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasFlaggedNode = useMemo(() => {
    return data?.nodes.some((n) => n.flagged) || false;
  }, [data]);

  // Compute Ego/Radial Static Layout
  const { positionedNodes, centerId } = useMemo(() => {
    if (!data || !data.nodes || data.nodes.length === 0) {
      return { positionedNodes: new Map<string, PositionedNode>(), centerId: '' };
    }

    const { width, height } = dimensions;
    const cx = width > 0 ? width / 2 : 300;
    const cy = height > 0 ? height / 2 : 300;

    let rootId = centerNodeId;
    if (!rootId || !data.nodes.some((n) => n.id === rootId)) {
      const firstProvOrPat = data.nodes.find((n) => n.type === 'provider' || n.type === 'patient');
      rootId = firstProvOrPat ? firstProvOrPat.id : data.nodes[0].id;
    }

    const adj = new Map<string, string[]>();
    data.nodes.forEach((n) => adj.set(n.id, []));

    data.edges.forEach((e) => {
      if (adj.has(e.source)) adj.get(e.source)!.push(e.target);
      if (adj.has(e.target)) adj.get(e.target)!.push(e.source);
    });

    const hopMap = new Map<string, number>();
    const visited = new Set<string>([rootId]);
    hopMap.set(rootId, 0);

    const queue: string[] = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currHop = hopMap.get(curr)!;

      const neighbors = adj.get(curr) || [];
      neighbors.forEach((nbr) => {
        if (!visited.has(nbr)) {
          visited.add(nbr);
          hopMap.set(nbr, currHop + 1);
          queue.push(nbr);
        }
      });
    }

    data.nodes.forEach((n) => {
      if (!hopMap.has(n.id)) {
        hopMap.set(n.id, 3);
      }
    });

    const hopGroups: Map<number, NetworkNode[]> = new Map();
    data.nodes.forEach((n) => {
      const hop = Math.min(3, hopMap.get(n.id) || 1);
      if (!hopGroups.has(hop)) hopGroups.set(hop, []);
      hopGroups.get(hop)!.push(n);
    });

    const minDim = Math.min(cx, cy);
    const r1 = Math.max(110, minDim * 0.38);
    const r2 = Math.max(210, minDim * 0.65);
    const r3 = Math.max(300, minDim * 0.88);

    const posMap = new Map<string, PositionedNode>();

    const centerNode = data.nodes.find((n) => n.id === rootId);
    if (centerNode) {
      posMap.set(rootId, {
        ...centerNode,
        x: cx,
        y: cy,
        hop: 0,
        radius: 10,
      });
    }

    [1, 2, 3].forEach((hop) => {
      const group = hopGroups.get(hop) || [];
      const count = group.length;
      if (count === 0) return;

      const radius = hop === 1 ? r1 : hop === 2 ? r2 : r3;
      const angleOffset = (hop * Math.PI) / 5;

      group.forEach((node, idx) => {
        if (node.id === rootId) return;

        const angle = angleOffset + (idx / count) * 2 * Math.PI;
        const nodeRadius = node.flagged ? 8 : 6;

        posMap.set(node.id, {
          ...node,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          hop,
          radius: nodeRadius,
        });
      });
    });

    return { positionedNodes: posMap, centerId: rootId };
  }, [data, centerNodeId, dimensions]);

  // Draw Static Light SaaS Radial Layout on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (!data || positionedNodes.size === 0) return;

    const cx = width / 2;
    const cy = height / 2;
    const minDim = Math.min(cx, cy);
    const r1 = Math.max(110, minDim * 0.38);
    const r2 = Math.max(210, minDim * 0.65);
    const r3 = Math.max(300, minDim * 0.88);

    // 1. Draw Concentric Ring Guidelines
    [r1, r2, r3].forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(`${idx + 1}-Hop Ring`, cx + 8, cy - r + 14);
    });

    // 2. Draw Graph Edges
    data.edges.forEach((edge) => {
      const src = positionedNodes.get(edge.source);
      const tgt = positionedNodes.get(edge.target);
      if (src && tgt) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });

    // 3. Draw Graph Nodes (No blur glow — crisp solid 2px borders)
    positionedNodes.forEach((node) => {
      const { x, y, radius, flagged, id, type, label } = node;
      const isCenter = id === centerId;
      const isHovered = id === hoveredNodeId;
      const isFlagged = Boolean(flagged);

      ctx.save();

      // Outer Ring Border for Flagged / Center Nodes
      if (isFlagged) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isCenter) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Base Node Circle
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? radius + 2 : radius, 0, 2 * Math.PI);

      if (isFlagged) {
        ctx.fillStyle = '#DC2626'; // --flag red
      } else if (isCenter) {
        ctx.fillStyle = '#4F46E5'; // --accent indigo
      } else {
        const baseColor = COLOR_MAP[type] || COLOR_MAP.unknown;
        ctx.fillStyle = hasFlaggedNode ? `${baseColor}55` : baseColor;
      }
      ctx.fill();

      // Node Stroke
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Node Label Text
      const fontSize = isCenter ? 12 : isFlagged ? 11 : 10;
      ctx.font = `${isCenter || isFlagged ? '600' : 'normal'} ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      ctx.fillStyle = isFlagged ? '#DC2626' : isCenter ? '#111827' : '#6B7280';

      const truncatedLabel = label && label.length > 24 ? `${label.substring(0, 22)}...` : label || id;
      ctx.fillText(truncatedLabel, x, y + radius + 5);

      ctx.restore();
    });
  }, [data, positionedNodes, centerId, hoveredNodeId, dimensions, hasFlaggedNode]);

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let hitId: string | null = null;

      positionedNodes.forEach((node) => {
        const dist = Math.hypot(mouseX - node.x, mouseY - node.y);
        if (dist <= node.radius + 6) {
          hitId = node.id;
        }
      });

      setHoveredNodeId(hitId);
      canvas.style.cursor = hitId ? 'pointer' : 'default';
    },
    [positionedNodes]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      positionedNodes.forEach((node) => {
        const dist = Math.hypot(clickX - node.x, clickY - node.y);
        if (dist <= node.radius + 6) {
          onSelectNode(node);
        }
      });
    },
    [positionedNodes, onSelectNode]
  );

  if (loading) {
    return (
      <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center p-6 bg-bg-muted">
        <Skeleton className="h-full w-full rounded-lg bg-border/40" />
      </div>
    );
  }

  if (errorDetail) {
    return (
      <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center p-6 bg-bg-muted">
        <ErrorState
          title="Graph Canvas Error"
          description={errorDetail}
          onRetry={onRetry}
          className="max-w-md bg-surface border-border shadow-sm"
        />
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-text-muted bg-bg-muted font-body">
        <Network className="h-10 w-10 text-text-muted/60 mb-3" />
        <h3 className="font-display text-sm font-semibold text-text-primary">No Network Selected</h3>
        <p className="text-xs max-w-sm mt-1 leading-relaxed text-text-muted">
          Search and select a provider or patient from the left rail, or click "View Ring Diagram" on a flagged ring card to inspect the graph.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-bg-muted">
      {/* Consolidated Single Quiet Text Line Legend */}
      <div className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border text-[11px] font-mono text-text-muted shadow-sm flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-flag inline-block" />
        <span className="font-semibold text-text-primary">Flagged Evidence</span>
        <span>• Center Anchor (Indigo) • Hop 1/2/3 Entities</span>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseMove={handleCanvasMouseMove}
        onClick={handleCanvasClick}
      />
    </div>
  );
}

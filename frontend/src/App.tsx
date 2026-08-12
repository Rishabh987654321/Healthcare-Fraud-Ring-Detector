import { useState } from 'react';
import { SearchResult, NetworkNode } from '@/lib/types';
import { useFraudRings } from '@/hooks/useFraudRings';
import { useEntityNetwork } from '@/hooks/useEntityNetwork';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterPanel } from '@/components/search/FilterPanel';
import { FraudRingsList } from '@/components/search/FraudRingsList';
import { ConnectionsPanel } from '@/components/connections/ConnectionsPanel';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { EntityDetailPanel } from '@/components/detail/EntityDetailPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Search, PanelRight, PanelLeft, Network, Layers } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'rings'>('search');
  const [filterType, setFilterType] = useState<'all' | 'provider' | 'patient'>('all');
  const [centerView, setCenterView] = useState<'connections' | 'graph'>('connections');

  const [selectedEntity, setSelectedEntity] = useState<{ type: 'provider' | 'patient'; id: string } | null>({
    type: 'provider',
    id: 'PRV-RINGA-01', // Default to Ring A provider for immediate demo impact
  });

  const [networkDepth, setNetworkDepth] = useState<number>(2);
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(true);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

  // Custom Hooks for Async Data Fetching
  const { fraudRings, loading: loadingRings, error: ringsError, refetch: fetchRings } = useFraudRings();
  const { data: graphData, loading: loadingGraph, error: graphError, refetch: fetchNetwork } = useEntityNetwork(selectedEntity, networkDepth);

  const handleSelectSearchResult = (result: SearchResult) => {
    setSelectedEntity({ type: result.type, id: result.id });
  };

  const handleSelectRingEntity = (type: 'provider' | 'patient', id: string) => {
    setSelectedEntity({ type, id });
  };

  const handleNodeClick = (node: NetworkNode) => {
    if (node.type === 'provider' || node.type === 'patient') {
      setSelectedEntity({ type: node.type, id: node.id });
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg-muted text-text-primary selection:bg-accent/20 selection:text-accent font-body">
      {/* Top Navigation Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLeftPanel((prev) => !prev)}
            className="h-8 w-8 p-0 text-text-muted hover:text-text-primary hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-accent"
            title="Toggle Left Rail"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-muted text-accent border border-accent/20">
            <ShieldAlert className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-sm font-semibold tracking-tight text-text-primary flex items-center gap-2">
              Healthcare Fraud Ring Detector
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Center View Switcher Toggle (Connections vs Graph) */}
          <div className="flex items-center gap-1 bg-bg-muted p-1 rounded-md border border-border text-xs font-mono">
            <button
              onClick={() => setCenterView('connections')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                centerView === 'connections'
                  ? 'bg-surface text-accent font-bold shadow-sm border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Connections</span>
            </button>
            <button
              onClick={() => setCenterView('graph')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                centerView === 'graph'
                  ? 'bg-surface text-accent font-bold shadow-sm border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Graph View</span>
            </button>
          </div>

          {/* Depth Selector */}
          {selectedEntity && (
            <div className="flex items-center gap-1 bg-bg-muted p-1 rounded-md border border-border text-xs font-mono">
              <span className="text-text-muted px-1.5 text-[11px]">Depth:</span>
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setNetworkDepth(d)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                    networkDepth === d
                      ? 'bg-surface text-accent font-bold shadow-sm border border-border'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRightPanel((prev) => !prev)}
            className="h-8 gap-1.5 text-xs text-text-muted hover:text-text-primary border-border bg-surface shadow-sm focus-visible:ring-2 focus-visible:ring-accent"
          >
            <PanelRight className="h-3.5 w-3.5" />
            <span>{showRightPanel ? 'Hide Detail' : 'Show Detail'}</span>
          </Button>
        </div>
      </header>

      {/* Main Three-Pane Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Rail: Search & Fraud Ring Tabs (Fixed 320px width) */}
        {showLeftPanel && (
          <aside className="w-80 shrink-0 min-w-0 border-r border-border bg-surface flex flex-col overflow-hidden shadow-sm">
            {/* Left Rail Tab Selector */}
            <div className="flex border-b border-border bg-bg-muted/50 p-1 gap-1 shrink-0">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2 px-3 text-xs font-display font-semibold flex items-center justify-center gap-1.5 rounded transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  activeTab === 'search'
                    ? 'bg-surface text-accent shadow-sm border border-border'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search Entities</span>
              </button>
              <button
                onClick={() => setActiveTab('rings')}
                className={`flex-1 py-2 px-3 text-xs font-display font-semibold flex items-center justify-center gap-1.5 rounded transition-all focus-visible:ring-2 focus-visible:ring-flag focus-visible:outline-none ${
                  activeTab === 'rings'
                    ? 'bg-flag-bg text-flag border border-flag/30'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Flagged Rings ({fraudRings.length})</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4 overflow-hidden">
              {activeTab === 'search' ? (
                <>
                  <div className="shrink-0">
                    <FilterPanel selectedType={filterType} onSelectType={setFilterType} />
                  </div>
                  <SearchBar filterType={filterType} onSelectResult={handleSelectSearchResult} />
                </>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 min-w-0">
                  <FraudRingsList
                    rings={fraudRings}
                    loading={loadingRings}
                    errorDetail={ringsError}
                    onRetry={fetchRings}
                    onSelectRingEntity={handleSelectRingEntity}
                  />
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Center: Dominant Connections Panel or Static Radial Graph Canvas */}
        <main className="flex-1 min-w-0 bg-bg-muted flex flex-col overflow-hidden relative">
          {centerView === 'connections' ? (
            <ConnectionsPanel
              data={graphData}
              loading={loadingGraph}
              errorDetail={graphError}
              onRetry={fetchNetwork}
              onSelectNode={handleNodeClick}
              fraudRings={fraudRings}
              selectedEntityId={selectedEntity?.id}
            />
          ) : (
            <GraphCanvas
              data={graphData}
              loading={loadingGraph}
              errorDetail={graphError}
              onRetry={fetchNetwork}
              onSelectNode={handleNodeClick}
              centerNodeId={selectedEntity?.id}
            />
          )}
        </main>

        {/* Right Panel: Entity Detail Inspector */}
        {showRightPanel && selectedEntity && (
          <aside className="w-96 shrink-0 min-w-0 border-l border-border bg-surface flex flex-col overflow-hidden shadow-sm">
            <EntityDetailPanel
              entityType={selectedEntity.type}
              entityId={selectedEntity.id}
              fraudRings={fraudRings}
              onSelectRelatedEntity={handleSelectRingEntity}
            />
          </aside>
        )}
      </div>

      {/* Persistent Synthetic Data Disclaimer Footer */}
      <footer className="h-8 shrink-0 border-t border-border bg-surface px-4 flex items-center justify-center text-[11px] text-text-muted font-body select-none">
        All data in this application is synthetic, generated with Faker for demonstration purposes. No real patient or provider information is used.
      </footer>
    </div>
  );
}

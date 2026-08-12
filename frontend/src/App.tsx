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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ShieldAlert, Search, PanelRight, PanelLeft, Network, Layers, SlidersHorizontal, Menu } from 'lucide-react';

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

  // Responsive Drawer Sheet States (< lg screens)
  const [isLeftSheetOpen, setIsLeftSheetOpen] = useState<boolean>(false);
  const [isRightSheetOpen, setIsRightSheetOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Custom Hooks for Async Data Fetching
  const { fraudRings, loading: loadingRings, error: ringsError, refetch: fetchRings } = useFraudRings();
  const { data: graphData, loading: loadingGraph, error: graphError, refetch: fetchNetwork } = useEntityNetwork(selectedEntity, networkDepth);

  const handleSelectSearchResult = (result: SearchResult) => {
    setSelectedEntity({ type: result.type, id: result.id });
    setIsLeftSheetOpen(false);
  };

  const handleSelectRingEntity = (type: 'provider' | 'patient', id: string) => {
    setSelectedEntity({ type, id });
    setIsLeftSheetOpen(false);
  };

  const handleNodeClick = (node: NetworkNode) => {
    if (node.type === 'provider' || node.type === 'patient') {
      setSelectedEntity({ type: node.type, id: node.id });
      // On mobile/tablet, open detail sheet when a node is clicked
      setIsRightSheetOpen(true);
    }
  };

  // Shared Content inside Left Rail (Search / Flagged Rings)
  const renderLeftRailContent = () => (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Left Rail Tab Selector */}
      <div className="flex border-b border-border bg-bg-muted/50 p-1 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2.5 px-3 text-xs font-display font-semibold flex items-center justify-center gap-1.5 rounded transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
            activeTab === 'search'
              ? 'bg-surface text-accent shadow-sm border border-border'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Search Entities</span>
        </button>
        <button
          onClick={() => setActiveTab('rings')}
          className={`flex-1 py-2.5 px-3 text-xs font-display font-semibold flex items-center justify-center gap-1.5 rounded transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-flag focus-visible:outline-none ${
            activeTab === 'rings'
              ? 'bg-flag-bg text-flag border border-flag/30'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
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
    </div>
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg-muted text-text-primary selection:bg-accent/20 selection:text-accent font-body">
      {/* Top Navigation Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-3 sm:px-4 shadow-sm z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Left Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLeftPanel((prev) => !prev)}
            className="hidden lg:flex h-9 w-9 p-0 text-text-muted hover:text-text-primary hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-accent"
            title="Toggle Left Rail"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          {/* Mobile/Tablet Left Drawer Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLeftSheetOpen(true)}
            className="flex lg:hidden h-10 w-10 p-0 text-text-muted hover:text-text-primary hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-accent"
            title="Open Search & Rings Drawer"
          >
            <Menu className="h-5 w-5 text-text-primary" />
          </Button>

          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-muted text-accent border border-accent/20 shrink-0">
            <ShieldAlert className="h-4 w-4 text-accent" />
          </div>
          <div className="truncate">
            <h1 className="font-display text-xs sm:text-sm font-semibold tracking-tight text-text-primary truncate">
              Healthcare Fraud Ring Detector
            </h1>
          </div>
        </div>

        {/* Desktop Header Navigation Controls */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Center View Switcher Toggle */}
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

        {/* Mobile/Tablet Right Action Bar */}
        <div className="flex lg:hidden items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRightSheetOpen(true)}
            className="h-10 px-2.5 gap-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-accent"
            title="Inspect Selected Entity Detail"
          >
            <PanelRight className="h-4 w-4 text-accent" />
            <span className="hidden sm:inline font-mono text-[11px]">Detail</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="h-10 w-10 p-0 text-text-muted hover:text-text-primary border-border bg-surface shadow-sm focus-visible:ring-2 focus-visible:ring-accent"
            title="View Options"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile/Tablet Slide-Down Options Panel */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-surface p-3 px-4 shadow-sm z-20 space-y-3 font-body">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-primary">View Mode:</span>
            <div className="flex items-center gap-1 bg-bg-muted p-1 rounded-md border border-border text-xs font-mono">
              <button
                onClick={() => setCenterView('connections')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[36px] ${
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
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[36px] ${
                  centerView === 'graph'
                    ? 'bg-surface text-accent font-bold shadow-sm border border-border'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Network className="h-3.5 w-3.5" />
                <span>Graph View</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
            <span className="text-xs font-semibold text-text-primary">Traversal Depth:</span>
            <div className="flex items-center gap-1 bg-bg-muted p-1 rounded-md border border-border text-xs font-mono">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setNetworkDepth(d)}
                  className={`px-3 py-1 rounded text-xs transition-colors min-h-[36px] ${
                    networkDepth === d
                      ? 'bg-surface text-accent font-bold shadow-sm border border-border'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Depth {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Left Search Rail (Visible on lg+ screens) */}
        {showLeftPanel && (
          <aside className="hidden lg:flex w-80 shrink-0 min-w-0 border-r border-border bg-surface flex-col overflow-hidden shadow-sm">
            {renderLeftRailContent()}
          </aside>
        )}

        {/* Center: Dominant Connections Panel or Static Radial Graph Canvas */}
        <main className="flex-1 min-w-0 bg-bg-muted flex flex-col overflow-hidden relative w-full">
          <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
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
          </div>
        </main>

        {/* Desktop Right Detail Inspector (Visible on lg+ screens) */}
        {showRightPanel && selectedEntity && (
          <aside className="hidden lg:flex w-96 shrink-0 min-w-0 border-l border-border bg-surface flex-col overflow-hidden shadow-sm">
            <EntityDetailPanel
              entityType={selectedEntity.type}
              entityId={selectedEntity.id}
              fraudRings={fraudRings}
              onSelectRelatedEntity={handleSelectRingEntity}
            />
          </aside>
        )}
      </div>

      {/* Mobile/Tablet Left Off-Canvas Drawer (Sheet) */}
      <Sheet open={isLeftSheetOpen} onOpenChange={setIsLeftSheetOpen}>
        <SheetContent side="left" className="w-full sm:w-80 p-0 flex flex-col bg-surface border-r border-border">
          <SheetHeader className="p-3 border-b border-border bg-bg-muted/40">
            <SheetTitle className="text-sm font-display font-semibold text-text-primary flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent" />
              <span>Entity Search & Fraud Rings</span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {renderLeftRailContent()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile/Tablet Right Off-Canvas Drawer (Sheet) */}
      {selectedEntity && (
        <Sheet open={isRightSheetOpen} onOpenChange={setIsRightSheetOpen}>
          <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col bg-surface border-l border-border">
            <SheetHeader className="p-3 border-b border-border bg-bg-muted/40">
              <SheetTitle className="text-sm font-display font-semibold text-text-primary flex items-center gap-2">
                <PanelRight className="h-4 w-4 text-accent" />
                <span>Entity Inspector</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <EntityDetailPanel
                entityType={selectedEntity.type}
                entityId={selectedEntity.id}
                fraudRings={fraudRings}
                onSelectRelatedEntity={(type, id) => {
                  handleSelectRingEntity(type, id);
                  setIsRightSheetOpen(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Persistent Synthetic Data Disclaimer Footer */}
      <footer className="h-8 shrink-0 border-t border-border bg-surface px-4 flex items-center justify-center text-[10px] sm:text-[11px] text-text-muted font-body select-none text-center truncate">
        All data in this application is synthetic, generated with Faker for demonstration purposes.
      </footer>
    </div>
  );
}

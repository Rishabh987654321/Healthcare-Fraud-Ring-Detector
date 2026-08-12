import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Copy, Check, Terminal } from 'lucide-react';

interface CypherQueryBoxProps {
  queryText: string;
  title?: string;
  className?: string;
}

export function CypherQueryBox({
  queryText,
  title = 'View Cypher Query',
  className = '',
}: CypherQueryBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(queryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border border-border rounded-lg bg-bg-muted/60 overflow-hidden font-body text-xs ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-2.5 px-3 bg-surface hover:bg-bg-muted transition-colors text-left focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <div className="flex items-center gap-2 text-text-primary font-mono text-[11px] font-semibold">
          <Terminal className="h-3.5 w-3.5 text-accent shrink-0" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="relative p-3 bg-bg-muted border-t border-border font-mono text-[11px] leading-relaxed text-text-primary overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2 h-7 px-2 text-[10px] font-mono gap-1 border border-border bg-surface hover:bg-bg-muted text-text-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent"
            title="Copy query to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-accent" />
                <span className="text-accent font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </Button>
          <pre className="pr-16 text-text-primary whitespace-pre-wrap break-all">
            <code>{queryText}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  code: string;
  onChange?: (code: string) => void;
  language?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  className?: string;
  minHeight?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  language = 'typescript',
  readOnly = false,
  showLineNumbers = true,
  className,
  minHeight = '300px',
}) => {
  const lines = code.split('\n');

  return (
    <div
      className={cn(
        'relative rounded-lg border border-border-subtle/20 bg-[#1a1a1a] overflow-hidden',
        className
      )}
      style={{ minHeight }}
    >
      {/* Language badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-mono text-muted-foreground bg-surface">
        {language}
      </div>

      <div className="flex overflow-auto" style={{ minHeight }}>
        {/* Line numbers */}
        {showLineNumbers && (
          <div className="flex-shrink-0 py-4 pr-2 text-right select-none bg-[#1a1a1a] border-r border-border-subtle/10">
            {lines.map((_, i) => (
              <div
                key={i}
                className="px-3 text-xs font-mono text-muted-foreground/40 leading-6"
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Code content */}
        <div className="flex-1 p-4 overflow-x-auto">
          {readOnly ? (
            <pre className="font-mono text-sm text-foreground leading-6 whitespace-pre">
              {code}
            </pre>
          ) : (
            <textarea
              value={code}
              onChange={(e) => onChange?.(e.target.value)}
              className="w-full h-full bg-transparent font-mono text-sm text-foreground leading-6 resize-none focus:outline-none"
              spellCheck={false}
              style={{ minHeight: `calc(${minHeight} - 32px)` }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

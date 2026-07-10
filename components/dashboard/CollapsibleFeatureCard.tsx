'use client';

import { useState, useEffect, useRef } from 'react';

interface CollapsibleFeatureCardProps {
  id: string;
  icon: string | React.ReactNode;
  title: string;
  description: string;
  defaultOpen?: boolean;
  isActive?: boolean;
  actionTrigger?: any;
  children: React.ReactNode;
}

export default function CollapsibleFeatureCard({
  id,
  icon,
  title,
  description,
  defaultOpen = false,
  isActive = false,
  actionTrigger,
  children,
}: CollapsibleFeatureCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [highlight, setHighlight] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger temporary highlight when isActive is true or actionTrigger changes
  useEffect(() => {
    if (isActive) {
      setHighlight(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setHighlight(false);
      }, 1500);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive, actionTrigger]);

  return (
    <div
      className={`rounded-lg border bg-graphite-800 transition-all duration-300 ${
        highlight
          ? 'border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
          : 'border-gray-700/40 hover:border-gray-700/80'
      }`}
    >
      {/* Header Button */}
      <button
        type="button"
        id={`card-header-${id}`}
        aria-expanded={isOpen}
        aria-controls={`card-content-${id}`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3.5 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded-t-lg"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <span className="text-base shrink-0 select-none text-amber-500/95">
            {icon}
          </span>
          
          <div className="min-w-0">
            {/* Title */}
            <h3 className="text-xs font-semibold text-gray-200 tracking-wide uppercase">
              {title}
            </h3>
            {/* Description */}
            <p className="mt-0.5 text-[10px] text-gray-500 truncate leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Chevron Indicator */}
        <span className="text-gray-500 shrink-0 ml-2 select-none">
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>

      {/* Collapsible Content */}
      <div
        id={`card-content-${id}`}
        role="region"
        aria-labelledby={`card-header-${id}`}
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[800px] border-t border-gray-700/30 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4 bg-graphite-900/30">
          {children}
        </div>
      </div>
    </div>
  );
}

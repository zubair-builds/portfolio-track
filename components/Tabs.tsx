'use client';

import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors
                ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
                }
              `}
            >
              <span className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
                    ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }
                  `}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


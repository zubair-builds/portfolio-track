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
    <div className="flex p-1 space-x-1 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 flex-1 sm:flex-none
              ${isActive
                ? 'text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-800 shadow-sm shadow-indigo-500/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }
            `}
          >
            <span className={`transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-100'}`}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`
                  ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                  ${isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }
                `}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <div className="absolute inset-0 rounded-xl ring-1 ring-black/5 dark:ring-white/10 pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
}


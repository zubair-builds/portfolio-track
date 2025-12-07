'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ProfessionalHeader from '@/components/ProfessionalHeader';

export default function SettingsPage() {
    const router = useRouter();
    const { user, initializing, signout } = useAuth();
    const [darkMode, setDarkMode] = useState(false);
    const [importing, setImporting] = useState(false);

    // Initialize theme state
    useEffect(() => {
        // Only sync with existing theme, don't set it
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark';
        setDarkMode(isDark);

        // Observer for changes (in case header toggles it)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isDarkNow = document.documentElement.classList.contains('dark');
                    setDarkMode(isDarkNow);
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    // Redirect if not authenticated
    useEffect(() => {
        if (!initializing && !user) {
            router.replace('/signin');
        }
    }, [initializing, user, router]);

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        setDarkMode(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    const handleExport = async (format: 'json' | 'csv') => {
        if (!user?.email) return;

        try {
            const response = await fetch(`/api/portfolio/export?format=${format}`, {
                headers: {
                    'X-User-Id': user.email,
                },
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `portfolio-export-${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export portfolio');
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!user?.email) return;
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const response = await fetch('/api/portfolio/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': user.email,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
                alert(result.message);
            } else {
                alert(result.error || 'Import failed');
            }
        } catch (err) {
            console.error('Import error:', err);
            alert('Failed to import portfolio. Please check the file format.');
        } finally {
            setImporting(false);
            event.target.value = ''; // Reset file input
        }
    };

    if (initializing || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
                    <p className="text-lg font-medium">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0B0F19] relative selection:bg-indigo-500/30">
            {/* Global Background Effects matching Dashboard */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[1000px] h-[600px] bg-indigo-500/3 dark:bg-indigo-500/5 rounded-full blur-[120px] -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-[800px] h-[600px] bg-purple-500/3 dark:bg-purple-500/5 rounded-full blur-[100px] translate-y-1/3" />
            </div>

            <ProfessionalHeader user={user} onSignOut={signout} />

            <main className="container mx-auto max-w-4xl px-4 py-12 relative z-10">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8">Manage your profile, preferences, and data</p>

                <div className="grid gap-6">
                    {/* Section: Profile */}
                    <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-lg font-medium text-slate-900 dark:text-white">{user.name}</p>
                                <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
                            </div>
                        </div>
                    </section>

                    {/* Section: Appearance */}
                    <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                            Appearance
                        </h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Reduce eye strain in low-light environments</p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <span
                                    className={`${darkMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                />
                            </button>
                        </div>
                    </section>

                    {/* Section: Data Management */}
                    <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                            Data Management
                        </h2>

                        <div className="space-y-6">
                            {/* Export */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Export Portfolio</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Download your portfolio data as a JSON file backup</p>
                                </div>
                                <button
                                    onClick={() => handleExport('json')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download JSON
                                </button>
                            </div>

                            {/* Import */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Import Portfolio</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Restore your portfolio from a previous backup</p>
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImport}
                                        className="hidden"
                                        id="import-portfolio-settings"
                                        disabled={importing}
                                    />
                                    <label
                                        htmlFor="import-portfolio-settings"
                                        className={`flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        {importing ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                Upload Backup
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  LayoutDashboard,
  ClipboardCheck,
  MessageSquareWarning,
  DollarSign,
  Factory,
  Zap,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import CommandPalette from './CommandPalette';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/quality', label: 'Quality Audits', icon: ClipboardCheck },
  { path: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { path: '/finance', label: 'Finance & Export', icon: DollarSign },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+K -> open command palette
      if (mod && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }

      // Cmd+/ -> focus AI chat textarea
      if (mod && e.key === '/') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('focus-ai-chat'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => axios.get('/api/health').then((r) => r.data),
    refetchInterval: 30000,
  });

  const aiActive = health?.status === 'ok';
  const aiEnabled = health?.aiEnabled ?? false;

  return (
    <div className="flex h-screen bg-surface-100">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 bg-surface-900 px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white p-1"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-accent-400 to-accent-600">
            <Factory className="w-4 h-4 text-surface-900" />
          </div>
          <span className="text-white font-bold text-sm tracking-wide">FMCG AI Platform</span>
        </div>
      </div>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface-900 flex flex-col flex-shrink-0 overflow-hidden transform transition-transform duration-200 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Subtle geometric pattern in sidebar */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(30deg, #f0a500 12%, transparent 12.5%, transparent 87%, #f0a500 87.5%), linear-gradient(150deg, #f0a500 12%, transparent 12.5%, transparent 87%, #f0a500 87.5%), linear-gradient(30deg, #f0a500 12%, transparent 12.5%, transparent 87%, #f0a500 87.5%), linear-gradient(150deg, #f0a500 12%, transparent 12.5%, transparent 87%, #f0a500 87.5%)',
            backgroundSize: '60px 105px',
            backgroundPosition: '0 0, 0 0, 30px 52.5px, 30px 52.5px',
          }}
        />

        {/* Logo */}
        <div className="relative p-5 border-b border-white/5" data-tour="sidebar-logo">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-400/20">
              <Factory className="w-5 h-5 text-surface-900" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-wide">FMCG AI Platform</div>
              <div className="text-accent-400/70 text-xs font-mono">Agentic Intelligence</div>
            </div>
          </div>
        </div>

        {/* AI Status */}
        <div className="relative px-4 py-3 border-b border-white/5" data-tour="ai-status">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <Zap className="w-4 h-4 text-accent-400" />
            <div>
              <div className="text-white text-xs font-medium">Claude Opus 4.6</div>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${aiActive ? (aiEnabled ? 'bg-success-500 animate-pulse' : 'bg-warning-400 animate-pulse') : 'bg-danger-500'}`} />
                <span className="text-surface-400 text-xs">
                  {aiActive ? (aiEnabled ? 'AI Agents Active' : 'AI Key Missing') : 'Server Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-white/60 hover:text-white md:hidden z-10"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="relative flex-1 p-4 space-y-1" data-tour="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                  isActive
                    ? 'bg-accent-400/15 text-accent-400 border border-accent-400/20 shadow-sm shadow-accent-400/10'
                    : 'text-surface-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* Command Palette Hint */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-500 hover:bg-white/5 hover:text-surface-300 border border-transparent transition-all duration-200 mt-3"
          >
            <span className="text-xs">Search...</span>
            <kbd className="ml-auto text-[10px] font-mono bg-white/10 text-surface-400 border border-white/10 rounded px-1.5 py-0.5">
              {navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}K
            </kbd>
          </button>
        </nav>

        {/* Dark Mode Toggle */}
        <div className="relative px-4 py-3 border-t border-white/5">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 border border-white/5 transition-all duration-200"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-accent-400" />
            ) : (
              <Sun className="w-4 h-4 text-accent-400" />
            )}
            <span className="text-white text-xs font-medium">
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>
        </div>

        {/* Company Info */}
        <div className="relative p-4 border-t border-white/5">
          <div className="text-xs">
            <div className="font-medium text-accent-400/80 mb-1 tracking-wide">IndiaFMCG Corp</div>
            <div className="text-surface-400">Exporting to 35+ Countries</div>
            <div className="mt-1 text-surface-500 font-mono text-[10px]">v1.0.0 · Production</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:ml-0">
        <div className="p-6 pt-16 md:pt-6">{children}</div>
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        navigate={navigate}
      />
    </div>
  );
}

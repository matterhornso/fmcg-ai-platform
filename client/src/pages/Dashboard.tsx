import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  ClipboardCheck,
  MessageSquareWarning,
  DollarSign,
  Globe,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Info,
  Sparkles,
  Activity,
  Compass,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { statusBadge, priorityBadge } from '../components/ui/Badge';
import GuidedTour from '../components/GuidedTour';

const COLORS = ['#f0a500', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [tourActive, setTourActive] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(
    () => localStorage.getItem('fmcg_tour_completed') === 'true'
  );

  const handleTourComplete = () => {
    setTourActive(false);
    setTourCompleted(true);
    localStorage.setItem('fmcg_tour_completed', 'true');
  };

  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('fmcg_welcome_dismissed') === 'true'
  );

  const dismissWelcome = () => {
    localStorage.setItem('fmcg_welcome_dismissed', 'true');
    setWelcomeDismissed(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => axios.get('/api/dashboard/stats').then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => axios.get('/api/health').then((r) => r.data),
    refetchInterval: 60000,
  });

  // Track seconds since last data fetch
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (data) setSecondsAgo(0);
  }, [data]);
  useEffect(() => {
    const interval = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-8 w-16" />
              <div className="skeleton h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5"><div className="skeleton h-[200px] w-full" /></div>
          <div className="card p-5"><div className="skeleton h-[200px] w-full" /></div>
        </div>
      </div>
    );
  }

  const { audits, complaints, finance, recentComplaints, recentAudits } = data || {};

  // Build activity timeline from recent data
  const activityTimeline: { action: string; detail: string; time: string; icon: typeof ClipboardCheck; color: string }[] = [];
  if (recentAudits?.length) {
    recentAudits.slice(0, 3).forEach((a: any) => {
      activityTimeline.push({
        action: a.status === 'completed' ? 'Completed audit' : 'Created audit',
        detail: a.title,
        time: a.created_at || a.updated_at || '',
        icon: ClipboardCheck,
        color: 'text-success-600',
      });
    });
  }
  if (recentComplaints?.length) {
    recentComplaints.slice(0, 3).forEach((c: any) => {
      activityTimeline.push({
        action: 'Logged complaint',
        detail: `${c.customer_name} - ${c.product}`,
        time: c.complaint_date || c.created_at || '',
        icon: MessageSquareWarning,
        color: 'text-danger-500',
      });
    });
  }
  const timelineItems = activityTimeline.slice(0, 5);

  const statCards = [
    {
      title: 'Quality Audits',
      value: audits?.total || 0,
      subValue: `${audits?.completed || 0} completed`,
      icon: ClipboardCheck,
      gradient: 'from-success-500 to-success-700',
      lightBg: 'bg-success-50',
      textColor: 'text-success-600',
      borderColor: 'border-success-200',
      extra: audits?.avg_score ? `Avg Score: ${Math.round(audits.avg_score)}%` : null,
      link: '/quality',
      trend: { value: '+12%', up: true },
    },
    {
      title: 'Customer Complaints',
      value: complaints?.total || 0,
      subValue: `${complaints?.open || 0} open`,
      icon: MessageSquareWarning,
      gradient: complaints?.critical > 0 ? 'from-danger-500 to-danger-700' : 'from-accent-400 to-accent-600',
      lightBg: complaints?.critical > 0 ? 'bg-danger-50' : 'bg-accent-50',
      textColor: complaints?.critical > 0 ? 'text-danger-600' : 'text-accent-600',
      borderColor: complaints?.critical > 0 ? 'border-danger-200' : 'border-accent-200',
      extra: complaints?.critical > 0 ? `${complaints.critical} Critical!` : null,
      link: '/complaints',
      trend: { value: '-8%', up: false },
    },
    {
      title: 'Export Invoices',
      value: finance?.total || 0,
      subValue: `${finance?.countries || 0} countries`,
      icon: DollarSign,
      gradient: 'from-accent-400 to-accent-600',
      lightBg: 'bg-accent-50',
      textColor: 'text-accent-600',
      borderColor: 'border-accent-200',
      extra: finance?.approved_value ? `USD ${(finance.approved_value / 1000).toFixed(0)}K approved` : null,
      link: '/finance',
      trend: { value: '+5%', up: true },
    },
    {
      title: 'Export Markets',
      value: '35+',
      subValue: 'Active Countries',
      icon: Globe,
      gradient: 'from-purple-500 to-purple-700',
      lightBg: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      extra: 'UK, UAE, SG, DE, QA...',
      link: '/finance',
      trend: { value: '+3', up: true },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner for First-Time Users */}
      {!welcomeDismissed && (
        <div className="relative overflow-hidden rounded-xl border-2 border-accent-200 shadow-sm" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fde68a 70%, #fcd34d 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10" style={{ background: 'radial-gradient(circle, var(--accent-400) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-accent-600/60 hover:text-accent-700 transition-colors z-10"
            aria-label="Dismiss welcome banner"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="p-6 relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-accent-600" />
              <h2 className="text-xl font-bold text-surface-800">Welcome to FMCG AI Platform</h2>
            </div>
            <p className="text-sm text-surface-700 mb-4 max-w-lg">
              Manage quality audits, customer complaints, and export compliance — powered by AI agents that classify, analyze, and recommend actions.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/quality" className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2">
                <ClipboardCheck className="w-4 h-4" /> Create Your First Audit
              </Link>
              <Link to="/complaints" className="btn-secondary text-sm flex items-center gap-1.5 px-4 py-2">
                <MessageSquareWarning className="w-4 h-4" /> Log a Complaint
              </Link>
              <Link to="/finance" className="btn-secondary text-sm flex items-center gap-1.5 px-4 py-2">
                <DollarSign className="w-4 h-4" /> Create an Invoice
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* AI Key Warning Banner */}
      {health && !health.aiEnabled && (
        <div className="flex items-center gap-3 bg-accent-50 border border-accent-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-accent-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-accent-800">AI features are not active</p>
            <p className="text-xs text-accent-700 mt-0.5">
              Add your Anthropic API key to <code className="bg-accent-100 px-1 rounded font-mono">.env</code> and restart the server:&nbsp;
              <code className="bg-accent-100 px-1 rounded font-mono">ANTHROPIC_API_KEY=sk-ant-...</code>
            </p>
          </div>
          <span className="text-xs bg-accent-200 text-accent-800 px-2 py-1 rounded-full font-medium">No API Key</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Operations Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-surface-500 text-sm">
              AI-powered quality, complaints & finance management
            </p>
            <span className="text-xs text-surface-400 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              Updated {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setTourActive(true)}
              className={`btn-secondary flex items-center gap-2 ${!tourCompleted ? 'tour-hint-glow' : ''}`}
            >
              <Compass className="w-4 h-4" /> Take a Tour
            </button>
            {!tourCompleted && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-400 rounded-full animate-pulse" />
            )}
          </div>
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${health?.aiEnabled ? 'bg-success-50 border-success-200' : 'bg-surface-100 border-surface-200'}`}>
            <div className={`w-2 h-2 rounded-full ${health?.aiEnabled ? 'bg-success-500 animate-pulse' : 'bg-surface-400'}`} />
            <span className={`text-sm font-medium ${health?.aiEnabled ? 'text-success-700' : 'text-surface-500'}`}>
              {health?.aiEnabled ? '3 AI Agents Active' : 'AI Agents Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="dashboard-stats">
        {statCards.map((card) => (
          <Link key={card.title} to={card.link}>
            <div className="card card-hover-lift p-5 cursor-pointer group relative overflow-hidden">
              {/* Top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-surface-500 text-sm">{card.title}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-surface-800 font-mono">{card.value}</p>
                    {card.trend && (
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${card.trend.up ? 'text-success-600' : 'text-danger-500'}`}>
                        {card.trend.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {card.trend.value}
                      </span>
                    )}
                  </div>
                  <p className="text-surface-400 text-xs mt-1">{card.subValue}</p>
                  {card.extra && (
                    <p className={`text-xs font-medium mt-1 ${card.textColor}`}>{card.extra}</p>
                  )}
                </div>
                <div className={`w-10 h-10 ${card.lightBg} rounded-xl flex items-center justify-center border ${card.borderColor}`}>
                  <card.icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-5" data-tour="quick-actions">
        <h3 className="font-semibold text-surface-800 mb-4">Quick AI Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link to="/quality" className="flex items-center gap-3 p-3 border border-success-200 bg-success-50 hover:bg-success-100 rounded-xl transition-all duration-200 hover:shadow-sm">
            <ClipboardCheck className="w-5 h-5 text-success-600" />
            <div>
              <p className="text-sm font-medium text-success-700">New Audit</p>
              <p className="text-xs text-success-600/80">AI generates checklist</p>
            </div>
          </Link>
          <Link to="/complaints" className="flex items-center gap-3 p-3 border border-danger-200 bg-danger-50 hover:bg-danger-100 rounded-xl transition-all duration-200 hover:shadow-sm">
            <AlertTriangle className="w-5 h-5 text-danger-500" />
            <div>
              <p className="text-sm font-medium text-danger-700">Log Complaint</p>
              <p className="text-xs text-danger-500/80">AI classifies & prioritizes</p>
            </div>
          </Link>
          <Link to="/finance" className="flex items-center gap-3 p-3 border border-accent-200 bg-accent-50 hover:bg-accent-100 rounded-xl transition-all duration-200 hover:shadow-sm">
            <TrendingUp className="w-5 h-5 text-accent-600" />
            <div>
              <p className="text-sm font-medium text-accent-700">Export Compliance</p>
              <p className="text-xs text-accent-600/80">AI validates documents</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Complaints by Country */}
        <div className="card p-5">
          <h3 className="font-semibold text-surface-800 mb-4">Complaints by Country</h3>
          {data?.complaints?.byCountry?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.complaints.byCountry || []}>
                <XAxis dataKey="customer_country" tick={{ fontSize: 11, fill: '#7c786e' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7c786e' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e8e6df',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontFamily: 'Space Mono',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#f0a500" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center">
              <Globe className="w-8 h-8 text-surface-300 mb-2" />
              <p className="text-surface-400 text-sm">No complaint data yet</p>
              <p className="text-surface-300 text-xs mt-0.5">Data will appear as complaints are logged</p>
            </div>
          )}
        </div>

        {/* Audit Status Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-surface-800 mb-4">Audit Status Overview</h3>
          {audits && (
            <div className="flex items-center gap-6">
              <div style={{ width: 160, height: 160 }}>
                <PieChart width={160} height={160}>
                  <Pie
                    data={[
                      { name: 'Completed', value: audits.completed || 0 },
                      { name: 'In Progress', value: audits.in_progress || 0 },
                      { name: 'Pending', value: audits.pending || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {[0, 1, 2].map((i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Completed', value: audits.completed || 0, color: 'bg-accent-400' },
                  { label: 'In Progress', value: audits.in_progress || 0, color: 'bg-success-500' },
                  { label: 'Pending', value: audits.pending || 0, color: 'bg-danger-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-surface-500">{item.label}</span>
                    <span className="text-sm font-bold text-surface-800 ml-auto font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      {timelineItems.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-500" /> Activity Timeline
          </h3>
          <div className="space-y-3 pl-3 border-l-2 border-surface-200">
            {timelineItems.map((item, i) => (
              <div key={i} className="relative pl-4 animate-fade-in">
                <div className="absolute -left-[9px] top-1 w-3 h-3 rounded-full bg-white border-2 border-accent-400" />
                <div className="flex items-center gap-2">
                  <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <span className="text-sm font-medium text-surface-800">{item.action}</span>
                  {item.time && <span className="text-xs text-surface-400 font-mono ml-auto">{item.time}</span>}
                </div>
                <p className="text-xs text-surface-500 mt-0.5 truncate">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Complaints */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800">Recent Complaints</h3>
            <Link to="/complaints" className="text-accent-500 hover:text-accent-600 text-sm flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {(recentComplaints || []).map((c: any) => (
              <div key={c.id} className="flex items-start gap-3 p-3 bg-surface-50 rounded-lg border border-surface-200/50 hover:border-surface-200 transition-all duration-200 hover:shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-surface-500">{c.complaint_ref}</span>
                    {priorityBadge(c.priority)}
                  </div>
                  <p className="text-sm font-medium text-surface-800 mt-0.5 truncate">{c.customer_name}</p>
                  <p className="text-xs text-surface-400">{c.product} · {c.customer_country}</p>
                </div>
                {statusBadge(c.status)}
              </div>
            ))}
            {(!recentComplaints || recentComplaints.length === 0) && (
              <div className="text-center py-6">
                <MessageSquareWarning className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                <p className="text-surface-400 text-sm">No complaints yet</p>
                <Link to="/complaints" className="text-xs text-accent-500 hover:text-accent-600 font-medium mt-1 inline-block">Log your first complaint</Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Audits */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800">Recent Audits</h3>
            <Link to="/quality" className="text-accent-500 hover:text-accent-600 text-sm flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {(recentAudits || []).map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-3 bg-surface-50 rounded-lg border border-surface-200/50 hover:border-surface-200 transition-all duration-200 hover:shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{a.title}</p>
                  <p className="text-xs text-surface-400 capitalize">{a.type} audit</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusBadge(a.status)}
                  {a.score && (
                    <span className={`text-xs font-bold font-mono ${a.score >= 80 ? 'text-success-600' : a.score >= 60 ? 'text-warning-600' : 'text-danger-600'}`}>
                      {a.score}%
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(!recentAudits || recentAudits.length === 0) && (
              <div className="text-center py-6">
                <ClipboardCheck className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                <p className="text-surface-400 text-sm">No audits yet</p>
                <Link to="/quality" className="text-xs text-accent-500 hover:text-accent-600 font-medium mt-1 inline-block">Create your first audit</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <GuidedTour
        startTour={tourActive}
        onComplete={handleTourComplete}
        navigate={navigate}
      />
    </div>
  );
}

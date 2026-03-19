import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  MessageSquareWarning,
  Plus,
  Loader2,
  Bot,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  FileText,
  GitBranch,
  Globe,
  Package,
  ShieldAlert,
  Route,
  Copy,
  CheckCircle,
  Trash2,
  Info,
  CalendarDays,
  Download,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Toast, { ToastData } from '../components/ui/Toast';
import AIChat from '../components/AIChat';
import { statusBadge, priorityBadge } from '../components/ui/Badge';
import { EXPORT_COUNTRIES } from '../constants';
import { downloadCSV } from '../utils/csv';

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function priorityBorderColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical': return 'border-l-4 border-l-danger-500';
    case 'high': return 'border-l-4 border-l-amber-500';
    case 'medium': return 'border-l-4 border-l-blue-500';
    case 'low': return 'border-l-4 border-l-success-500';
    default: return 'border-l-4 border-l-surface-300';
  }
}

export default function Complaints() {
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rcaTarget, setRcaTarget] = useState<any>(null);
  const [letterTarget, setLetterTarget] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [notificationTarget, setNotificationTarget] = useState<any>(null);
  const [notificationAuthority, setNotificationAuthority] = useState('');
  const [notificationDraft, setNotificationDraft] = useState<any>(null);
  const [batchTraceTarget, setBatchTraceTarget] = useState<any>(null);
  const [batchTraceResult, setBatchTraceResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [createElapsed, setCreateElapsed] = useState(0);
  const clearToast = useCallback(() => setToast(null), []);
  const qc = useQueryClient();

  // Cmd+N shortcut to open Log Complaint modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowNew(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', filter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);
      return axios.get(`/api/complaints?${params}`).then((r) => r.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post('/api/complaints', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }); setShowNew(false); setToast({ message: 'Complaint logged with AI classification', type: 'success' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/complaints/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }); setToast({ message: 'Complaint deleted', type: 'success' }); },
    onError: () => { setToast({ message: 'Failed to delete complaint', type: 'error' }); },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axios.patch(`/api/complaints/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }); setToast({ message: 'Status updated', type: 'success' }); },
    onError: () => { setToast({ message: 'Failed to update status', type: 'error' }); },
  });

  // Elapsed time for create mutation
  useEffect(() => {
    if (createMutation.isPending) {
      const t = setInterval(() => setCreateElapsed(e => e + 1), 1000);
      return () => { clearInterval(t); setCreateElapsed(0); };
    }
    setCreateElapsed(0);
  }, [createMutation.isPending]);

  const [form, setForm] = useState({
    customerName: '', customerCountry: '', product: '',
    batchNumber: '', complaintDate: new Date().toISOString().split('T')[0], description: '',
  });

  const handleRCA = async (complaint: any) => {
    setLoadingAction(`rca-${complaint.id}`);
    try {
      await axios.post(`/api/complaints/${complaint.id}/rca`);
      qc.invalidateQueries({ queryKey: ['complaints'] });
      setRcaTarget(null);
    } catch (e) { setToast({ message: 'Failed to perform RCA', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const handleLetter = async () => {
    if (!letterTarget) return;
    setLoadingAction(`letter-${letterTarget.id}`);
    try {
      const { data } = await axios.post(`/api/complaints/${letterTarget.id}/response-letter`, { resolution });
      qc.invalidateQueries({ queryKey: ['complaints'] });
      setLetterTarget(null);
      setToast({ message: 'Response letter generated and saved! Check complaint details.', type: 'success' });
    } catch (e) { setToast({ message: 'Failed to generate letter', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const handleRegulatoryNotification = async (complaintId: string, authority: string) => {
    setLoadingAction(`notification-${complaintId}`);
    try {
      const { data } = await axios.post(`/api/complaints/${complaintId}/regulatory-notification`, { authority });
      setNotificationDraft(data);
    } catch (e) { setToast({ message: 'Failed to generate regulatory notification', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const handleBatchTrace = async (complaint: any) => {
    setBatchTraceTarget(complaint);
    setLoadingAction(`trace-${complaint.id}`);
    try {
      const { data } = await axios.get(`/api/complaints/${complaint.id}/batch-trace`);
      setBatchTraceResult(data);
    } catch (e) { setToast({ message: 'Batch trace failed', type: 'error' }); setBatchTraceTarget(null); }
    finally { setLoadingAction(null); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = complaints.filter((c: any) =>
    c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.product?.toLowerCase().includes(search.toLowerCase()) ||
    c.complaint_ref?.toLowerCase().includes(search.toLowerCase())
  );

  const countries = EXPORT_COUNTRIES;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Customer Complaints</h1>
          <p className="text-surface-500 text-sm mt-1">AI classification · Root cause analysis · Response drafting</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(complaints, 'complaints.csv', [
              { key: 'complaint_ref', label: 'Reference' },
              { key: 'customer_name', label: 'Customer' },
              { key: 'customer_country', label: 'Country' },
              { key: 'product', label: 'Product' },
              { key: 'category', label: 'Category' },
              { key: 'priority', label: 'Priority' },
              { key: 'status', label: 'Status' },
              { key: 'complaint_date', label: 'Date' },
            ])}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Log Complaint
          </button>
        </div>
      </div>

      {/* Sample Data Banner */}
      {complaints?.some((c: any) => c.customer_name?.includes('Metro Supermarkets')) && (
        <div className="flex items-center gap-2 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2 text-xs text-accent-600">
          <Info className="w-3.5 h-3.5" />
          Showing sample data. Create your own records to get started.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Complaint List */}
        <div className="lg:col-span-2 space-y-3" data-tour="complaint-list">
          {/* Search + Filter */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-surface-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search complaints..." className="input pl-9" />
            </div>
            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="input w-36">
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
            <select value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })} className="input w-36">
              <option value="">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4 space-y-3">
                  <div className="flex gap-2"><div className="skeleton h-4 w-24" /><div className="skeleton h-4 w-16" /></div>
                  <div className="skeleton h-5 w-48" />
                  <div className="skeleton h-3 w-64" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <MessageSquareWarning className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-surface-500 font-medium">No complaints found</p>
              <p className="text-surface-400 text-sm mt-1">Log your first complaint to get AI-powered classification and analysis.</p>
              <button onClick={() => setShowNew(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Log Complaint
              </button>
            </div>
          ) : (
            filtered.map((c: any) => {
              const aiAnalysis = c.ai_analysis ? JSON.parse(c.ai_analysis) : null;
              const rca = c.root_cause ? JSON.parse(c.root_cause) : null;
              const isExpanded = expandedId === c.id;

              return (
                <div key={c.id} className={`card card-hover-lift overflow-hidden ${priorityBorderColor(c.priority)}`}>
                  <div
                    className="p-4 cursor-pointer hover:bg-surface-50 transition-colors"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : c.id); } }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-surface-500">{c.complaint_ref}</span>
                          {priorityBadge(c.priority)}
                          {statusBadge(c.status)}
                          {c.category && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full capitalize border border-purple-200">{c.category}</span>
                          )}
                          {c.complaint_date && (
                            <span className="text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full flex items-center gap-1 border border-surface-200">
                              <CalendarDays className="w-3 h-3" />
                              {daysSince(c.complaint_date)}d ago
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-surface-800">{c.customer_name}</p>
                        <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{c.customer_country}</span>
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" />{c.product}</span>
                          {c.batch_number && <span className="font-mono">Batch: {c.batch_number}</span>}
                        </div>
                        <p className="text-sm text-surface-600 mt-1 line-clamp-2">{c.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-surface-400 font-mono">{c.complaint_date}</span>
                        {/* Quick Status Update */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={c.status}
                            onChange={(e) => statusUpdateMutation.mutate({ id: c.id, status: e.target.value })}
                            className="text-xs border border-surface-200 rounded-lg px-2 py-1 bg-white text-surface-600 focus:outline-none focus:border-accent-400 cursor-pointer"
                            aria-label="Update status"
                          >
                            <option value="open">Open</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                      </div>
                    </div>

                    {/* Actions */}
                    {!isExpanded && (
                      <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        {c.status !== 'resolved' && (
                          <>
                            <button
                              onClick={() => setRcaTarget(c)}
                              className="text-xs bg-danger-50 hover:bg-danger-100 text-danger-600 border border-danger-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <GitBranch className="w-3 h-3" /> RCA
                            </button>
                            <button
                              onClick={() => { setLetterTarget(c); setResolution(''); }}
                              className="text-xs bg-accent-50 hover:bg-accent-100 text-accent-600 border border-accent-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <FileText className="w-3 h-3" /> Response Letter
                            </button>
                          </>
                        )}
                        {aiAnalysis?.requiresRegulatorNotification && (
                          <button
                            onClick={() => { setNotificationTarget(c); setNotificationDraft(null); setNotificationAuthority(''); }}
                            className="text-xs bg-danger-50 hover:bg-danger-100 text-danger-600 border border-danger-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <ShieldAlert className="w-3 h-3" /> Regulatory Notification
                          </button>
                        )}
                        {c.batch_number && (
                          <button
                            onClick={() => handleBatchTrace(c)}
                            disabled={loadingAction === `trace-${c.id}`}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            {loadingAction === `trace-${c.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Route className="w-3 h-3" />} Trace Batch
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-surface-200/60 p-4 space-y-4 animate-fade-in">
                      {/* AI Analysis */}
                      {aiAnalysis && (
                        <div className="bg-danger-50 rounded-xl p-4 border border-danger-200">
                          <h4 className="text-sm font-semibold text-danger-700 mb-2 flex items-center gap-1">
                            <Bot className="w-4 h-4" /> AI Classification & Analysis
                          </h4>
                          <p className="text-sm text-surface-700 mb-2">{aiAnalysis.summary}</p>
                          {aiAnalysis.immediateActions?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-surface-700 mb-1">Immediate Actions:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                {aiAnalysis.immediateActions.map((a: string, i: number) => (
                                  <li key={i} className="text-xs text-surface-600">{a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {aiAnalysis.requiresRegulatorNotification && (
                            <div className="mt-2 bg-danger-100 rounded-lg p-2 text-xs text-danger-700 font-medium border border-danger-200">
                              Regulatory notification required: {aiAnalysis.regulatoryBodies?.join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* RCA */}
                      {rca && (
                        <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
                          <h4 className="text-sm font-semibold text-surface-800 mb-2">Root Cause Analysis</h4>
                          <p className="text-sm text-surface-700 font-medium mb-2">Most Likely: {rca.mostLikelyCause}</p>
                          {rca.fiveWhyAnalysis?.length > 0 && (
                            <div className="space-y-1">
                              {rca.fiveWhyAnalysis.map((w: string, i: number) => (
                                <p key={i} className="text-xs text-surface-600">{w}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Response Draft */}
                      {c.response_draft && (
                        <div className="bg-accent-50 rounded-xl p-4 border border-accent-200">
                          <h4 className="text-sm font-semibold text-accent-700 mb-2">Response Letter Draft</h4>
                          <pre className="text-xs text-surface-700 whitespace-pre-wrap font-sans line-clamp-6">{c.response_draft}</pre>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { if (confirm('Delete this complaint?')) deleteMutation.mutate(c.id); }}
                          className="text-sm bg-danger-50 hover:bg-danger-100 text-danger-600 border border-danger-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRcaTarget(c)}
                          disabled={loadingAction === `rca-${c.id}`}
                          className="btn-secondary text-sm flex items-center gap-1"
                        >
                          <GitBranch className="w-4 h-4" /> {rca ? 'Re-run RCA' : 'Root Cause Analysis'}
                        </button>
                        <button
                          onClick={() => { setLetterTarget(c); setResolution(c.resolution || ''); }}
                          className="btn-secondary text-sm flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" /> {c.response_draft ? 'Regenerate Letter' : 'Draft Response Letter'}
                        </button>
                        {aiAnalysis?.requiresRegulatorNotification && (
                          <button
                            onClick={() => { setNotificationTarget(c); setNotificationDraft(null); setNotificationAuthority(''); }}
                            className="text-sm bg-danger-50 hover:bg-danger-100 text-danger-600 border border-danger-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors font-medium"
                          >
                            <ShieldAlert className="w-4 h-4" /> Regulatory Notification
                          </button>
                        )}
                        {c.batch_number && (
                          <button
                            onClick={() => handleBatchTrace(c)}
                            disabled={loadingAction === `trace-${c.id}`}
                            className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors font-medium"
                          >
                            {loadingAction === `trace-${c.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />} Trace Batch
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* AI Chat */}
        <div className="h-[400px] lg:h-[600px]" data-tour="ai-chat">
          <AIChat agentType="complaints" placeholder="Ask ComplaintAI about complaint handling, root cause methods, regulatory requirements, response drafting..." />
        </div>
      </div>

      {/* New Complaint Modal */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Log New Complaint" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Customer Name *</label>
              <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required placeholder="e.g., Metro Supermarkets GmbH" />
            </div>
            <div>
              <label className="label">Country *</label>
              <select className="input" value={form.customerCountry} onChange={(e) => setForm({ ...form, customerCountry: e.target.value })} required>
                <option value="">Select country</option>
                {countries.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Product *</label>
              <input className="input" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required placeholder="e.g., Digestive Biscuits 200g" />
            </div>
            <div>
              <label className="label">Batch Number</label>
              <input className="input" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="e.g., B2024-0312-A" />
            </div>
            <div>
              <label className="label">Complaint Date *</label>
              <input type="date" className="input" value={form.complaintDate} onChange={(e) => setForm({ ...form, complaintDate: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Complaint Description *</label>
            <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Describe the complaint in detail..." />
            <p className="text-xs text-surface-400 mt-1">Be as specific as possible for better AI analysis</p>
          </div>
          <div className="bg-danger-50 rounded-lg p-3 text-sm text-danger-600 border border-danger-200">
            <Bot className="w-4 h-4 inline mr-1" />
            AI will automatically classify, prioritize, and suggest immediate actions
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> AI Analyzing... ({createElapsed}s)</> : 'Submit & Analyze'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RCA Confirmation */}
      <Modal isOpen={!!rcaTarget} onClose={() => setRcaTarget(null)} title="Root Cause Analysis" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-600">
            AI will perform a comprehensive Fishbone (Ishikawa) + 5-Why analysis for:
          </p>
          <div className="bg-surface-50 rounded-lg p-3 text-sm border border-surface-200">
            <p className="font-medium text-surface-800">{rcaTarget?.customer_name}</p>
            <p className="text-surface-500">{rcaTarget?.product} · {rcaTarget?.batch_number || 'No batch'}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRcaTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => handleRCA(rcaTarget)}
              disabled={loadingAction === `rca-${rcaTarget?.id}`}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loadingAction ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Bot className="w-4 h-4" /> Run Analysis</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Regulatory Notification Modal */}
      <Modal isOpen={!!notificationTarget} onClose={() => { setNotificationTarget(null); setNotificationDraft(null); setNotificationAuthority(''); }} title="Regulatory Notification" size="lg">
        <div className="space-y-4">
          {!notificationDraft ? (
            <>
              <div className="bg-danger-50 rounded-lg p-3 text-sm text-danger-700 border border-danger-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>This complaint requires regulatory notification. Select the authority to generate a draft notification.</span>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 border border-surface-200">
                <p className="font-medium text-sm text-surface-800">{notificationTarget?.customer_name}</p>
                <p className="text-xs text-surface-500">{notificationTarget?.product} · Batch: {notificationTarget?.batch_number || 'N/A'}</p>
              </div>
              <div>
                <label className="label">Select Regulatory Authority</label>
                <select
                  className="input"
                  value={notificationAuthority}
                  onChange={(e) => setNotificationAuthority(e.target.value)}
                >
                  <option value="">Select authority...</option>
                  {(notificationTarget?.ai_analysis ? JSON.parse(notificationTarget.ai_analysis).regulatoryBodies || [] : []).map((body: string, i: number) => (
                    <option key={i} value={body}>{body}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setNotificationTarget(null); setNotificationDraft(null); }} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => handleRegulatoryNotification(notificationTarget?.id, notificationAuthority)}
                  disabled={!notificationAuthority || loadingAction === `notification-${notificationTarget?.id}`}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 !bg-danger-500 hover:!bg-danger-600"
                >
                  {loadingAction === `notification-${notificationTarget?.id}` ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><ShieldAlert className="w-4 h-4" /> Generate Notification</>}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-surface-800">Draft Notification: {notificationAuthority}</h3>
                <button
                  onClick={() => copyToClipboard(notificationDraft.draft || notificationDraft.notification || JSON.stringify(notificationDraft, null, 2))}
                  className="text-sm bg-surface-100 hover:bg-surface-200 text-surface-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-surface-200"
                >
                  {copied ? <><CheckCircle className="w-4 h-4 text-success-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
              <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
                <pre className="text-sm text-surface-700 whitespace-pre-wrap font-sans">{notificationDraft.draft || notificationDraft.notification || JSON.stringify(notificationDraft, null, 2)}</pre>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setNotificationDraft(null)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => { setNotificationTarget(null); setNotificationDraft(null); }} className="btn-primary flex-1">Done</button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Batch Trace Modal */}
      <Modal isOpen={!!batchTraceTarget} onClose={() => { setBatchTraceTarget(null); setBatchTraceResult(null); }} title="Batch Traceability" size="xl">
        <div className="space-y-4">
          {loadingAction === `trace-${batchTraceTarget?.id}` ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-surface-500">Tracing batch through supply chain...</p>
            </div>
          ) : batchTraceResult ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {batchTraceResult.plant && (
                  <div className="bg-surface-50 rounded-lg p-3 border border-surface-200">
                    <p className="text-xs text-surface-500 font-medium">Plant</p>
                    <p className="text-sm font-semibold text-surface-800">{batchTraceResult.plant}</p>
                  </div>
                )}
                {batchTraceResult.productionDate && (
                  <div className="bg-surface-50 rounded-lg p-3 border border-surface-200">
                    <p className="text-xs text-surface-500 font-medium">Production Date</p>
                    <p className="text-sm font-semibold text-surface-800 font-mono">{batchTraceResult.productionDate}</p>
                  </div>
                )}
              </div>

              {/* Raw Materials */}
              {batchTraceResult.rawMaterials?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-surface-700 mb-2">Raw Materials</h4>
                  <div className="space-y-1">
                    {batchTraceResult.rawMaterials.map((mat: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm py-1.5 px-3 bg-surface-50 rounded-lg border border-surface-100">
                        <span className="text-surface-700">{mat.name || mat}</span>
                        {mat.supplier && <span className="text-xs text-surface-400">{mat.supplier}</span>}
                        {mat.batch && <span className="text-xs font-mono text-surface-500">{mat.batch}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Checks */}
              {batchTraceResult.qualityChecks?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-surface-700 mb-2">Quality Checks</h4>
                  <div className="space-y-1">
                    {batchTraceResult.qualityChecks.map((check: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 bg-surface-50 rounded-lg border border-surface-100">
                        <span className="text-surface-700">{check.name || check.check || check}</span>
                        {check.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            check.status === 'pass' || check.status === 'passed' ? 'bg-success-50 text-success-700 border border-success-200' :
                            check.status === 'fail' || check.status === 'failed' ? 'bg-danger-50 text-danger-600 border border-danger-200' :
                            'bg-warning-50 text-warning-600 border border-warning-100'
                          }`}>{check.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Process Timeline */}
              {batchTraceResult.processTimeline?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-surface-700 mb-2">Process Timeline</h4>
                  <div className="space-y-2 pl-3 border-l-2 border-surface-200">
                    {batchTraceResult.processTimeline.map((step: any, i: number) => (
                      <div key={i} className="relative pl-4">
                        <div className="absolute -left-[9px] top-1 w-3 h-3 rounded-full bg-accent-400 border-2 border-white" />
                        <p className="text-sm text-surface-800 font-medium">{step.stage || step.step || step}</p>
                        {step.timestamp && <p className="text-xs text-surface-400 font-mono">{step.timestamp}</p>}
                        {step.details && <p className="text-xs text-surface-500">{step.details}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipment */}
              {batchTraceResult.shipment && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">Shipment Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(batchTraceResult.shipment).map(([key, val]: [string, any]) => (
                      <div key={key}>
                        <span className="text-xs text-blue-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <p className="text-surface-800 font-mono text-xs">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {batchTraceResult.aiAnalysis && (
                <div className={`rounded-xl p-4 border ${
                  batchTraceResult.aiAnalysis.confidence === 'high' ? 'bg-danger-50 border-danger-200' :
                  'bg-warning-50 border-warning-100'
                }`}>
                  <h4 className="text-sm font-semibold text-surface-800 mb-2 flex items-center gap-1">
                    <Bot className="w-4 h-4" /> AI Analysis
                  </h4>
                  {batchTraceResult.aiAnalysis.suspectedStage && (
                    <p className="text-sm mb-1">
                      <span className="text-surface-600">Suspected Stage: </span>
                      <span className="font-semibold text-danger-600">{batchTraceResult.aiAnalysis.suspectedStage}</span>
                    </p>
                  )}
                  {batchTraceResult.aiAnalysis.confidence && (
                    <p className="text-sm mb-2">
                      <span className="text-surface-600">Confidence: </span>
                      <span className={`font-semibold font-mono ${
                        batchTraceResult.aiAnalysis.confidence === 'high' ? 'text-danger-600' : 'text-warning-600'
                      }`}>{batchTraceResult.aiAnalysis.confidence}</span>
                    </p>
                  )}
                  {batchTraceResult.aiAnalysis.recommendations?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-surface-700 mb-1">Recommendations:</p>
                      <ul className="space-y-0.5">
                        {batchTraceResult.aiAnalysis.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-xs text-surface-600 flex items-start gap-1">
                            <CheckCircle className="w-3 h-3 text-accent-500 mt-0.5 flex-shrink-0" />{rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => { setBatchTraceTarget(null); setBatchTraceResult(null); }} className="btn-primary w-full">Done</button>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Response Letter Modal */}
      <Modal isOpen={!!letterTarget} onClose={() => setLetterTarget(null)} title="Generate Response Letter" size="md">
        <div className="space-y-4">
          <p className="text-sm text-surface-600">Add resolution details before generating the letter:</p>
          <textarea
            className="input"
            rows={4}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Describe the actions taken and resolution..."
          />
          <div className="flex gap-3">
            <button onClick={() => setLetterTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleLetter}
              disabled={loadingAction === `letter-${letterTarget?.id}`}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loadingAction ? <><Loader2 className="w-4 h-4 animate-spin" /> Drafting...</> : <><Bot className="w-4 h-4" /> Generate Letter</>}
            </button>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onDismiss={clearToast} />
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ClipboardCheck,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Globe,
  Timer,
  Info,
  CalendarDays,
  FlaskConical,
  Download,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Toast, { ToastData } from '../components/ui/Toast';
import AIChat from '../components/AIChat';
import { statusBadge } from '../components/ui/Badge';
import { EXPORT_COUNTRIES } from '../constants';
import { downloadCSV } from '../utils/csv';

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Created today';
  if (days === 1) return 'Created yesterday';
  return `Created ${days} days ago`;
}

export default function QualityAudit() {
  const [showNew, setShowNew] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [findings, setFindings] = useState(['']);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCountryReqs, setShowCountryReqs] = useState(false);
  const [countryReqsForm, setCountryReqsForm] = useState({ country: '', productCategory: '' });
  const [countryReqsResult, setCountryReqsResult] = useState<any>(null);
  const [countryReqsLoading, setCountryReqsLoading] = useState(false);
  const [showShelfLife, setShowShelfLife] = useState(false);
  const [shelfLifeForm, setShelfLifeForm] = useState({ product: '', destinationCountry: '', shippingMode: 'Sea Freight', season: 'Summer', packagingType: 'Standard Carton' });
  const [shelfLifeResult, setShelfLifeResult] = useState<any>(null);
  const [shelfLifeLoading, setShelfLifeLoading] = useState(false);
  const [showContamination, setShowContamination] = useState(false);
  const [contaminationForm, setContaminationForm] = useState({ product: '', destinationCountry: '' });
  const [contaminationResult, setContaminationResult] = useState<any>(null);
  const [contaminationLoading, setContaminationLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const [createElapsed, setCreateElapsed] = useState(0);
  const [analyzeElapsed, setAnalyzeElapsed] = useState(0);
  const qc = useQueryClient();

  // Cmd+N shortcut to open New Audit modal
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

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits'],
    queryFn: () => axios.get('/api/quality').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post('/api/quality', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['audits'] }); setShowNew(false); setToast({ message: 'Audit created with AI checklist', type: 'success' }); },
  });

  const analyzeMutation = useMutation({
    mutationFn: ({ id, findings }: { id: string; findings: string[] }) =>
      axios.post(`/api/quality/${id}/analyze`, { findings }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['audits'] }); },
  });

  // Elapsed time for create mutation
  useEffect(() => {
    if (createMutation.isPending) {
      const t = setInterval(() => setCreateElapsed(e => e + 1), 1000);
      return () => { clearInterval(t); setCreateElapsed(0); };
    }
    setCreateElapsed(0);
  }, [createMutation.isPending]);

  // Elapsed time for analyze mutation
  useEffect(() => {
    if (!!analyzing) {
      const t = setInterval(() => setAnalyzeElapsed(e => e + 1), 1000);
      return () => { clearInterval(t); setAnalyzeElapsed(0); };
    }
    setAnalyzeElapsed(0);
  }, [analyzing]);

  const [form, setForm] = useState({ title: '', type: 'internal', product: '', supplier: '', location: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const handleAnalyze = async (audit: any) => {
    const validFindings = findings.filter((f) => f.trim());
    if (validFindings.length === 0) { setToast({ message: 'Add at least one finding', type: 'warning' }); return; }
    setAnalyzing(audit.id);
    await analyzeMutation.mutateAsync({ id: audit.id, findings: validFindings });
    setAnalyzing(null);
    setSelectedAudit(null);
    setFindings(['']);
  };

  const filtered = audits.filter((a: any) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase())
  );

  const auditTypes = [
    { value: 'internal', label: 'Internal GMP' },
    { value: 'supplier', label: 'Supplier Audit' },
    { value: 'regulatory', label: 'Regulatory/Export' },
    { value: 'customer', label: 'Customer Audit' },
    { value: 'haccp', label: 'HACCP Review' },
  ];

  const countries = EXPORT_COUNTRIES;

  const shippingModes = ['Sea Freight', 'Air Freight', 'Land Transport'];
  const seasons = ['Summer', 'Winter', 'Monsoon', 'Spring'];
  const packagingTypes = ['Standard Carton', 'Vacuum Sealed', 'Modified Atmosphere', 'Cold Chain'];

  const handleCountryReqs = async () => {
    setCountryReqsLoading(true);
    try {
      const { data } = await axios.post('/api/quality/country-requirements', countryReqsForm);
      setCountryReqsResult(data);
    } catch (e) { setToast({ message: 'Failed to fetch country requirements', type: 'error' }); }
    finally { setCountryReqsLoading(false); }
  };

  const handleContamination = async () => {
    setContaminationLoading(true);
    try {
      const { data } = await axios.post('/api/quality/contamination-risk', contaminationForm);
      setContaminationResult(data);
    } catch (e) { setToast({ message: 'Contamination risk assessment failed', type: 'error' }); }
    finally { setContaminationLoading(false); }
  };

  const handleShelfLife = async () => {
    setShelfLifeLoading(true);
    try {
      const { data } = await axios.post('/api/quality/shelf-life', shelfLifeForm);
      setShelfLifeResult(data);
    } catch (e) { setToast({ message: 'Failed to predict shelf life', type: 'error' }); }
    finally { setShelfLifeLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Quality Audits</h1>
          <p className="text-surface-500 text-sm mt-1">AI-generated checklists · CAPA management · Compliance tracking</p>
        </div>
        <div className="flex gap-2" data-tour="quality-ai-tools">
          <button onClick={() => { setShowContamination(true); setContaminationResult(null); setContaminationForm({ product: '', destinationCountry: '' }); }} className="btn-secondary flex items-center gap-2 text-danger-600 border-danger-200 hover:bg-danger-50">
            <FlaskConical className="w-4 h-4" /> Contamination Risks
          </button>
          <button onClick={() => { setShowCountryReqs(true); setCountryReqsResult(null); }} className="btn-secondary flex items-center gap-2">
            <Globe className="w-4 h-4" /> Country Requirements
          </button>
          <button onClick={() => { setShowShelfLife(true); setShelfLifeResult(null); }} className="btn-secondary flex items-center gap-2">
            <Timer className="w-4 h-4" /> Shelf-Life Predictor
          </button>
          <button
            onClick={() => downloadCSV(audits, 'quality-audits.csv', [
              { key: 'title', label: 'Title' },
              { key: 'type', label: 'Type' },
              { key: 'product', label: 'Product' },
              { key: 'supplier', label: 'Supplier' },
              { key: 'location', label: 'Location' },
              { key: 'status', label: 'Status' },
              { key: 'score', label: 'Score' },
              { key: 'created_at', label: 'Created At' },
            ])}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Audit
          </button>
        </div>
      </div>

      {/* Sample Data Banner */}
      {audits?.some((a: any) => a.title?.includes('Sunrise Packaging')) && (
        <div className="flex items-center gap-2 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2 text-xs text-accent-600">
          <Info className="w-3.5 h-3.5" />
          Showing sample data. Create your own records to get started.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Audit List */}
        <div className="lg:col-span-2 space-y-4" data-tour="audit-list">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audits..."
              className="input pl-9"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4 space-y-3">
                  <div className="flex gap-2"><div className="skeleton h-4 w-20" /><div className="skeleton h-4 w-16" /></div>
                  <div className="skeleton h-5 w-56" />
                  <div className="skeleton h-3 w-40" />
                  <div className="skeleton h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-surface-500 font-medium">No audits yet</p>
              <p className="text-surface-400 text-sm mt-1">Create your first AI-powered audit with auto-generated checklists.</p>
              <button onClick={() => setShowNew(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Audit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((audit: any) => {
                const checklist = audit.checklist ? JSON.parse(audit.checklist) : [];
                const findings = audit.findings ? JSON.parse(audit.findings) : [];
                const analysis = audit.ai_analysis && audit.status === 'completed' ? JSON.parse(audit.ai_analysis) : null;
                const isExpanded = expandedId === audit.id;

                const checklistTotal = checklist.length;
                const findingsCount = findings.length;
                const completionPct = checklistTotal > 0 ? Math.round((findingsCount / checklistTotal) * 100) : 0;

                return (
                  <div key={audit.id} className="card card-hover-lift overflow-hidden">
                    <div
                      className="p-4 cursor-pointer hover:bg-surface-50 transition-colors"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedId(isExpanded ? null : audit.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : audit.id); } }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-surface-500 capitalize bg-surface-100 px-2 py-0.5 rounded border border-surface-200">{audit.type}</span>
                            {statusBadge(audit.status)}
                            {audit.score && (
                              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                                audit.score >= 80 ? 'bg-success-50 text-success-700 border border-success-200' :
                                audit.score >= 60 ? 'bg-warning-50 text-warning-600 border border-warning-100' :
                                'bg-danger-50 text-danger-600 border border-danger-200'
                              }`}>
                                {audit.score}%
                              </span>
                            )}
                            {audit.created_at && (
                              <span className="text-xs text-surface-400 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {timeAgo(audit.created_at)}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-surface-800 truncate">{audit.title}</p>
                          <p className="text-xs text-surface-400 mt-0.5">
                            {[audit.product, audit.supplier, audit.location].filter(Boolean).join(' · ')}
                          </p>
                          {/* Checklist progress bar */}
                          {checklistTotal > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-surface-500 mb-1">
                                <span>Checklist: {findingsCount} of {checklistTotal} items reviewed</span>
                                <span className="font-mono">{completionPct}%</span>
                              </div>
                              <div className="w-full bg-surface-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    audit.status === 'completed' ? 'bg-success-500' : 'bg-accent-400'
                                  }`}
                                  style={{ width: `${audit.status === 'completed' ? 100 : Math.min(completionPct, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          {audit.status !== 'completed' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedAudit(audit); setFindings(['']); }}
                              className="text-xs bg-success-50 hover:bg-success-100 text-success-700 border border-success-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Bot className="w-3 h-3" /> Analyze
                            </button>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-surface-200/60 p-4 space-y-4 animate-fade-in">
                        {/* Checklist */}
                        {checklist.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-surface-700 mb-2 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-success-500" /> AI Checklist ({checklist.length} items)
                            </h4>
                            <div className="grid grid-cols-2 gap-1">
                              {checklist.slice(0, 10).map((item: string, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-xs text-surface-600">
                                  <div className="w-1 h-1 rounded-full bg-accent-400 mt-1.5 flex-shrink-0" />
                                  {item}
                                </div>
                              ))}
                              {checklist.length > 10 && (
                                <span className="text-xs text-surface-400 col-span-2">+{checklist.length - 10} more items</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* AI Analysis */}
                        {analysis && (
                          <div className="bg-success-50 rounded-xl p-4 border border-success-200">
                            <h4 className="text-sm font-semibold text-success-700 mb-2 flex items-center gap-1">
                              <Bot className="w-4 h-4" /> AI Analysis
                            </h4>
                            <p className="text-sm text-surface-700 mb-3">{analysis.summary}</p>
                            {analysis.correctiveActions?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-surface-700 mb-1">Corrective Actions:</p>
                                <div className="space-y-1">
                                  {analysis.correctiveActions.slice(0, 3).map((ca: any, i: number) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-surface-600">
                                      <AlertTriangle className="w-3 h-3 text-accent-500 mt-0.5 flex-shrink-0" />
                                      <span>{ca.action} <span className="text-accent-600 font-mono">({ca.deadline})</span></span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: AI Chat */}
        <div className="h-[400px] lg:h-[600px]">
          <AIChat agentType="quality" placeholder="Ask QualityAI about audit procedures, GMP compliance, HACCP, corrective actions, export quality standards..." />
        </div>
      </div>

      {/* New Audit Modal */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Create New Audit" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Audit Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g., Q2 Supplier Audit - Packaging Vendor" />
          </div>
          <div>
            <label className="label">Audit Type *</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {auditTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Product / Process</label>
            <input className="input" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="e.g., Biscuit Manufacturing Line 2" />
          </div>
          <div>
            <label className="label">Supplier (if applicable)</label>
            <input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="e.g., ABC Packaging Ltd" />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Pune Plant" />
          </div>
          <div className="bg-accent-50 rounded-lg p-3 text-sm text-accent-700 border border-accent-200">
            <Bot className="w-4 h-4 inline mr-1" />
            AI will automatically generate a tailored checklist with 20-30 inspection points
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Checklist... ({createElapsed}s)</> : 'Create with AI Checklist'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Country Requirements Modal */}
      <Modal isOpen={showCountryReqs} onClose={() => { setShowCountryReqs(false); setCountryReqsResult(null); }} title="Country Import Requirements" size="xl">
        {!countryReqsResult ? (
          <div className="space-y-4">
            <p className="text-sm text-surface-600">Generate comprehensive import requirements for any destination market.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Destination Country *</label>
                <select className="input" value={countryReqsForm.country} onChange={(e) => setCountryReqsForm({ ...countryReqsForm, country: e.target.value })}>
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Product Category *</label>
                <input className="input" value={countryReqsForm.productCategory} onChange={(e) => setCountryReqsForm({ ...countryReqsForm, productCategory: e.target.value })} placeholder="e.g., Biscuits, Snack Foods, Dairy Products" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCountryReqs(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleCountryReqs}
                disabled={!countryReqsForm.country || !countryReqsForm.productCategory || countryReqsLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {countryReqsLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Bot className="w-4 h-4" /> Generate Requirements</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center sticky top-0 bg-white pb-2">
              <h3 className="font-semibold text-surface-800">{countryReqsForm.country} - {countryReqsForm.productCategory}</h3>
              <button onClick={() => setCountryReqsResult(null)} className="text-sm text-accent-500 hover:text-accent-600 font-medium">Back</button>
            </div>

            {countryReqsResult.regulatoryBody && (
              <div className="bg-accent-50 rounded-xl p-4 border border-accent-200">
                <h4 className="text-sm font-semibold text-accent-700 mb-1">Regulatory Body</h4>
                <p className="text-sm text-surface-700">{countryReqsResult.regulatoryBody}</p>
              </div>
            )}

            {countryReqsResult.importStandards?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Import Standards</h4>
                <div className="space-y-1">
                  {countryReqsResult.importStandards.map((std: any, i: number) => (
                    <div key={i} className="bg-surface-50 rounded-lg p-3 border border-surface-100 text-sm text-surface-700">
                      {typeof std === 'string' ? std : <><span className="font-medium">{std.name}</span>{std.description && <span className="text-surface-500"> - {std.description}</span>}</>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {countryReqsResult.labelingRequirements?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-700 mb-2">Labeling Requirements</h4>
                <ul className="space-y-1">
                  {countryReqsResult.labelingRequirements.map((req: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />{typeof req === 'string' ? req : req.requirement || req.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {countryReqsResult.certifications?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-accent-600 mb-2">Required Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {countryReqsResult.certifications.map((cert: any, i: number) => (
                    <span key={i} className="bg-accent-50 text-accent-700 text-xs px-2 py-1 rounded-lg border border-accent-200 font-mono">
                      {typeof cert === 'string' ? cert : cert.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {countryReqsResult.testingRequirements?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Testing Requirements</h4>
                <div className="space-y-1">
                  {countryReqsResult.testingRequirements.map((test: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />{typeof test === 'string' ? test : test.name || test.test}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {countryReqsResult.restrictedIngredients?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-danger-600 mb-2">Restricted Ingredients</h4>
                <div className="flex flex-wrap gap-2">
                  {countryReqsResult.restrictedIngredients.map((ing: any, i: number) => (
                    <span key={i} className="bg-danger-50 text-danger-600 text-xs px-2 py-1 rounded-lg border border-danger-200">
                      {typeof ing === 'string' ? ing : ing.name || ing.ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {countryReqsResult.packagingRequirements && (
              <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
                <h4 className="text-sm font-semibold text-surface-700 mb-1">Packaging Requirements</h4>
                <p className="text-sm text-surface-600">{typeof countryReqsResult.packagingRequirements === 'string' ? countryReqsResult.packagingRequirements : JSON.stringify(countryReqsResult.packagingRequirements)}</p>
              </div>
            )}

            {countryReqsResult.shelfLifeRules && (
              <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
                <h4 className="text-sm font-semibold text-surface-700 mb-1 flex items-center gap-1"><Clock className="w-4 h-4" /> Shelf-Life Rules</h4>
                <p className="text-sm text-surface-600">{typeof countryReqsResult.shelfLifeRules === 'string' ? countryReqsResult.shelfLifeRules : JSON.stringify(countryReqsResult.shelfLifeRules)}</p>
              </div>
            )}

            <button onClick={() => setShowCountryReqs(false)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      {/* Shelf-Life Predictor Modal */}
      <Modal isOpen={showShelfLife} onClose={() => { setShowShelfLife(false); setShelfLifeResult(null); }} title="Export Shelf-Life Predictor" size="xl">
        {!shelfLifeResult ? (
          <div className="space-y-4">
            <p className="text-sm text-surface-600">Predict shelf-life impact based on export route and conditions.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Product Name *</label>
                <input className="input" value={shelfLifeForm.product} onChange={(e) => setShelfLifeForm({ ...shelfLifeForm, product: e.target.value })} placeholder="e.g., Digestive Biscuits 200g" />
              </div>
              <div>
                <label className="label">Destination Country *</label>
                <select className="input" value={shelfLifeForm.destinationCountry} onChange={(e) => setShelfLifeForm({ ...shelfLifeForm, destinationCountry: e.target.value })}>
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Shipping Mode</label>
                <select className="input" value={shelfLifeForm.shippingMode} onChange={(e) => setShelfLifeForm({ ...shelfLifeForm, shippingMode: e.target.value })}>
                  {shippingModes.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Season</label>
                <select className="input" value={shelfLifeForm.season} onChange={(e) => setShelfLifeForm({ ...shelfLifeForm, season: e.target.value })}>
                  {seasons.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Packaging Type</label>
                <select className="input" value={shelfLifeForm.packagingType} onChange={(e) => setShelfLifeForm({ ...shelfLifeForm, packagingType: e.target.value })}>
                  {packagingTypes.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowShelfLife(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleShelfLife}
                disabled={!shelfLifeForm.product || !shelfLifeForm.destinationCountry || shelfLifeLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {shelfLifeLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Predicting...</> : <><Bot className="w-4 h-4" /> Predict Shelf-Life</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-surface-800">{shelfLifeForm.product} → {shelfLifeForm.destinationCountry}</h3>
              <button onClick={() => setShelfLifeResult(null)} className="text-sm text-accent-500 hover:text-accent-600 font-medium">Back</button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              {shelfLifeResult.declaredShelfLife && (
                <div className="bg-surface-50 rounded-xl p-4 border border-surface-200 text-center">
                  <p className="text-xs text-surface-500 font-medium">Declared Shelf Life</p>
                  <p className="text-lg font-bold font-mono text-surface-800 mt-1">{shelfLifeResult.declaredShelfLife}</p>
                </div>
              )}
              {shelfLifeResult.transitEstimate && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                  <p className="text-xs text-blue-500 font-medium">Transit Estimate</p>
                  <p className="text-lg font-bold font-mono text-blue-700 mt-1">{shelfLifeResult.transitEstimate}</p>
                </div>
              )}
              {shelfLifeResult.remainingAtArrival && (
                <div className="bg-accent-50 rounded-xl p-4 border border-accent-200 text-center">
                  <p className="text-xs text-accent-500 font-medium">Remaining at Arrival</p>
                  <p className="text-lg font-bold font-mono text-accent-700 mt-1">{shelfLifeResult.remainingAtArrival}</p>
                </div>
              )}
            </div>

            {/* Risk Level */}
            {shelfLifeResult.riskLevel && (
              <div className={`rounded-xl p-4 border text-center ${
                shelfLifeResult.riskLevel === 'Low' || shelfLifeResult.riskLevel === 'low' ? 'bg-success-50 border-success-200' :
                shelfLifeResult.riskLevel === 'Medium' || shelfLifeResult.riskLevel === 'medium' ? 'bg-warning-50 border-warning-100' :
                'bg-danger-50 border-danger-200'
              }`}>
                <p className="text-xs font-medium uppercase tracking-wide text-surface-500">Risk Level</p>
                <p className={`text-xl font-bold mt-1 ${
                  shelfLifeResult.riskLevel === 'Low' || shelfLifeResult.riskLevel === 'low' ? 'text-success-700' :
                  shelfLifeResult.riskLevel === 'Medium' || shelfLifeResult.riskLevel === 'medium' ? 'text-warning-600' :
                  'text-danger-600'
                }`}>{shelfLifeResult.riskLevel}</p>
              </div>
            )}

            {/* Risk Factors */}
            {shelfLifeResult.riskFactors?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Risk Factors</h4>
                <ul className="space-y-1">
                  {shelfLifeResult.riskFactors.map((factor: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />{factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Temperature Exposure */}
            {shelfLifeResult.temperatureExposure && (
              <div className="bg-surface-50 rounded-lg p-3 border border-surface-200">
                <h4 className="text-sm font-semibold text-surface-700 mb-1">Temperature Exposure</h4>
                <p className="text-sm text-surface-600">{typeof shelfLifeResult.temperatureExposure === 'string' ? shelfLifeResult.temperatureExposure : JSON.stringify(shelfLifeResult.temperatureExposure)}</p>
              </div>
            )}

            {/* Recommendations */}
            {shelfLifeResult.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {shelfLifeResult.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />{rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Packaging Upgrades */}
            {shelfLifeResult.packagingUpgrades?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-accent-600 mb-2">Suggested Packaging Upgrades</h4>
                <div className="flex flex-wrap gap-2">
                  {shelfLifeResult.packagingUpgrades.map((upgrade: any, i: number) => (
                    <span key={i} className="bg-accent-50 text-accent-700 text-xs px-2 py-1 rounded-lg border border-accent-200">
                      {typeof upgrade === 'string' ? upgrade : upgrade.name || upgrade.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setShowShelfLife(false)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      {/* Contamination Risk Modal */}
      <Modal isOpen={showContamination} onClose={() => { setShowContamination(false); setContaminationResult(null); }} title="Contamination Risk Assessment" size="xl">
        {!contaminationResult ? (
          <div className="space-y-4">
            <p className="text-sm text-surface-600">Assess contamination risks for your product in the destination market.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Product *</label>
                <input className="input" value={contaminationForm.product} onChange={(e) => setContaminationForm({ ...contaminationForm, product: e.target.value })} placeholder="e.g., Ground Spices, Basmati Rice, Sesame Seeds" />
              </div>
              <div>
                <label className="label">Destination Country *</label>
                <select className="input" value={contaminationForm.destinationCountry} onChange={(e) => setContaminationForm({ ...contaminationForm, destinationCountry: e.target.value })}>
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowContamination(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleContamination}
                disabled={!contaminationForm.product || !contaminationForm.destinationCountry || contaminationLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {contaminationLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Bot className="w-4 h-4" /> Generate Assessment</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center sticky top-0 bg-white pb-2">
              <h3 className="font-semibold text-surface-800">{contaminationForm.product} → {contaminationForm.destinationCountry}</h3>
              <button onClick={() => setContaminationResult(null)} className="text-sm text-accent-500 hover:text-accent-600 font-medium">Back</button>
            </div>

            {/* Risk Level */}
            {contaminationResult.riskLevel && (
              <div className={`rounded-xl p-4 border text-center ${
                contaminationResult.riskLevel === 'critical' || contaminationResult.riskLevel === 'Critical' ? 'bg-danger-50 border-danger-200' :
                contaminationResult.riskLevel === 'high' || contaminationResult.riskLevel === 'High' ? 'bg-warning-50 border-warning-100' :
                contaminationResult.riskLevel === 'medium' || contaminationResult.riskLevel === 'Medium' ? 'bg-blue-50 border-blue-200' :
                'bg-success-50 border-success-200'
              }`}>
                <p className="text-xs font-medium uppercase tracking-wide text-surface-500">Risk Level</p>
                <p className={`text-2xl font-bold mt-1 ${
                  contaminationResult.riskLevel === 'critical' || contaminationResult.riskLevel === 'Critical' ? 'text-danger-600' :
                  contaminationResult.riskLevel === 'high' || contaminationResult.riskLevel === 'High' ? 'text-warning-600' :
                  contaminationResult.riskLevel === 'medium' || contaminationResult.riskLevel === 'Medium' ? 'text-blue-600' :
                  'text-success-700'
                }`}>{contaminationResult.riskLevel}</p>
              </div>
            )}

            {/* Common Contaminants Table */}
            {(contaminationResult.contaminants || contaminationResult.commonContaminants || []).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Common Contaminants</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-surface-500 border-b border-surface-200">
                        <th className="text-left py-1.5 pr-3">Contaminant</th>
                        <th className="text-left py-1.5 pr-3">Limit</th>
                        <th className="text-left py-1.5 pr-3">Test Method</th>
                        <th className="text-left py-1.5">Historical Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(contaminationResult.contaminants || contaminationResult.commonContaminants || []).map((c: any, i: number) => (
                        <tr key={i} className="border-b border-surface-100 last:border-0">
                          <td className="py-1.5 pr-3 font-medium text-surface-700">{c.name || c.contaminant}</td>
                          <td className="py-1.5 pr-3 font-mono text-surface-600 text-xs">{c.limit || c.maxLimit || '-'}</td>
                          <td className="py-1.5 pr-3 text-surface-600 text-xs">{c.testMethod || c.test_method || '-'}</td>
                          <td className="py-1.5 text-surface-500 text-xs">{c.historicalIssues || c.historical_issues || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Testing Recommendations */}
            {(contaminationResult.testingRecommendations || contaminationResult.testingChecklist || []).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Testing Recommendations</h4>
                <ul className="space-y-1">
                  {(contaminationResult.testingRecommendations || contaminationResult.testingChecklist || []).map((test: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <CheckCircle2 className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" />
                      {typeof test === 'string' ? test : test.name || test.test}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rejection History */}
            {contaminationResult.rejectionHistory && (
              <div className="bg-danger-50 rounded-xl p-4 border border-danger-200">
                <h4 className="text-sm font-semibold text-danger-700 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Rejection History
                </h4>
                <p className="text-sm text-surface-700">{typeof contaminationResult.rejectionHistory === 'string' ? contaminationResult.rejectionHistory : JSON.stringify(contaminationResult.rejectionHistory)}</p>
              </div>
            )}

            {/* Recommendations */}
            {contaminationResult.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {contaminationResult.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />{rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={() => setShowContamination(false)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      {/* Analyze Modal */}
      <Modal isOpen={!!selectedAudit} onClose={() => setSelectedAudit(null)} title={`Analyze: ${selectedAudit?.title}`} size="lg">
        <div className="space-y-4">
          <p className="text-sm text-surface-600">Enter your audit findings/non-conformances. AI will analyze and generate a CAPA plan.</p>
          {findings.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input"
                value={f}
                onChange={(e) => { const n = [...findings]; n[i] = e.target.value; setFindings(n); }}
                placeholder={`Finding ${i + 1}...`}
              />
              {findings.length > 1 && (
                <button onClick={() => setFindings(findings.filter((_, j) => j !== i))} className="text-danger-400 hover:text-danger-600 transition-colors">✕</button>
              )}
            </div>
          ))}
          <button onClick={() => setFindings([...findings, ''])} className="text-sm text-accent-500 hover:text-accent-600 font-medium">+ Add Finding</button>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setSelectedAudit(null)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => handleAnalyze(selectedAudit)}
              disabled={!!analyzing}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> AI Analyzing... ({analyzeElapsed}s)</> : <><Bot className="w-4 h-4" /> Generate CAPA Report</>}
            </button>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onDismiss={clearToast} />
    </div>
  );
}

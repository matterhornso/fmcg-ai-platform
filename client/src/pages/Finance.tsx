import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  DollarSign,
  Plus,
  Loader2,
  Bot,
  ChevronDown,
  ChevronUp,
  Search,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  List,
  TrendingUp,
  Globe,
  Tag,
  Coins,
  Trash2,
  Info,
  Scale,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Toast, { ToastData } from '../components/ui/Toast';
import AIChat from '../components/AIChat';
import { statusBadge } from '../components/ui/Badge';
import { EXPORT_COUNTRIES, CURRENCIES, INCOTERMS, PAYMENT_TERMS } from '../constants';

export default function Finance() {
  const [showNew, setShowNew] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [checklistResult, setChecklistResult] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [hsResults, setHsResults] = useState<Record<string, any>>({});
  const [incentivesResult, setIncentivesResult] = useState<any>(null);
  const [showIncentivesModal, setShowIncentivesModal] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const [riskResult, setRiskResult] = useState<any>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [ftaResult, setFtaResult] = useState<any>(null);
  const [showFtaModal, setShowFtaModal] = useState(false);
  const qc = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => axios.get('/api/finance').then((r) => r.data),
  });

  const [form, setForm] = useState({
    invoiceNumber: '', customerName: '', destinationCountry: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    currency: 'USD', paymentTerms: 'NET 30', incoterms: 'FOB',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
  });

  const [checklistForm, setChecklistForm] = useState({
    destinationCountry: '', productType: 'FMCG Food Products', paymentTerms: 'NET 30', incoterms: 'FOB',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post('/api/finance', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setShowNew(false); setToast({ message: 'Invoice created successfully', type: 'success' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/finance/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setToast({ message: 'Invoice deleted', type: 'success' }); },
    onError: () => { setToast({ message: 'Failed to delete invoice', type: 'error' }); },
  });

  const handleValidate = async (id: string) => {
    setLoadingAction(`validate-${id}`);
    try {
      await axios.post(`/api/finance/${id}/validate`);
      qc.invalidateQueries({ queryKey: ['invoices'] });
    } catch (e) { setToast({ message: 'Validation failed', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const handleRisk = async (id: string) => {
    setLoadingAction(`risk-${id}`);
    try {
      const { data } = await axios.post(`/api/finance/${id}/risk-analysis`);
      setRiskResult(data);
      setShowRiskModal(true);
    } catch (e) { setToast({ message: 'Risk analysis failed', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const handleGenerateChecklist = async () => {
    setLoadingAction('checklist');
    try {
      const { data } = await axios.post('/api/finance/checklist', checklistForm);
      setChecklistResult(data);
    } catch (e) { setToast({ message: 'Failed to generate checklist', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const handleHsClassify = async (id: string) => {
    setLoadingAction(`hs-${id}`);
    try {
      const { data } = await axios.post(`/api/finance/${id}/hs-classify`);
      setHsResults((prev) => ({ ...prev, [id]: data }));
    } catch (e) { setToast({ message: 'HS Classification failed', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const handleFtaBenefits = async (id: string) => {
    setLoadingAction(`fta-${id}`);
    try {
      const { data } = await axios.post(`/api/finance/${id}/fta-benefits`);
      setFtaResult(data);
      setShowFtaModal(true);
    } catch (e) { setToast({ message: 'FTA benefits analysis failed', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const handleIncentives = async (id: string) => {
    setLoadingAction(`incentives-${id}`);
    try {
      const { data } = await axios.post(`/api/finance/${id}/incentives`);
      setIncentivesResult(data);
      setShowIncentivesModal(true);
    } catch (e) { setToast({ message: 'Incentives analysis failed', type: 'error' }); }
    finally { setLoadingAction(null); }
  };

  const updateItem = (i: number, field: string, value: any) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      items[i].total = items[i].quantity * items[i].unitPrice;
    }
    setForm({ ...form, items });
  };

  const totalAmount = form.items.reduce((s, i) => s + i.total, 0);
  const filtered = invoices.filter((inv: any) =>
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.destination_country?.toLowerCase().includes(search.toLowerCase())
  );

  const countries = EXPORT_COUNTRIES;

  const incotermsOptions = INCOTERMS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Finance & Export</h1>
          <p className="text-surface-500 text-sm mt-1">Invoice compliance · Export documentation · Risk analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowChecklist(true)} className="btn-secondary flex items-center gap-2">
            <List className="w-4 h-4" /> Document Checklist
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Sample Data Banner */}
      {invoices?.some((inv: any) => inv.customer_name?.includes('Tesco')) && (
        <div className="flex items-center gap-2 bg-accent-50 border border-accent-200 rounded-lg px-3 py-2 text-xs text-accent-600">
          <Info className="w-3.5 h-3.5" />
          Showing sample data. Create your own records to get started.
        </div>
      )}

      {/* Invoice Totals Summary */}
      {!isLoading && filtered.length > 0 && (() => {
        const totalValue = filtered.reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
        const pendingCount = filtered.filter((inv: any) => inv.status === 'pending' || inv.status === 'draft').length;
        const approvedCount = filtered.filter((inv: any) => inv.status === 'approved' || inv.status === 'validated').length;
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="card card-hover-lift p-4 text-center">
              <p className="text-xs text-surface-500 font-medium">Total Value</p>
              <p className="text-xl font-bold font-mono text-surface-800 mt-1">
                ${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}K` : totalValue.toLocaleString()}
              </p>
            </div>
            <div className="card card-hover-lift p-4 text-center">
              <p className="text-xs text-surface-500 font-medium">Pending</p>
              <p className="text-xl font-bold font-mono text-accent-600 mt-1">{pendingCount}</p>
            </div>
            <div className="card card-hover-lift p-4 text-center">
              <p className="text-xs text-surface-500 font-medium">Approved</p>
              <p className="text-xl font-bold font-mono text-success-600 mt-1">{approvedCount}</p>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Invoice List */}
        <div className="lg:col-span-2 space-y-3" data-tour="invoice-list">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-surface-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="input pl-9" />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4 space-y-3">
                  <div className="flex gap-2"><div className="skeleton h-4 w-28" /><div className="skeleton h-4 w-16" /></div>
                  <div className="skeleton h-5 w-48" />
                  <div className="skeleton h-3 w-64" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <DollarSign className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-surface-500 font-medium">No invoices yet</p>
              <p className="text-surface-400 text-sm mt-1">Create your first export invoice for AI-powered compliance validation.</p>
              <button onClick={() => setShowNew(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Invoice
              </button>
            </div>
          ) : (
            filtered.map((inv: any) => {
              const items = inv.items ? JSON.parse(inv.items) : [];
              const compliance = inv.compliance_check ? JSON.parse(inv.compliance_check) : null;
              const isExpanded = expandedId === inv.id;

              return (
                <div key={inv.id} className="card card-hover-lift overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-surface-50 transition-colors"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : inv.id); } }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono font-semibold text-accent-600">{inv.invoice_number}</span>
                          {statusBadge(inv.status)}
                          {/* Compliance status icon on collapsed card */}
                          {compliance && !isExpanded && (
                            <span title={compliance.complianceStatus === 'compliant' ? 'Compliant' : compliance.complianceStatus === 'issues_found' ? 'Issues Found' : 'Review Needed'}>
                              {compliance.complianceStatus === 'compliant' ? (
                                <CheckCircle className="w-4 h-4 text-success-500" />
                              ) : compliance.complianceStatus === 'issues_found' ? (
                                <AlertTriangle className="w-4 h-4 text-danger-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-warning-500" />
                              )}
                            </span>
                          )}
                          {compliance && isExpanded && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                              compliance.complianceStatus === 'compliant' ? 'bg-success-50 text-success-700 border-success-200' :
                              compliance.complianceStatus === 'issues_found' ? 'bg-danger-50 text-danger-600 border-danger-200' :
                              'bg-warning-50 text-warning-600 border-warning-100'
                            }`}>
                              {compliance.complianceStatus === 'compliant' ? 'Compliant' :
                               compliance.complianceStatus === 'issues_found' ? 'Issues Found' : 'Review'}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-surface-800">{inv.customer_name}</p>
                        <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{inv.destination_country}</span>
                          <span className="font-mono">{inv.incoterms}</span>
                          <span>{inv.payment_terms}</span>
                          <span className="font-mono">{inv.invoice_date}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-surface-800 font-mono flex items-center gap-1">
                          <span className="text-xs text-surface-400 font-sans">{inv.currency === 'USD' ? '$' : inv.currency === 'GBP' ? '\u00A3' : inv.currency === 'EUR' ? '\u20AC' : inv.currency === 'INR' ? '\u20B9' : ''}</span>
                          {inv.currency} {inv.total_amount?.toLocaleString()}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                      </div>
                    </div>
                    {!isExpanded && (
                      <div className="flex gap-2 mt-2" data-tour="invoice-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleValidate(inv.id)}
                          disabled={loadingAction === `validate-${inv.id}`}
                          className="text-xs bg-success-50 hover:bg-success-100 text-success-700 border border-success-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {loadingAction === `validate-${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />} Validate
                        </button>
                        <button
                          onClick={() => handleRisk(inv.id)}
                          disabled={loadingAction === `risk-${inv.id}`}
                          className="text-xs bg-accent-50 hover:bg-accent-100 text-accent-600 border border-accent-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {loadingAction === `risk-${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />} Risk Analysis
                        </button>
                        <button
                          onClick={() => handleHsClassify(inv.id)}
                          disabled={loadingAction === `hs-${inv.id}`}
                          className="text-xs bg-accent-50 hover:bg-accent-100 text-accent-600 border border-accent-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {loadingAction === `hs-${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />} HS Classify
                        </button>
                        <button
                          onClick={() => handleIncentives(inv.id)}
                          disabled={loadingAction === `incentives-${inv.id}`}
                          className="text-xs bg-success-50 hover:bg-success-100 text-success-700 border border-success-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {loadingAction === `incentives-${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Coins className="w-3 h-3" />} Export Incentives
                        </button>
                        <button
                          onClick={() => handleFtaBenefits(inv.id)}
                          disabled={loadingAction === `fta-${inv.id}`}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {loadingAction === `fta-${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scale className="w-3 h-3" />} FTA Benefits
                        </button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-surface-200/60 p-4 space-y-4 animate-fade-in">
                      {/* Items */}
                      <div>
                        <h4 className="text-sm font-semibold text-surface-700 mb-2">Line Items</h4>
                        <div className="space-y-1">
                          {items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm py-1 border-b border-surface-100">
                              <span className="text-surface-700 flex-1">{item.description}</span>
                              <span className="text-surface-400 mx-4 font-mono">{item.quantity} units</span>
                              <span className="font-medium font-mono text-surface-800">{inv.currency} {item.total?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Compliance */}
                      {compliance && (
                        <div className={`rounded-xl p-4 border ${
                          compliance.complianceStatus === 'compliant' ? 'bg-success-50 border-success-200' :
                          compliance.complianceStatus === 'issues_found' ? 'bg-danger-50 border-danger-200' : 'bg-warning-50 border-warning-100'
                        }`}>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-surface-800">
                            <Bot className="w-4 h-4" /> Compliance Analysis
                          </h4>
                          <p className="text-sm text-surface-700 mb-3">{compliance.summary}</p>
                          {compliance.issues?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold mb-1 text-surface-700">Issues:</p>
                              <ul className="space-y-0.5">
                                {compliance.issues.map((issue: string, i: number) => (
                                  <li key={i} className="text-xs flex items-start gap-1 text-surface-600">
                                    <AlertTriangle className="w-3 h-3 text-accent-500 mt-0.5" />{issue}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {compliance.requiredDocuments?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-1 text-surface-700">Required Documents:</p>
                              <div className="flex flex-wrap gap-1">
                                {compliance.requiredDocuments.map((doc: string, i: number) => (
                                  <span key={i} className="text-xs bg-white border border-surface-200 px-2 py-0.5 rounded font-mono">{doc}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* HS Classification Results */}
                      {hsResults[inv.id] && (
                        <div className="bg-accent-50 rounded-xl p-4 border border-accent-200">
                          <h4 className="text-sm font-semibold text-accent-700 mb-2 flex items-center gap-1">
                            <Tag className="w-4 h-4" /> HS Code Classification
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-surface-500 border-b border-accent-200">
                                  <th className="text-left py-1.5 pr-3">Item</th>
                                  <th className="text-left py-1.5 pr-3">HS Code</th>
                                  <th className="text-left py-1.5 pr-3">Description</th>
                                  <th className="text-right py-1.5">Duty Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(hsResults[inv.id].items || hsResults[inv.id].classifications || []).map((item: any, i: number) => (
                                  <tr key={i} className="border-b border-accent-100 last:border-0">
                                    <td className="py-1.5 pr-3 text-surface-700">{item.description || item.item}</td>
                                    <td className="py-1.5 pr-3 font-mono font-semibold text-accent-600">{item.hsCode || item.hs_code}</td>
                                    <td className="py-1.5 pr-3 text-surface-600 text-xs">{item.hsDescription || item.hs_description}</td>
                                    <td className="py-1.5 text-right font-mono text-surface-700">{item.dutyRate || item.duty_rate}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {hsResults[inv.id].notes && (
                            <p className="text-xs text-surface-500 mt-2">{hsResults[inv.id].notes}</p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { if (confirm('Delete this invoice?')) deleteMutation.mutate(inv.id); }}
                          className="text-sm bg-danger-50 hover:bg-danger-100 text-danger-600 border border-danger-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleValidate(inv.id)} disabled={loadingAction === `validate-${inv.id}`} className="btn-secondary text-sm flex items-center gap-1">
                          {loadingAction === `validate-${inv.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />} Re-validate
                        </button>
                        <button onClick={() => handleRisk(inv.id)} disabled={loadingAction === `risk-${inv.id}`} className="btn-secondary text-sm flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" /> Risk Analysis
                        </button>
                        <button onClick={() => handleHsClassify(inv.id)} disabled={loadingAction === `hs-${inv.id}`} className="btn-secondary text-sm flex items-center gap-1">
                          {loadingAction === `hs-${inv.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />} {hsResults[inv.id] ? 'Re-classify HS' : 'HS Classify'}
                        </button>
                        <button onClick={() => handleIncentives(inv.id)} disabled={loadingAction === `incentives-${inv.id}`} className="btn-secondary text-sm flex items-center gap-1">
                          {loadingAction === `incentives-${inv.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />} Export Incentives
                        </button>
                        <button onClick={() => handleFtaBenefits(inv.id)} disabled={loadingAction === `fta-${inv.id}`} className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors font-medium">
                          {loadingAction === `fta-${inv.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />} FTA Benefits
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* AI Chat */}
        <div className="h-[400px] lg:h-[600px]">
          <AIChat agentType="finance" placeholder="Ask FinanceAI about Incoterms, export documentation, payment terms, country-specific requirements, duty drawback..." />
        </div>
      </div>

      {/* New Invoice Modal */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="New Export Invoice" size="xl">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, totalAmount }); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Number</label>
              <input className="input font-mono" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="Auto-generated if left blank" />
            </div>
            <div>
              <label className="label">Customer Name *</label>
              <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="e.g., Tesco Stores Ltd" required />
            </div>
            <div>
              <label className="label">Destination Country *</label>
              <select className="input" value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })} required>
                <option value="">Select country</option>
                {countries.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Invoice Date</label>
              <input type="date" className="input font-mono" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input font-mono" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Incoterms</label>
              <select className="input font-mono" value={form.incoterms} onChange={(e) => setForm({ ...form, incoterms: e.target.value })}>
                {incotermsOptions.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Payment Terms</label>
              <select className="input" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="label">Line Items</label>
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-surface-500 px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-2">Unit Price</span>
                <span className="col-span-2">Total</span>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input className="input sm:col-span-5" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Product description" />
                  <input type="number" className="input sm:col-span-2 font-mono" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', +e.target.value)} min="1" placeholder="Qty" />
                  <input type="number" className="input sm:col-span-2 font-mono" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', +e.target.value)} min="0" step="0.01" placeholder="Unit Price" />
                  <div className="sm:col-span-2 flex items-center">
                    <span className="text-sm text-surface-700 font-mono font-medium">{item.total.toFixed(2)}</span>
                  </div>
                  {form.items.length > 1 && (
                    <button onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })} className="text-danger-400 hover:text-danger-600 text-xs transition-colors">✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }] })} className="text-sm text-accent-500 hover:text-accent-600 font-medium">+ Add Line Item</button>
            </div>
            <div className="mt-2 text-right font-semibold text-surface-800 font-mono">Total: {form.currency} {totalAmount.toFixed(2)}</div>
          </div>

          <div className="bg-accent-50 rounded-lg p-3 text-sm text-accent-700 border border-accent-200">
            <Bot className="w-4 h-4 inline mr-1" />
            After creating, use AI to validate compliance, classify HS codes, and analyze export incentives
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Export Incentives Modal */}
      <Modal isOpen={showIncentivesModal} onClose={() => { setShowIncentivesModal(false); setIncentivesResult(null); }} title="Export Incentive Analysis" size="xl">
        {incentivesResult && (
          <div className="space-y-4">
            {/* Total Estimated Benefit */}
            {incentivesResult.totalEstimatedBenefit && (
              <div className="bg-success-50 rounded-xl p-4 border border-success-200 text-center">
                <p className="text-xs text-success-600 font-medium uppercase tracking-wide">Total Estimated Benefit</p>
                <p className="text-2xl font-bold font-mono text-success-700 mt-1">{incentivesResult.totalEstimatedBenefit}</p>
              </div>
            )}

            {/* Schemes */}
            {(incentivesResult.schemes || incentivesResult.incentives || []).map((scheme: any, i: number) => (
              <div key={i} className={`rounded-xl p-4 border ${scheme.eligible || scheme.eligibility === 'Eligible' ? 'bg-success-50 border-success-200' : 'bg-surface-50 border-surface-200'}`}>
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-sm font-semibold text-surface-800">{scheme.name || scheme.scheme}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    scheme.eligible || scheme.eligibility === 'Eligible'
                      ? 'bg-success-100 text-success-700 border border-success-200'
                      : 'bg-surface-200 text-surface-500 border border-surface-300'
                  }`}>
                    {scheme.eligible !== undefined ? (scheme.eligible ? 'Eligible' : 'Not Eligible') : scheme.eligibility}
                  </span>
                </div>
                {scheme.rate && <p className="text-xs text-surface-600 mb-1">Rate: <span className="font-mono font-semibold">{scheme.rate}</span></p>}
                {(scheme.estimatedBenefit || scheme.estimated_benefit) && (
                  <p className="text-xs text-success-600 font-medium">Estimated Benefit: <span className="font-mono font-semibold">{scheme.estimatedBenefit || scheme.estimated_benefit}</span></p>
                )}
                {scheme.description && <p className="text-xs text-surface-500 mt-1">{scheme.description}</p>}
              </div>
            ))}

            {/* Recommendations */}
            {incentivesResult.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {incentivesResult.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <CheckCircle className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" />{rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Required Forms */}
            {incentivesResult.requiredForms?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Required Forms</h4>
                <div className="flex flex-wrap gap-2">
                  {incentivesResult.requiredForms.map((form: string, i: number) => (
                    <span key={i} className="text-xs bg-accent-50 text-accent-700 px-2 py-1 rounded-lg border border-accent-200 font-mono">{form}</span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { setShowIncentivesModal(false); setIncentivesResult(null); }} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      {/* Document Checklist Modal */}
      <Modal isOpen={showChecklist} onClose={() => { setShowChecklist(false); setChecklistResult(null); }} title="Export Document Checklist Generator" size="xl">
        {!checklistResult ? (
          <div className="space-y-4">
            <p className="text-sm text-surface-600">Generate a comprehensive export documentation checklist for any market.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Destination Country *</label>
                <select className="input" value={checklistForm.destinationCountry} onChange={(e) => setChecklistForm({ ...checklistForm, destinationCountry: e.target.value })}>
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Product Type</label>
                <input className="input" value={checklistForm.productType} onChange={(e) => setChecklistForm({ ...checklistForm, productType: e.target.value })} />
              </div>
              <div>
                <label className="label">Payment Terms</label>
                <select className="input" value={checklistForm.paymentTerms} onChange={(e) => setChecklistForm({ ...checklistForm, paymentTerms: e.target.value })}>
                  {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Incoterms</label>
                <select className="input font-mono" value={checklistForm.incoterms} onChange={(e) => setChecklistForm({ ...checklistForm, incoterms: e.target.value })}>
                  {incotermsOptions.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowChecklist(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleGenerateChecklist}
                disabled={!checklistForm.destinationCountry || loadingAction === 'checklist'}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loadingAction === 'checklist' ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Bot className="w-4 h-4" /> Generate Checklist</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-surface-800">Export Checklist: {checklistForm.destinationCountry}</h3>
              <button onClick={() => setChecklistResult(null)} className="text-sm text-accent-500 hover:text-accent-600 font-medium">Back</button>
            </div>

            {checklistResult.mandatoryDocuments?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-danger-600 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Mandatory Documents
                </h4>
                <div className="space-y-2">
                  {checklistResult.mandatoryDocuments.map((doc: any, i: number) => (
                    <div key={i} className="bg-danger-50 rounded-lg p-3 border border-danger-200">
                      <p className="font-medium text-sm text-danger-700">{doc.document}</p>
                      <p className="text-xs text-danger-500">Issued by: {doc.authority}</p>
                      {doc.notes && <p className="text-xs text-surface-600 mt-1">{doc.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {checklistResult.certifications?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-accent-600 mb-2">Required Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {checklistResult.certifications.map((c: string, i: number) => (
                    <span key={i} className="bg-accent-50 text-accent-700 text-xs px-2 py-1 rounded-lg border border-accent-200 font-mono">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {checklistResult.labelingRequirements?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-700 mb-2">Labeling Requirements</h4>
                <ul className="space-y-1">
                  {checklistResult.labelingRequirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                      <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />{req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {checklistResult.timeline && (
              <div className="bg-surface-50 rounded-lg p-3 border border-surface-200">
                <h4 className="text-sm font-semibold text-surface-700 mb-1 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Timeline & Notes
                </h4>
                <p className="text-sm text-surface-600">{checklistResult.timeline}</p>
              </div>
            )}

            <button onClick={() => setShowChecklist(false)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      {/* Risk Analysis Modal */}
      <Modal isOpen={showRiskModal} onClose={() => { setShowRiskModal(false); setRiskResult(null); }} title="Financial Risk Analysis" size="md">
        {riskResult && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 border text-center ${
              riskResult.riskLevel === 'Low' || riskResult.riskLevel === 'low' ? 'bg-success-50 border-success-200' :
              riskResult.riskLevel === 'Medium' || riskResult.riskLevel === 'medium' ? 'bg-warning-50 border-warning-100' :
              'bg-danger-50 border-danger-200'
            }`}>
              <p className="text-xs font-medium uppercase tracking-wide text-surface-500">Risk Level</p>
              <p className={`text-2xl font-bold mt-1 ${
                riskResult.riskLevel === 'Low' || riskResult.riskLevel === 'low' ? 'text-success-700' :
                riskResult.riskLevel === 'Medium' || riskResult.riskLevel === 'medium' ? 'text-warning-600' :
                'text-danger-600'
              }`}>{riskResult.riskLevel}</p>
            </div>

            {riskResult.riskFactors?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Risk Factors</h4>
                <ul className="space-y-1">
                  {riskResult.riskFactors.map((factor: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />{factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {riskResult.recommendedPaymentTerms && (
              <div className="bg-accent-50 rounded-lg p-3 border border-accent-200">
                <p className="text-xs font-medium text-accent-600">Recommended Payment Terms</p>
                <p className="text-sm font-semibold text-accent-700 mt-0.5">{riskResult.recommendedPaymentTerms}</p>
              </div>
            )}

            {riskResult.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {riskResult.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <CheckCircle className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" />{rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={() => { setShowRiskModal(false); setRiskResult(null); }} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      {/* FTA Benefits Modal */}
      <Modal isOpen={showFtaModal} onClose={() => { setShowFtaModal(false); setFtaResult(null); }} title="FTA Tariff Benefits Analysis" size="xl">
        {ftaResult && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Total Potential Savings */}
            {ftaResult.totalPotentialSavings && (
              <div className="bg-success-50 rounded-xl p-4 border border-success-200 text-center">
                <p className="text-xs text-success-600 font-medium uppercase tracking-wide">Total Potential Savings</p>
                <p className="text-2xl font-bold font-mono text-success-700 mt-1">{ftaResult.totalPotentialSavings}</p>
              </div>
            )}

            {/* Self-Certification */}
            {ftaResult.selfCertificationAvailable !== undefined && (
              <div className={`rounded-xl p-3 border text-sm flex items-center gap-2 ${ftaResult.selfCertificationAvailable ? 'bg-success-50 border-success-200 text-success-700' : 'bg-surface-50 border-surface-200 text-surface-600'}`}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Self-certification: <span className="font-semibold">{ftaResult.selfCertificationAvailable ? 'Available' : 'Not Available'}</span>
              </div>
            )}

            {/* Applicable FTAs */}
            {(ftaResult.applicableFTAs || ftaResult.ftas || []).map((fta: any, i: number) => (
              <div key={i} className="rounded-xl p-4 border bg-blue-50 border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">{fta.name || fta.agreement}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {fta.mfnDuty && (
                    <div>
                      <span className="text-surface-500">MFN Duty:</span>
                      <span className="font-mono font-semibold text-surface-700 ml-1">{fta.mfnDuty}</span>
                    </div>
                  )}
                  {fta.preferentialDuty && (
                    <div>
                      <span className="text-surface-500">Preferential Duty:</span>
                      <span className="font-mono font-semibold text-success-700 ml-1">{fta.preferentialDuty}</span>
                    </div>
                  )}
                  {fta.savings && (
                    <div>
                      <span className="text-surface-500">Savings:</span>
                      <span className="font-mono font-bold text-success-600 ml-1">{fta.savings}</span>
                    </div>
                  )}
                  {fta.cooForm && (
                    <div>
                      <span className="text-surface-500">CoO Form:</span>
                      <span className="font-mono font-semibold text-blue-700 ml-1">{fta.cooForm}</span>
                    </div>
                  )}
                </div>
                {fta.rulesOfOrigin && (
                  <div className="mt-2 text-xs text-surface-600">
                    <span className="font-semibold text-surface-700">Rules of Origin:</span> {fta.rulesOfOrigin}
                  </div>
                )}
              </div>
            ))}

            {/* Recommendations */}
            {ftaResult.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {ftaResult.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-600">
                      <CheckCircle className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" />{rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={() => { setShowFtaModal(false); setFtaResult(null); }} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onDismiss={clearToast} />
    </div>
  );
}

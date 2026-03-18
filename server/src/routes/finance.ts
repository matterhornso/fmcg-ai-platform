import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import {
  validateInvoiceCompliance,
  generateExportDocumentChecklist,
  analyzeFinancialRisk,
  classifyHSCodes,
  analyzeExportIncentives,
  analyzeFTABenefits,
  chatWithFinanceAgent,
} from '../agents/financeAgent';
import { v4 as uuidv4 } from 'uuid';
import { aiLimiter } from '../middleware/rateLimiter';
import { getCached, setCache } from '../utils/cache';
import { isAIAvailable } from '../utils/ai';
import type { Invoice, CountRow } from '../types';

const router = Router();

const VALID_STATUSES = ['pending', 'approved', 'review_required', 'rejected', 'paid'];

// ── Static routes MUST come before /:id to avoid shadowing ──────────────────

// Get all invoices
router.get('/', (req: Request, res: Response) => {
  try {
    const invoices = db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Finance analytics — must be before GET /:id
router.get('/analytics/summary', (req: Request, res: Response) => {
  try {
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM invoices GROUP BY status').all();
    const byCurrency = db.prepare('SELECT currency, SUM(total_amount) as total, COUNT(*) as count FROM invoices GROUP BY currency').all();
    const byCountry = db.prepare('SELECT destination_country, COUNT(*) as count, SUM(total_amount) as total FROM invoices GROUP BY destination_country ORDER BY total DESC LIMIT 10').all();
    const total = db.prepare('SELECT COUNT(*) as c, SUM(total_amount) as t FROM invoices').get() as unknown as CountRow;

    res.json({ totalInvoices: total.c, totalValue: total.t, byStatus, byCurrency, byCountry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Create invoice
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerName, destinationCountry, invoiceDate, items, currency, paymentTerms, incoterms } = req.body;
    if (!customerName || !destinationCountry) {
      return res.status(400).json({ error: 'customerName and destinationCountry are required' });
    }
    if (typeof customerName !== 'string' || customerName.length > 200) {
      return res.status(400).json({ error: 'Customer name must be under 200 characters' });
    }
    if (items && !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }
    // Auto-generate invoice number if not provided
    const countNum = (db.prepare('SELECT COUNT(*) as c FROM invoices').get() as unknown as CountRow).c + 1;
    const invoiceNumber = req.body.invoiceNumber || `INV-${new Date().getFullYear()}-${String(countNum).padStart(4, '0')}`;

    const id = uuidv4();
    const totalAmount = (items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0);

    db.prepare(`
      INSERT INTO invoices (id, invoice_number, customer_name, destination_country, invoice_date, items, total_amount, currency, payment_terms, incoterms, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      id, invoiceNumber, customerName, destinationCountry,
      invoiceDate || new Date().toISOString().split('T')[0],
      JSON.stringify(items || []),
      totalAmount,
      currency || 'USD',
      paymentTerms || 'NET 30',
      incoterms || 'FOB'
    );

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Generate document checklist — must be before POST /:id/* routes (cached)
router.post('/checklist', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { destinationCountry, productType, paymentTerms, incoterms } = req.body;
    if (!destinationCountry || !productType) {
      return res.status(400).json({ error: 'destinationCountry and productType are required' });
    }

    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        checklist: null,
      });
    }

    const terms = paymentTerms || 'NET 30';
    const inco = incoterms || 'FOB';
    const cacheKey = `checklist:${destinationCountry}:${productType}:${terms}:${inco}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const checklist = await generateExportDocumentChecklist(
      destinationCountry,
      productType,
      terms,
      inco
    );
    setCache(cacheKey, checklist, 3600000); // 1 hour TTL
    res.json(checklist);
  } catch (error) {
    console.error('Checklist error:', error);
    res.status(500).json({ error: 'Failed to generate checklist' });
  }
});

// Chat with finance agent — must be before POST /:id/* routes
router.post('/chat', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        response: 'AI chat requires ANTHROPIC_API_KEY. Please add your key to .env and restart the server.',
      });
    }
    const { messages, context } = req.body;
    const response = await chatWithFinanceAgent(messages, context);
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// ── Parameterised routes ─────────────────────────────────────────────────────

// Get single invoice
router.get('/:id', (req: Request, res: Response) => {
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Validate invoice compliance
router.post('/:id/validate', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        compliance: null,
      });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as unknown as Invoice | undefined;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const items = JSON.parse(invoice.items || '[]');
    const compliance = await validateInvoiceCompliance(
      invoice.invoice_number,
      invoice.customer_name,
      invoice.destination_country,
      items,
      invoice.total_amount,
      invoice.currency,
      invoice.payment_terms,
      invoice.incoterms
    );

    const newStatus = compliance.complianceStatus === 'compliant' ? 'approved' : 'review_required';
    db.prepare(`
      UPDATE invoices SET compliance_check = ?, documents_required = ?, status = ?, ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(
      JSON.stringify(compliance),
      JSON.stringify(compliance.requiredDocuments),
      newStatus,
      JSON.stringify(compliance),
      req.params.id
    );

    res.json(compliance);
  } catch (error) {
    console.error('Validate invoice error:', error);
    res.status(500).json({ error: 'Failed to validate invoice' });
  }
});

// Analyze financial risk
router.post('/:id/risk-analysis', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        riskAnalysis: null,
      });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as unknown as Invoice | undefined;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const riskAnalysis = await analyzeFinancialRisk(
      invoice.customer_name,
      invoice.destination_country,
      invoice.total_amount,
      invoice.currency,
      invoice.payment_terms
    );

    res.json(riskAnalysis);
  } catch (error) {
    console.error('Risk analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze risk' });
  }
});

// Classify HS codes for invoice items
router.post('/:id/hs-classify', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        classification: null,
      });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as unknown as Invoice | undefined;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const items = JSON.parse(invoice.items || '[]');
    const classificationItems = items.map((item: any) => ({
      description: item.description,
      destinationCountry: invoice.destination_country,
    }));

    const result = await classifyHSCodes(classificationItems);

    // Merge HS classification into existing ai_analysis
    const existingAnalysis = invoice.ai_analysis ? JSON.parse(invoice.ai_analysis) : {};
    existingAnalysis.hsClassification = result;
    db.prepare('UPDATE invoices SET ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(existingAnalysis), req.params.id);

    res.json(result);
  } catch (error) {
    console.error('HS classification error:', error);
    res.status(500).json({ error: 'Failed to classify HS codes' });
  }
});

// Analyze export incentives for invoice
router.post('/:id/incentives', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        incentives: null,
      });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as unknown as Invoice | undefined;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const parsedItems = JSON.parse(invoice.items || '[]');
    const existingAnalysis = invoice.ai_analysis ? JSON.parse(invoice.ai_analysis) : {};

    // Use HS codes from previous classification if available
    const itemsWithHS = parsedItems.map((item: any, idx: number) => {
      const hsData = existingAnalysis.hsClassification?.items?.[idx];
      return {
        description: item.description,
        hsCode: hsData?.hsCode || 'Not yet classified',
      };
    });

    const result = await analyzeExportIncentives(
      itemsWithHS,
      invoice.destination_country,
      invoice.total_amount,
      invoice.currency
    );

    existingAnalysis.exportIncentives = result;
    db.prepare('UPDATE invoices SET ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(existingAnalysis), req.params.id);

    res.json(result);
  } catch (error) {
    console.error('Export incentives error:', error);
    res.status(500).json({ error: 'Failed to analyze export incentives' });
  }
});

// Analyze FTA benefits for invoice
router.post('/:id/fta-benefits', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        ftaBenefits: null,
      });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as unknown as Invoice | undefined;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const parsedItems = JSON.parse(invoice.items || '[]');
    const existingAnalysis = invoice.ai_analysis ? JSON.parse(invoice.ai_analysis) : {};

    // Use HS codes from previous classification if available
    const itemsForFTA = parsedItems.map((item: any, idx: number) => {
      const hsData = existingAnalysis.hsClassification?.items?.[idx];
      return {
        description: item.description,
        hsCode: hsData?.hsCode,
      };
    });

    const result = await analyzeFTABenefits(
      invoice.destination_country,
      itemsForFTA,
      invoice.total_amount,
      invoice.currency
    );

    existingAnalysis.ftaBenefits = result;
    db.prepare('UPDATE invoices SET ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(existingAnalysis), req.params.id);

    res.json(result);
  } catch (error) {
    console.error('FTA benefits error:', error);
    res.status(500).json({ error: 'Failed to analyze FTA benefits' });
  }
});

// Delete invoice
router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Update invoice status
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    db.prepare('UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;

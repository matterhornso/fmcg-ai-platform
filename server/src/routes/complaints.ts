import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import {
  classifyAndAnalyzeComplaint,
  generateResponseLetter,
  performRootCauseAnalysis,
  generateRegulatoryNotification,
  analyzeBatchTrace,
  chatWithComplaintAgent,
} from '../agents/complaintAgent';
import { v4 as uuidv4 } from 'uuid';
import { aiLimiter } from '../middleware/rateLimiter';
import { isAIAvailable } from '../utils/ai';
import type { Complaint, BatchTrace, CountRow } from '../types';

const router = Router();

const VALID_STATUSES = ['open', 'investigating', 'resolved', 'closed', 'escalated'];

// ── Static routes MUST come before /:id to avoid shadowing ──────────────────

// Get all complaints
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, priority, category } = req.query;
    let query = 'SELECT * FROM complaints WHERE 1=1';
    const params: string[] = [];

    if (status) { query += ' AND status = ?'; params.push(status as string); }
    if (priority) { query += ' AND priority = ?'; params.push(priority as string); }
    if (category) { query += ' AND category = ?'; params.push(category as string); }
    query += ' ORDER BY created_at DESC';

    const complaints = db.prepare(query).all(...params);
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// Get complaint analytics — must be before GET /:id
router.get('/analytics/summary', (req: Request, res: Response) => {
  try {
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM complaints GROUP BY status').all();
    const byPriority = db.prepare('SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority').all();
    const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM complaints GROUP BY category').all();
    const byCountry = db.prepare('SELECT customer_country, COUNT(*) as count FROM complaints GROUP BY customer_country ORDER BY count DESC LIMIT 10').all();
    const total = (db.prepare('SELECT COUNT(*) as c FROM complaints').get() as unknown as CountRow).c;

    res.json({ total, byStatus, byPriority, byCategory, byCountry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Create new complaint with AI analysis
router.post('/', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { customerName, customerCountry, product, batchNumber, complaintDate, description } = req.body;
    if (!customerName || !customerCountry || !product || !description) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    if (typeof customerName !== 'string' || customerName.length > 200) {
      return res.status(400).json({ error: 'Customer name must be under 200 characters' });
    }
    if (typeof description !== 'string' || description.length > 5000) {
      return res.status(400).json({ error: 'Description must be under 5000 characters' });
    }

    const id = uuidv4();
    // Use MAX(complaint_ref) instead of COUNT(*) to avoid duplicate refs under concurrent load
    const lastRef = db.prepare(
      "SELECT complaint_ref FROM complaints WHERE complaint_ref LIKE 'CMP-%' ORDER BY complaint_ref DESC LIMIT 1"
    ).get() as { complaint_ref: string } | undefined;
    const nextNum = lastRef
      ? parseInt(lastRef.complaint_ref.split('-').pop() || '0', 10) + 1
      : 1;
    const complaintRef = `CMP-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;

    // AI classification — graceful fallback if API key not set
    let analysis: any = null;
    let aiAvailable = true;
    try {
      analysis = await classifyAndAnalyzeComplaint(
        customerName, customerCountry, product, batchNumber, description
      );
    } catch (aiError: any) {
      aiAvailable = false;
      console.warn('AI unavailable for complaint classification. Using defaults.');
      const desc = description.toLowerCase();
      const category = desc.includes('foreign') || desc.includes('metal') || desc.includes('contamina') ? 'quality'
        : desc.includes('packag') || desc.includes('seal') || desc.includes('damage') ? 'packaging'
        : desc.includes('label') || desc.includes('shelf life') || desc.includes('date') ? 'labeling'
        : desc.includes('deliver') || desc.includes('shipment') ? 'delivery'
        : 'quality';
      const priority = desc.includes('metal') || desc.includes('foreign') || desc.includes('toxic') || desc.includes('recall') ? 'critical'
        : desc.includes('damage') || desc.includes('contamina') ? 'high'
        : desc.includes('label') || desc.includes('shelf') ? 'medium'
        : 'low';
      analysis = { category, priority, immediateActions: ['Review complaint details', 'Check batch records', 'Contact customer'], aiNote: 'Configure ANTHROPIC_API_KEY for full AI analysis' };
    }

    db.prepare(`
      INSERT INTO complaints (id, complaint_ref, customer_name, customer_country, product, batch_number, complaint_date, description, category, priority, status, ai_analysis)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(
      id, complaintRef, customerName, customerCountry, product,
      batchNumber || null,
      complaintDate || new Date().toISOString().split('T')[0],
      description,
      analysis.category,
      analysis.priority,
      JSON.stringify(analysis)
    );

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    res.status(201).json({ complaint, analysis, aiAvailable });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// Chat with complaint agent — must be before POST /:id/* routes
router.post('/chat', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        response: 'AI chat requires ANTHROPIC_API_KEY. Please add your key to .env and restart the server.',
      });
    }
    const { messages, context } = req.body;
    const response = await chatWithComplaintAgent(messages, context);
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// ── Parameterised routes ─────────────────────────────────────────────────────

// Get single complaint
router.get('/:id', (req: Request, res: Response) => {
  try {
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

// Perform root cause analysis
router.post('/:id/rca', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        rca: null,
      });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id) as unknown as Complaint | undefined;
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const rca = await performRootCauseAnalysis(
      complaint.product,
      complaint.batch_number,
      complaint.category || 'quality',
      complaint.description
    );

    db.prepare(`
      UPDATE complaints SET root_cause = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(JSON.stringify(rca), req.params.id);

    res.json(rca);
  } catch (error) {
    console.error('RCA error:', error);
    res.status(500).json({ error: 'Failed to perform root cause analysis' });
  }
});

// Generate response letter
router.post('/:id/response-letter', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        letter: null,
      });
    }

    const { resolution } = req.body;
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id) as unknown as Complaint | undefined;
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const letter = await generateResponseLetter(
      complaint.complaint_ref,
      complaint.customer_name,
      complaint.customer_country,
      complaint.product,
      complaint.description,
      resolution || complaint.resolution || 'Under investigation',
      complaint.category || 'quality'
    );

    db.prepare(`
      UPDATE complaints SET response_draft = ?, resolution = ?, status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(letter, resolution || null, req.params.id);

    res.json({ letter });
  } catch (error) {
    console.error('Response letter error:', error);
    res.status(500).json({ error: 'Failed to generate response letter' });
  }
});

// Generate regulatory notification
router.post('/:id/regulatory-notification', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { authority } = req.body;
    if (!authority) {
      return res.status(400).json({ error: 'authority is required' });
    }

    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        notification: null,
      });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id) as unknown as Complaint | undefined;
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const result = await generateRegulatoryNotification(
      complaint.complaint_ref,
      complaint.customer_name,
      complaint.customer_country,
      complaint.product,
      complaint.batch_number,
      complaint.description,
      complaint.category || 'quality',
      authority
    );

    res.json(result);
  } catch (error) {
    console.error('Regulatory notification error:', error);
    res.status(500).json({ error: 'Failed to generate regulatory notification' });
  }
});

// Get batch trace and AI analysis for a complaint
router.get('/:id/batch-trace', async (req: Request, res: Response) => {
  try {
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id) as unknown as Complaint | undefined;
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    if (!complaint.batch_number) {
      return res.status(404).json({ error: 'No batch number associated with this complaint' });
    }

    const batchTrace = db.prepare('SELECT * FROM batch_trace WHERE batch_number = ?').get(complaint.batch_number) as unknown as BatchTrace | undefined;
    if (!batchTrace) {
      return res.status(404).json({ error: 'Batch trace data not found for batch ' + complaint.batch_number });
    }

    // Parse JSON fields
    const batchData = {
      ...batchTrace,
      raw_materials: batchTrace.raw_materials ? JSON.parse(batchTrace.raw_materials) : null,
      quality_checks: batchTrace.quality_checks ? JSON.parse(batchTrace.quality_checks) : null,
      process_log: batchTrace.process_log ? JSON.parse(batchTrace.process_log) : null,
      shipments: batchTrace.shipments ? JSON.parse(batchTrace.shipments) : null,
    };

    const aiAnalysis = await analyzeBatchTrace(batchData, complaint.description);

    res.json({ batchTrace: batchData, aiAnalysis });
  } catch (error) {
    console.error('Batch trace error:', error);
    res.status(500).json({ error: 'Failed to fetch batch trace' });
  }
});

// Delete complaint
router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM complaints WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

// Update complaint status
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    db.prepare('UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;

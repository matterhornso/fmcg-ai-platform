import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { generateAuditChecklist, analyzeAuditFindings, getCountryRequirements, predictShelfLife, checkContaminationRisks, chatWithQualityAgent } from '../agents/qualityAgent';
import { v4 as uuidv4 } from 'uuid';
import { aiLimiter } from '../middleware/rateLimiter';
import { getCached, setCache } from '../utils/cache';
import { isAIAvailable } from '../utils/ai';
import type { Audit } from '../types';

const router = Router();

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

// Get all audits
router.get('/', (req: Request, res: Response) => {
  try {
    const audits = db.prepare('SELECT * FROM audits ORDER BY created_at DESC').all();
    res.json(audits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// Create new audit with AI-generated checklist
router.post('/', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { title, type, product, supplier, location } = req.body;
    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }
    if (typeof title !== 'string' || title.length > 500) {
      return res.status(400).json({ error: 'Title must be a string under 500 characters' });
    }
    if (!['internal', 'supplier', 'regulatory', 'customer', 'haccp'].includes(type)) {
      return res.status(400).json({ error: 'Invalid audit type' });
    }

    const id = uuidv4();

    // Attempt AI checklist generation; fall back to defaults if unavailable
    let checklistItems: string[] = [];
    let guidelines = '';
    let aiAvailable = true;
    try {
      const aiResult = await generateAuditChecklist(type, product || 'General', supplier, location);
      checklistItems = aiResult.checklist;
      guidelines = aiResult.guidelines;
    } catch (aiError: any) {
      aiAvailable = false;
      console.warn('AI unavailable for checklist generation (no API key?). Using defaults.');
      const defaults: Record<string, string[]> = {
        supplier: ['Supplier credentials & certifications', 'GMP compliance documentation', 'Raw material traceability', 'Hygiene & sanitation procedures', 'Equipment maintenance records', 'Pest control logs', 'Quality control testing records', 'Labeling & packaging compliance', 'Cold chain management', 'Batch traceability system', 'Non-conformance procedures', 'Employee training records'],
        internal: ['Production hygiene standards', 'Equipment calibration records', 'Personnel health & hygiene', 'HACCP critical control points', 'Temperature monitoring logs', 'Allergen management', 'Cleaning & sanitation schedules', 'Water quality testing', 'Pest control records', 'Waste disposal procedures', 'Glass & brittle material policy', 'Foreign body detection checks'],
        regulatory: ['FSSAI compliance documentation', 'Export license validity', 'Product labeling regulations', 'Country-specific import requirements', 'Certificate of conformity', 'Health certificates', 'Phytosanitary requirements', 'Customs documentation', 'Halal/Kosher certifications if required', 'Organic certifications if applicable', 'Heavy metals & pesticide test reports', 'Microbiological test certificates'],
      };
      checklistItems = defaults[type] || defaults['internal'];
      guidelines = `Default ${type} audit checklist. Configure ANTHROPIC_API_KEY in .env for AI-generated checklists.`;
    }

    db.prepare(`
      INSERT INTO audits (id, title, type, product, supplier, location, status, checklist, ai_analysis)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id, title, type, product || null, supplier || null, location || null,
      JSON.stringify(checklistItems),
      guidelines
    );

    const audit = db.prepare('SELECT * FROM audits WHERE id = ?').get(id);
    res.status(201).json({ ...audit as object, aiAvailable });
  } catch (error) {
    console.error('Create audit error:', error);
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// ── Static routes MUST come before /:id to avoid shadowing ──────────────────

// Get country-specific import requirements (cached)
router.post('/country-requirements', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { country, productCategory } = req.body;
    if (!country || !productCategory) {
      return res.status(400).json({ error: 'country and productCategory are required' });
    }

    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        country,
        productCategory,
        requirements: [],
      });
    }

    const cacheKey = `country:${country}:${productCategory}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const result = await getCountryRequirements(country, productCategory);
    setCache(cacheKey, result, 3600000); // 1 hour TTL
    res.json(result);
  } catch (error) {
    console.error('Country requirements error:', error);
    res.status(500).json({ error: 'Failed to get country requirements' });
  }
});

// Predict shelf-life impact (cached)
router.post('/shelf-life', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { product, destinationCountry, shippingMode, season, packagingType } = req.body;
    if (!product || !destinationCountry || !shippingMode || !season || !packagingType) {
      return res.status(400).json({ error: 'product, destinationCountry, shippingMode, season, and packagingType are required' });
    }

    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        product,
        destinationCountry,
        prediction: null,
      });
    }

    const cacheKey = `shelf:${product}:${destinationCountry}:${shippingMode}:${season}:${packagingType}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const result = await predictShelfLife(product, destinationCountry, shippingMode, season, packagingType);
    setCache(cacheKey, result, 3600000); // 1 hour TTL
    res.json(result);
  } catch (error) {
    console.error('Shelf life prediction error:', error);
    res.status(500).json({ error: 'Failed to predict shelf life' });
  }
});

// Check contamination risks for a product-destination combination (cached)
router.post('/contamination-risks', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { product, destinationCountry } = req.body;
    if (!product || !destinationCountry) {
      return res.status(400).json({ error: 'product and destinationCountry are required' });
    }

    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        product,
        destinationCountry,
        risks: [],
      });
    }

    const cacheKey = `contamination:${product}:${destinationCountry}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    const result = await checkContaminationRisks(product, destinationCountry);
    setCache(cacheKey, result, 3600000); // 1 hour TTL
    res.json(result);
  } catch (error) {
    console.error('Contamination risk check error:', error);
    res.status(500).json({ error: 'Failed to check contamination risks' });
  }
});

// Chat with quality agent
router.post('/chat', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        response: 'AI chat requires ANTHROPIC_API_KEY. Please add your key to .env and restart the server.',
      });
    }
    const { messages, context } = req.body;
    const response = await chatWithQualityAgent(messages, context);
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// ── Parameterised routes ─────────────────────────────────────────────────────

// Get single audit
router.get('/:id', (req: Request, res: Response) => {
  try {
    const audit = db.prepare('SELECT * FROM audits WHERE id = ?').get(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    res.json(audit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit' });
  }
});

// Analyze audit findings
router.post('/:id/analyze', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!isAIAvailable()) {
      return res.status(200).json({
        aiAvailable: false,
        message: 'AI features require ANTHROPIC_API_KEY in .env',
        analysis: null,
      });
    }

    const { findings } = req.body;
    const audit = db.prepare('SELECT * FROM audits WHERE id = ?').get(req.params.id) as unknown as Audit | undefined;
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const checklist = audit.checklist ? JSON.parse(audit.checklist) : [];
    const analysis = await analyzeAuditFindings(
      audit.title,
      audit.type,
      audit.product || 'FMCG Product',
      findings,
      checklist
    );

    db.prepare(`
      UPDATE audits SET
        findings = ?,
        corrective_actions = ?,
        score = ?,
        ai_analysis = ?,
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify(findings),
      JSON.stringify(analysis.correctiveActions),
      analysis.overallScore,
      JSON.stringify(analysis),
      req.params.id
    );

    const updatedAudit = db.prepare('SELECT * FROM audits WHERE id = ?').get(req.params.id);
    res.json({ audit: updatedAudit, analysis });
  } catch (error) {
    console.error('Analyze audit error:', error);
    res.status(500).json({ error: 'Failed to analyze audit' });
  }
});

// Update audit status
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    db.prepare('UPDATE audits SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);
    const audit = db.prepare('SELECT * FROM audits WHERE id = ?').get(req.params.id);
    res.json(audit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete audit
router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM audits WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete audit' });
  }
});

export default router;

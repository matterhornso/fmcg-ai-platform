import { Router, Request, Response } from 'express';
import { db } from '../db/database';

const router = Router();

// Simple in-memory cache for dashboard stats
let statsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds

router.get('/stats', (req: Request, res: Response) => {
  try {
    // Return cached data if fresh
    if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(statsCache.data);
    }

    const audits = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(CASE WHEN score IS NOT NULL THEN score END) as avg_score
      FROM audits
    `).get() as any;

    const complaints = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical
      FROM complaints
    `).get() as any;

    const finance = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END) as approved_value,
        SUM(CASE WHEN status = 'pending' OR status = 'review_required' THEN 1 ELSE 0 END) as pending_review,
        COUNT(DISTINCT destination_country) as countries
      FROM invoices
    `).get() as any;

    const complaintsByCountry = db.prepare(`
      SELECT customer_country, COUNT(*) as count
      FROM complaints GROUP BY customer_country ORDER BY count DESC LIMIT 10
    `).all();

    const recentComplaints = db.prepare(`
      SELECT id, complaint_ref, customer_name, customer_country, product, priority, status, created_at
      FROM complaints ORDER BY created_at DESC LIMIT 5
    `).all();

    const recentAudits = db.prepare(`
      SELECT id, title, type, status, score, created_at
      FROM audits ORDER BY created_at DESC LIMIT 5
    `).all();

    const result = {
      audits,
      complaints: { ...complaints, byCountry: complaintsByCountry },
      finance,
      recentComplaints,
      recentAudits,
    };

    // Update cache
    statsCache = { data: result, timestamp: Date.now() };

    res.json(result);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;

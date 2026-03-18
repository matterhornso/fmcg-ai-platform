import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(__dirname, '../../data/fmcg_ai.db');
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

export function initDatabase() {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      product TEXT,
      supplier TEXT,
      location TEXT,
      status TEXT DEFAULT 'pending',
      checklist TEXT,
      findings TEXT,
      corrective_actions TEXT,
      score INTEGER,
      ai_analysis TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      complaint_ref TEXT UNIQUE,
      customer_name TEXT NOT NULL,
      customer_country TEXT NOT NULL,
      product TEXT NOT NULL,
      batch_number TEXT,
      complaint_date DATE NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      priority TEXT,
      status TEXT DEFAULT 'open',
      root_cause TEXT,
      resolution TEXT,
      response_draft TEXT,
      ai_analysis TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE,
      customer_name TEXT NOT NULL,
      destination_country TEXT NOT NULL,
      invoice_date DATE NOT NULL,
      items TEXT NOT NULL,
      total_amount REAL,
      currency TEXT DEFAULT 'USD',
      payment_terms TEXT,
      incoterms TEXT,
      status TEXT DEFAULT 'pending',
      compliance_check TEXT,
      ai_analysis TEXT,
      documents_required TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS batch_trace (
      id TEXT PRIMARY KEY,
      batch_number TEXT UNIQUE NOT NULL,
      product TEXT NOT NULL,
      plant TEXT NOT NULL,
      production_date DATE NOT NULL,
      raw_materials TEXT,
      quality_checks TEXT,
      process_log TEXT,
      shipments TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );
  `);

  // Indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_batch_trace_batch ON batch_trace(batch_number);`);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
    CREATE INDEX IF NOT EXISTS idx_complaints_customer_country ON complaints(customer_country);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_destination_country ON invoices(destination_country);
    CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
  `);

  const auditCount = db.prepare('SELECT COUNT(*) as count FROM audits').get() as { count: number };
  if (auditCount.count === 0) {
    seedSampleData();
  }
}

function seedSampleData() {

  const insertAudit = db.prepare(
    'INSERT INTO audits (id, title, type, product, supplier, location, status, score, checklist, findings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  insertAudit.run(uuidv4(), 'Q1 Supplier Quality Audit - Sunrise Packaging', 'supplier',
    'HDPE Containers', 'Sunrise Packaging Ltd', 'Mumbai', 'completed', 82,
    JSON.stringify(['Visual inspection', 'Dimensional check', 'Material test', 'Documentation review', 'Labeling compliance']),
    JSON.stringify(['Minor labeling inconsistency on 2% of units', 'Batch coding partially faded on one lot']));

  insertAudit.run(uuidv4(), 'GMP Compliance Audit - Production Line 3', 'internal',
    'Biscuit Manufacturing', null, 'Pune Plant', 'in_progress', null,
    JSON.stringify(['Hygiene standards check', 'Equipment calibration records', 'Personnel training records', 'Record keeping', 'Pest control logs']),
    null);

  insertAudit.run(uuidv4(), 'Export Compliance Audit - EU Markets', 'regulatory',
    'Snack Foods', null, 'Head Office', 'pending', null, null, null);

  const insertComplaint = db.prepare(
    'INSERT INTO complaints (id, complaint_ref, customer_name, customer_country, product, batch_number, complaint_date, description, category, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  insertComplaint.run(uuidv4(), 'CMP-2024-001', 'Metro Supermarkets GmbH', 'Germany',
    'Premium Digestive Biscuits 200g', 'B2024-0312-A', '2024-03-12',
    'Foreign object found in biscuit packet - small metal fragment approximately 2mm',
    'quality', 'critical', 'investigating');

  insertComplaint.run(uuidv4(), 'CMP-2024-002', 'Al Meera Consumer Goods', 'Qatar',
    'Cream Crackers 300g', 'B2024-0218-C', '2024-03-05',
    'Product arrived with damaged packaging, 15% of cartons had broken seals',
    'packaging', 'high', 'resolved');

  insertComplaint.run(uuidv4(), 'CMP-2024-003', 'FairPrice Singapore', 'Singapore',
    'Wheat Crackers 250g', 'B2024-0301-B', '2024-03-18',
    'Product shelf life shorter than declared on packaging by 3 weeks',
    'labeling', 'medium', 'open');

  const insertInvoice = db.prepare(
    'INSERT INTO invoices (id, invoice_number, customer_name, destination_country, invoice_date, items, total_amount, currency, payment_terms, incoterms, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  insertInvoice.run(uuidv4(), 'INV-2024-0421', 'Tesco Stores Ltd', 'United Kingdom', '2024-03-20',
    JSON.stringify([
      { description: 'Premium Digestive Biscuits 200g x 48 cases', quantity: 480, unit_price: 8.50, total: 4080 },
      { description: 'Cream Crackers 300g x 36 cases', quantity: 360, unit_price: 10.20, total: 3672 },
    ]),
    7752, 'GBP', 'NET 60', 'CIF', 'pending');

  insertInvoice.run(uuidv4(), 'INV-2024-0415', 'Carrefour UAE', 'United Arab Emirates', '2024-03-15',
    JSON.stringify([
      { description: 'Snack Mix 150g x 24 cases', quantity: 240, unit_price: 12.00, total: 2880 },
      { description: 'Wheat Crackers 250g x 48 cases', quantity: 480, unit_price: 9.80, total: 4704 },
    ]),
    7584, 'USD', 'NET 45', 'FOB', 'approved');

  insertInvoice.run(uuidv4(), 'INV-2024-0418', 'Sainsbury\'s Supermarkets Ltd', 'United Kingdom', '2024-03-18',
    JSON.stringify([
      { description: 'Premium Wheat Crackers 250g x 60 cases', quantity: 600, unit_price: 9.50, total: 5700 },
      { description: 'Snack Mix 150g x 36 cases', quantity: 360, unit_price: 11.00, total: 3960 },
    ]),
    9660, 'GBP', 'NET 45', 'CIF', 'approved');

  insertComplaint.run(uuidv4(), 'CMP-2024-004', 'Lulu Hypermarket', 'United Arab Emirates',
    'Snack Mix 150g', 'B2024-0225-D', '2024-03-20',
    'Product taste and texture noticeably different from previous batches, customers returning products',
    'quality', 'medium', 'open');

  // Batch trace seed data
  const insertBatchTrace = db.prepare(
    'INSERT INTO batch_trace (id, batch_number, product, plant, production_date, raw_materials, quality_checks, process_log, shipments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  insertBatchTrace.run(uuidv4(), 'B2024-0312-A', 'Premium Digestive Biscuits', 'Mumbai Plant', '2024-03-10',
    JSON.stringify({ flour: 'Lot FL-0312', sugar: 'Lot SG-0309', palmOil: 'Lot PO-0311' }),
    JSON.stringify({ metalDetection: 'pass', moisture: '4.2%', microbio: 'pending at time of shipment' }),
    JSON.stringify({ mixing: '06:00', baking: '08:30', cooling: '10:00', packaging: '11:30', metalDetectorCalibration: '05:45' }),
    JSON.stringify({ container: 'MSCU1234567', shipped: '2024-03-14', vessel: 'MSC Lorena' })
  );

  insertBatchTrace.run(uuidv4(), 'B2024-0218-C', 'Cream Crackers', 'Pune Plant', '2024-02-16',
    JSON.stringify({ flour: 'Lot FL-0215', butter: 'Lot BT-0214' }),
    JSON.stringify({ sealIntegrity: 'pass', weight: '302g avg' }),
    JSON.stringify({ steps: ['mixing', 'sheeting', 'baking', 'packaging'] }),
    JSON.stringify({ container: 'OOLU5678901', shipped: '2024-02-22' })
  );

  insertBatchTrace.run(uuidv4(), 'B2024-0301-B', 'Wheat Crackers', 'Pune Plant', '2024-02-28',
    JSON.stringify({ wheatFlour: 'Lot WF-0225', salt: 'Lot ST-0220' }),
    JSON.stringify({ shelfLifeTest: '8 months declared' }),
    JSON.stringify({ steps: ['standard'] }),
    JSON.stringify({ container: 'HLCU8901234', shipped: '2024-03-05' })
  );

  insertBatchTrace.run(uuidv4(), 'B2024-0225-D', 'Snack Mix', 'Mumbai Plant', '2024-02-23',
    JSON.stringify({ peanuts: 'Lot PN-0220', spiceBlend: 'Lot SB-0218-NEW', note: 'New supplier for spice blend' }),
    JSON.stringify({ tastePanel: 'pass', moisture: '3.8%' }),
    JSON.stringify({ steps: ['mixing', 'seasoning', 'packaging'] }),
    JSON.stringify({ container: 'CMAU2345678', shipped: '2024-03-01' })
  );
}

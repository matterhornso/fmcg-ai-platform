import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import QualityAudit from './pages/QualityAudit';
import Complaints from './pages/Complaints';
import Finance from './pages/Finance';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quality" element={<QualityAudit />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/finance" element={<Finance />} />
      </Routes>
    </Layout>
  );
}

import { useEffect, useRef } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

type ShepherdTour = InstanceType<typeof Shepherd.Tour>;

interface GuidedTourProps {
  startTour: boolean;
  onComplete: () => void;
  navigate: (path: string) => void;
}

function waitForElement(selector: string, timeout = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) {
      resolve(el);
      return;
    }
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector(selector));
    }, timeout);
  });
}

export default function GuidedTour({ startTour, onComplete, navigate }: GuidedTourProps) {
  const tourRef = useRef<ShepherdTour | null>(null);

  useEffect(() => {
    if (!startTour) return;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        classes: 'shepherd-theme-custom',
      },
    });

    tourRef.current = tour;

    // Step 1: Welcome
    tour.addStep({
      id: 'welcome',
      title: 'Welcome!',
      text: 'Welcome to FMCG AI Platform! This is your command center for managing quality audits, customer complaints, and export compliance across 35+ countries. Let\'s take a quick tour.',
      attachTo: { element: '[data-tour="sidebar-logo"]', on: 'right' },
      buttons: [
        { text: 'Skip Tour', action: tour.cancel, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 2: Sidebar Navigation
    tour.addStep({
      id: 'sidebar-nav',
      title: 'Navigation',
      text: 'Navigate between four modules: Dashboard for overview, Quality for audits, Complaints for customer issues, and Finance for export operations.',
      attachTo: { element: '[data-tour="sidebar-nav"]', on: 'right' },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 3: AI Status
    tour.addStep({
      id: 'ai-status',
      title: 'AI Status',
      text: 'This shows whether the AI agents are active. When connected, three specialized AI agents handle quality analysis, complaint classification, and export compliance.',
      attachTo: { element: '[data-tour="ai-status"]', on: 'right' },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 4: Dashboard Stats
    tour.addStep({
      id: 'dashboard-stats',
      title: 'Key Metrics',
      text: 'Real-time metrics across all modules. Track audit scores, open complaints, export values, and market reach at a glance.',
      attachTo: { element: '[data-tour="dashboard-stats"]', on: 'bottom' },
      beforeShowPromise: () => {
        navigate('/dashboard');
        return new Promise<void>((resolve) => setTimeout(resolve, 500));
      },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 5: Quick Actions
    tour.addStep({
      id: 'quick-actions',
      title: 'Quick AI Actions',
      text: 'Jump straight into the most common tasks — create an audit, log a complaint, or check export compliance.',
      attachTo: { element: '[data-tour="quick-actions"]', on: 'top' },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 6: Navigate to Quality
    tour.addStep({
      id: 'quality-audits',
      title: 'Quality Audits',
      text: 'Quality Audits: AI generates tailored checklists with 20-30 inspection points based on audit type, product, and location.',
      attachTo: { element: '[data-tour="audit-list"]', on: 'bottom' },
      beforeShowPromise: () => {
        navigate('/quality');
        return waitForElement('[data-tour="audit-list"]').then(() => new Promise<void>((r) => setTimeout(r, 300)));
      },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 7: AI Tools
    tour.addStep({
      id: 'quality-ai-tools',
      title: 'AI-Powered Tools',
      text: 'AI-powered tools: Check country-specific import requirements, predict shelf-life for export routes, and assess contamination risks.',
      attachTo: { element: '[data-tour="quality-ai-tools"]', on: 'bottom' },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 8: Navigate to Complaints
    tour.addStep({
      id: 'complaints',
      title: 'Customer Complaints',
      text: 'Customer Complaints: AI automatically classifies complaints by category and priority, then suggests immediate actions.',
      attachTo: { element: '[data-tour="complaint-list"]', on: 'bottom' },
      beforeShowPromise: () => {
        navigate('/complaints');
        return waitForElement('[data-tour="complaint-list"]').then(() => new Promise<void>((r) => setTimeout(r, 300)));
      },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 9: AI Chat
    tour.addStep({
      id: 'ai-chat',
      title: 'AI Chat Agent',
      text: 'Each module has a dedicated AI chat agent. Ask questions about quality standards, complaint procedures, or export regulations.',
      attachTo: { element: '[data-tour="ai-chat"]', on: 'left' },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 10: Navigate to Finance
    tour.addStep({
      id: 'finance',
      title: 'Finance & Export',
      text: 'Finance & Export: Manage invoices, validate compliance, classify HS codes, analyze export incentives, and check FTA benefits.',
      attachTo: { element: '[data-tour="invoice-list"]', on: 'bottom' },
      beforeShowPromise: () => {
        navigate('/finance');
        return waitForElement('[data-tour="invoice-list"]').then(() => new Promise<void>((r) => setTimeout(r, 300)));
      },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 11: Action Buttons
    tour.addStep({
      id: 'invoice-actions',
      title: 'AI Invoice Actions',
      text: 'AI-powered actions for every invoice: validate compliance, classify tariff codes, analyze financial risk, and calculate export incentive benefits.',
      attachTo: { element: '[data-tour="invoice-actions"]', on: 'bottom' },
      beforeShowPromise: () => {
        return waitForElement('[data-tour="invoice-actions"]').then(() => new Promise<void>((r) => setTimeout(r, 200)));
      },
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    // Step 12: Complete
    tour.addStep({
      id: 'complete',
      title: 'You\'re All Set!',
      text: 'You\'re all set! Explore the platform, try the AI features, and manage your export operations with confidence.',
      buttons: [
        { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
        { text: 'Finish Tour', action: tour.next, classes: 'shepherd-button-primary' },
      ],
    });

    tour.on('complete', () => {
      onComplete();
      navigate('/dashboard');
    });

    tour.on('cancel', () => {
      onComplete();
      navigate('/dashboard');
    });

    tour.start();

    return () => {
      if (tourRef.current) {
        tourRef.current.cancel();
        tourRef.current = null;
      }
    };
  }, [startTour, onComplete, navigate]);

  return null;
}

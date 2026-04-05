import React from 'react';
import { Bot, Database, Search, Shield, Sparkles, Workflow, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader, SurfaceCard, fadeUp } from '../components/ui';

const pillars = [
  {
    icon: Search,
    title: 'The problem',
    body: 'Healthcare EDI is accurate but difficult to inspect manually. Important details get buried in loops, qualifiers, service lines, and adjustment codes that slow down review.',
  },
  {
    icon: Database,
    title: 'The architecture',
    body: 'A Python parsing engine structures the transaction, while the React interface turns those structures into readable panels, semantic views, and guided workflows.',
  },
  {
    icon: Shield,
    title: 'The trust model',
    body: 'The product is designed to feel dependable: stronger hierarchy, denser organization, clearer actions, and lower visual noise for analysts and operators.',
  },
  {
    icon: Bot,
    title: 'The AI layer',
    body: 'Claim-aware chat sits next to validation and semantic data so users can ask questions, summarize issues, and investigate denials without leaving context.',
  },
];

const workflowSteps = [
  {
    title: 'Upload',
    body: 'Users can submit an EDI file directly, upload remittance files for comparison, or work with archive-based batch processing.',
  },
  {
    title: 'Parse',
    body: 'The backend maps raw segments into transaction-aware structures such as providers, subscribers, claims, service lines, and adjustments.',
  },
  {
    title: 'Review',
    body: 'Semantic view, raw EDI, validation feedback, and AI chat are kept together so users do not lose context while debugging or auditing.',
  },
  {
    title: 'Act',
    body: 'The interface helps users identify missing data, invalid codes, payment mismatch, and claim-level issues faster than reading raw EDI directly.',
  },
];

const userOutcomes = [
  'Understand what transaction they are looking at without decoding raw segments manually.',
  'See which loops, fields, and values matter in a clearer, structured representation.',
  'Catch validation errors and warnings before they affect downstream claim handling.',
  'Compare billed and paid outcomes with a more usable reconciliation workflow.',
  'Ask follow-up questions in plain language through the AI-guided claim assistant.',
];

const About = () => {
  return (
    <div className="page-shell space-y-6">
      <section className="glass-panel-strong p-6 sm:p-8 lg:p-10">
        <PageHeader
          eyebrow="About ClaimCraft"
          title="A modern interpretation layer for healthcare EDI."
          description="ClaimCraft turns raw X12 transactions into a structured, trustworthy review workspace for parsing, validation, semantic inspection, and payment intelligence."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pillars.map(({ icon: Icon, title, body }, index) => (
          <motion.div key={title} {...fadeUp} transition={{ duration: 0.4, delay: index * 0.06 }}>
            <SurfaceCard className="h-full p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[color:rgba(15,108,189,0.12)] text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
            </SurfaceCard>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-[20px] bg-[color:rgba(10,143,122,0.12)] p-4 text-accent">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">Why this frontend direction matters</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                EDI tools often feel either too raw for operations teams or too generic to support real claim workflows. ClaimCraft is designed to sit between those extremes: strong enough for technical review, clear enough for analysts, and polished enough to inspire trust from first use.
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                The interface emphasizes clear structure, useful motion, and efficient space usage so users can move from upload to interpretation without visual confusion or wasted effort.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-[20px] bg-[color:rgba(227,165,43,0.14)] p-4 text-warm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">What users should feel</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Calm, guided, and confident. Every screen should answer three questions fast: what file am I looking at, what is the system telling me, and what should I do next?
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                That is why the product focuses on cleaner hierarchy, stronger labels, visible system state, and fewer disconnected workflows.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-[18px] bg-[color:rgba(15,108,189,0.12)] p-3 text-primary">
              <Workflow className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">How ClaimCraft works</h2>
          </div>

          <div className="mt-6 space-y-4">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-strong)] px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:rgba(15,108,189,0.12)] text-sm font-extrabold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-[18px] bg-[color:rgba(10,143,122,0.12)] p-3 text-accent">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">What this helps users do</h2>
          </div>

          <div className="mt-6 space-y-3">
            {userOutcomes.map((item) => (
              <div key={item} className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                {item}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
};

export default About;

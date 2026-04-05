import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  FileStack,
  GitCompareArrows,
  MessagesSquare,
  ScanSearch,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { useEdiStore } from '../store/useEdiStore';
import { MetricCard, PageHeader, SectionTitle, SurfaceCard, fadeUp } from '../components/ui';
import Welcome, { shouldShowWelcome } from './Welcome';

const trustMetrics = [
  {
    label: 'Supported Flows',
    value: '837, 835, 834',
    hint: 'Single claims, remittances, enrollment, and archive uploads in one frontend.',
    accent: 'var(--accent-primary)',
  },
  {
    label: 'Review Modes',
    value: 'Validate + Chat',
    hint: 'Structured validation, semantic tree inspection, and AI-guided reasoning.',
    accent: 'var(--accent-secondary)',
  },
  {
    label: 'Built For',
    value: 'Revenue Ops',
    hint: 'Clear enough for analysts, dense enough for technical teams and auditors.',
    accent: 'var(--accent-warm)',
  },
];

const features = [
  {
    icon: ScanSearch,
    title: 'Deep EDI parsing',
    body: 'Turn raw loops and segments into structured, readable clinical and financial records.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust-first validation',
    body: 'Surface rule violations, warnings, and claim-level confidence signals without clutter.',
  },
  {
    icon: MessagesSquare,
    title: 'Guided claim analysis',
    body: 'Ask what happened, why a claim failed, and where the data quality risk sits.',
  },
  {
    icon: GitCompareArrows,
    title: 'Fast reconciliation',
    body: 'Compare billed and paid amounts to expose shortfalls and denial patterns quickly.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Upload a file or archive',
    body: 'Drop an `.edi`, `.txt`, or `.zip` package into the workspace. No backend changes required.',
  },
  {
    step: '02',
    title: 'Inspect structured output',
    body: 'Open semantic trees, validation feedback, and raw segments in a denser, easier-to-scan layout.',
  },
  {
    step: '03',
    title: 'Act with confidence',
    body: 'Use AI chat and reconciliation views to triage errors, denials, and payment variance.',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const setParsedData = useEdiStore((state) => state.setParsedData);
  const setBatchData = useEdiStore((state) => state.setBatchData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(() => shouldShowWelcome());

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('/api/parse', formData);
        const { data } = response;

        if (data.batch) {
          setBatchData(data.results || []);
          navigate('/batch', { state: { batchData: data.results } });
        } else {
          setParsedData(data);
          navigate('/claims');
        }
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'An error occurred during parsing.');
      } finally {
        setLoading(false);
      }
    },
    [navigate, setBatchData, setParsedData],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  const panelState = useMemo(() => {
    if (loading) return 'loading';
    if (isDragActive) return 'active';
    return 'idle';
  }, [isDragActive, loading]);

  return (
    <>
      <AnimatePresence>
        {showIntro ? (
          <Welcome onEnter={() => setShowIntro(false)} />
        ) : null}
      </AnimatePresence>

      <div className="page-shell space-y-4">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-panel-strong overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <PageHeader
                  eyebrow="Healthcare EDI Command Center"
                  title="A parser interface that looks credible, feels fast, and earns trust."
                  description="ClaimCraft converts dense X12 transactions into a modern review experience with stronger hierarchy, better space usage, and guided workflows for parsing, validation, AI chat, and reconciliation."
                />

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('upload-panel')?.scrollIntoView({ behavior: 'smooth' })}
                    className="btn-primary"
                  >
                    Start Parsing
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/reconcile')}
                    className="btn-secondary"
                  >
                    Open Reconciliation
                  </button>
                </div>

              </div>

              <motion.div
                className="hero-review-shell rounded-[28px] p-5"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="grid gap-4">
                  <div className="rounded-[22px] border bg-[var(--bg-surface-strong)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Review Surface</p>
                        <p className="mt-2 text-xl font-bold">Parse, validate, reconcile</p>
                      </div>
                      <div className="rounded-2xl bg-[color:rgba(10,143,122,0.12)] p-3 text-accent">
                        <FileStack className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {['Semantic tree view', 'Rule-aware validation panel', 'AI copilot for claim questions'].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div
            id="upload-panel"
            {...getRootProps()}
            className={`glass-panel-strong cursor-pointer p-6 transition duration-300 sm:p-8 ${
              panelState === 'active' ? 'scale-[1.01] border-[var(--accent-primary)]' : ''
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex h-full min-h-[560px] flex-col gap-6">
              <div>
                <span className="hero-badge border-[var(--border-strong)] text-primary">Parse Interface</span>
                <h2 className="mt-4 text-3xl font-extrabold text-[var(--text-primary)]">Upload your EDI input</h2>
                <p
                  className="mt-3 text-base leading-7"
                  style={{ color: 'color-mix(in srgb, var(--text-primary) 74%, var(--bg-base) 26%)' }}
                >
                  Drop one file for single-claim review, or a `.zip` archive for batch results. Existing API routes remain exactly the same.
                </p>
              </div>

              <div className="flex flex-1">
                <div className="upload-dropzone-shell flex w-full flex-1 flex-col items-center justify-center rounded-[28px] p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--bg-surface-strong)] text-primary shadow-[var(--shadow-sm)]">
                  <UploadCloud className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-lg font-bold">
                    {loading ? 'Parsing your file...' : isDragActive ? 'Release to upload' : 'Drag, drop, or click to browse'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Accepted: `.edi`, `.txt`, `.zip`
                  </p>
                </div>
              </div>

              {error ? (
                <div className="rounded-[20px] border border-[color:rgba(205,60,68,0.2)] bg-[color:rgba(205,60,68,0.1)] px-4 py-3 text-sm font-medium text-danger">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {trustMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="section-shell">
          <SectionTitle
            eyebrow="What Makes It Better"
            title="Denser, calmer, and more trustworthy than a generic parser."
            description="The new structure avoids dead whitespace, sharpens information hierarchy, and keeps primary actions close to the data users need."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, body }, index) => (
              <motion.div
                key={title}
                {...fadeUp}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="trust-card"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[color:rgba(15,108,189,0.12)] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="section-shell">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionTitle
              eyebrow="Workflow"
              title="A clear three-step path from raw transaction to action."
              description="Each screen is designed to keep users oriented: where they are, what happened, and what they should do next."
            />
            <div className="grid gap-4">
              {workflow.map((item, index) => (
                <motion.div
                  key={item.step}
                  {...fadeUp}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="trust-card flex items-start gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[color:rgba(10,143,122,0.12)] text-lg font-extrabold text-accent">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;

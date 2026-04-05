import React from 'react';
import { motion } from 'framer-motion';

export const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
};

export const PageHeader = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="max-w-3xl">
      {eyebrow ? (
        <span className="hero-badge border-[var(--border-strong)] text-primary">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[var(--text-primary)] sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p
          className="mt-3 max-w-2xl text-base leading-7 sm:text-lg"
          style={{ color: 'color-mix(in srgb, var(--text-primary) 72%, var(--bg-base) 28%)' }}
        >
          {description}
        </p>
      ) : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const SectionTitle = ({ eyebrow, title, description, align = 'left' }) => (
  <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
    {eyebrow ? (
      <span className="hero-badge border-[var(--border-strong)] text-primary">{eyebrow}</span>
    ) : null}
    <h2 className="mt-4 text-3xl font-extrabold leading-tight text-[var(--text-primary)] sm:text-4xl">{title}</h2>
    {description ? (
      <p
        className="mt-3 text-base leading-7 sm:text-lg"
        style={{ color: 'color-mix(in srgb, var(--text-primary) 72%, var(--bg-base) 28%)' }}
      >
        {description}
      </p>
    ) : null}
  </div>
);

export const MetricCard = ({ label, value, hint, accent = 'var(--accent-primary)' }) => (
  <motion.div
    {...fadeUp}
    transition={{ duration: 0.45 }}
    className="metric-card"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
        <p className="mt-2 text-3xl font-extrabold leading-none" style={{ color: accent }}>
          {value}
        </p>
      </div>
      <div
        className="h-10 w-10 rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${accent}33, transparent)` }}
      />
    </div>
    {hint ? <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{hint}</p> : null}
  </motion.div>
);

export const SurfaceCard = ({ children, className = '' }) => (
  <div className={`trust-card ${className}`.trim()}>{children}</div>
);

export const Pill = ({ children, tone = 'default' }) => {
  const tones = {
    default: 'border-[var(--border-default)] bg-[var(--bg-surface-strong)] text-[var(--text-secondary)]',
    success: 'border-[color:rgba(15,139,95,0.2)] bg-[color:rgba(15,139,95,0.12)] text-success',
    danger: 'border-[color:rgba(205,60,68,0.2)] bg-[color:rgba(205,60,68,0.12)] text-danger',
    warning: 'border-[color:rgba(214,134,29,0.2)] bg-[color:rgba(214,134,29,0.14)] text-warning',
    primary: 'border-[var(--border-strong)] bg-[color:rgba(15,108,189,0.12)] text-primary',
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

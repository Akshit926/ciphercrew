import React, { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  CircleDollarSign,
  RotateCcw,
  UploadCloud,
} from 'lucide-react';
import { MetricCard, PageHeader } from '../components/ui';

const Reconcile = () => {
  const [data837, setData837] = useState(null);
  const [data835, setData835] = useState(null);
  const [fileNames, setFileNames] = useState({ 837: '', 835: '' });
  const [loadingFile, setLoadingFile] = useState({ 837: false, 835: false });
  const [reconciling, setReconciling] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const canReconcile = Boolean(data837 && data835 && !reconciling);
  const hasAnyUploadedFile = Boolean(data837 || data835 || fileNames[837] || fileNames[835]);

  const clearReconciliationState = () => {
    setData837(null);
    setData835(null);
    setFileNames({ 837: '', 835: '' });
    setLoadingFile({ 837: false, 835: false });
    setReconciling(false);
    setResults(null);
    setError(null);
  };

  const handleUpload = async (file, type) => {
    setLoadingFile((prev) => ({ ...prev, [type]: true }));
    setFileNames((prev) => ({ ...prev, [type]: file.name }));
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/parse', formData);
      if (type === 837) setData837(res.data);
      if (type === 835) setData835(res.data);
    } catch (err) {
      setError(`Failed to parse ${type} file.`);
    } finally {
      setLoadingFile((prev) => ({ ...prev, [type]: false }));
    }
  };

  const onDrop837 = useCallback((acceptedFiles) => {
    if (acceptedFiles.length) handleUpload(acceptedFiles[0], 837);
  }, []);

  const onDrop835 = useCallback((acceptedFiles) => {
    if (acceptedFiles.length) handleUpload(acceptedFiles[0], 835);
  }, []);

  const drop837 = useDropzone({ onDrop: onDrop837, multiple: false });
  const drop835 = useDropzone({ onDrop: onDrop835, multiple: false });

  const runReconciliation = async () => {
    if (!data837 || !data835) return;
    setReconciling(true);
    setError(null);

    try {
      const res = await axios.post('/api/reconcile', {
        parsed_837: data837,
        parsed_835: data835,
      });
      setResults(res.data.matched_claims || []);
    } catch (err) {
      setError('Reconciliation failed. Check your data formats.');
    } finally {
      setReconciling(false);
    }
  };

  const totals = useMemo(() => {
    const rows = results || [];
    const billed = rows.reduce((sum, item) => sum + Number.parseFloat(item.billed || 0), 0);
    const paid = rows.reduce((sum, item) => sum + Number.parseFloat(item.paid || 0), 0);
    const delta = rows.reduce((sum, item) => sum + Number.parseFloat(item.delta || 0), 0);
    return {
      billed: billed.toFixed(2),
      paid: paid.toFixed(2),
      delta: delta.toFixed(2),
    };
  }, [results]);

  const renderDropzone = (title, subtitle, dropzone, data, loading, fileName, tone) => (
    <div
      {...dropzone.getRootProps()}
      className={`glass-panel-strong cursor-pointer p-6 transition duration-300 ${
        dropzone.isDragActive ? 'scale-[1.01] border-[var(--accent-primary)]' : ''
      }`}
    >
      <input {...dropzone.getInputProps()} />
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-[20px]"
            style={{
              background:
                tone === 'primary'
                  ? 'rgba(15,108,189,0.12)'
                  : 'rgba(10,143,122,0.12)',
            }}
          >
            {data ? <CheckCircle2 className="h-6 w-6 text-success" /> : <UploadCloud className="h-6 w-6 text-primary" />}
          </div>
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-base)] px-4 py-8 text-center">
          <p className="text-base font-semibold">
            {loading ? 'Parsing file...' : data ? 'Parsed successfully' : 'Drag and drop or click to select'}
          </p>
          {fileName ? (
            <p className="mt-3 break-all rounded-full border border-[var(--border-default)] bg-[var(--bg-surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
              {fileName}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {data ? 'This transaction is ready for reconciliation.' : 'Supports standard healthcare EDI claim and remittance files.'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-shell space-y-6">
      <section className="glass-panel-strong p-6 sm:p-8 lg:p-10">
        <PageHeader
          eyebrow="835 vs 837 Reconciliation"
          title="Compare billed versus paid outcomes in one review surface."
          description="Upload the original 837 claim and matching 835 remittance. The UI stays focused on the variance that matters: claim totals, shortfalls, and adjustment reasons."
          action={hasAnyUploadedFile ? (
            <button
              type="button"
              onClick={clearReconciliationState}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 self-start rounded-full border border-[var(--accent-primary)] bg-[linear-gradient(135deg,var(--accent-primary),#0b82c6)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(15,108,189,0.22)] transition hover:brightness-[1.04]"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Records
            </button>
          ) : null}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard label="837 Claim" value={data837 ? 'Loaded' : 'Pending'} hint="Original billed claim file." accent="var(--accent-primary)" />
        <MetricCard label="835 Remit" value={data835 ? 'Loaded' : 'Pending'} hint="Payment and adjustment source." accent="var(--accent-secondary)" />
        <MetricCard label="Results" value={results ? `${results.length}` : '--'} hint="Matched claims returned from the backend." accent="var(--accent-warm)" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        {renderDropzone('837 Claim File', 'Upload the claim that was submitted for billing.', drop837, data837, loadingFile[837], fileNames[837], 'primary')}
        <div className="hidden justify-center lg:flex">
          <motion.button
            type="button"
            onClick={runReconciliation}
            disabled={!canReconcile}
            animate={
              canReconcile
                ? {
                    scale: [1, 1.06, 1],
                    boxShadow: [
                      '0 0 0 rgba(15,108,189,0)',
                      '0 0 0 10px rgba(15,108,189,0.12)',
                      '0 0 0 rgba(15,108,189,0)',
                    ],
                  }
                : { scale: 1, boxShadow: '0 0 0 rgba(15,108,189,0)' }
            }
            transition={
              canReconcile
                ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
            className={`flex h-20 w-20 items-center justify-center rounded-full border transition-all duration-300 ${
              canReconcile
                ? 'border-[var(--accent-primary)] bg-[linear-gradient(135deg,var(--accent-primary),#0b82c6)] text-white shadow-[0_18px_45px_rgba(15,108,189,0.28)]'
                : 'bg-[var(--bg-surface)] text-primary shadow-[var(--shadow-sm)]'
            } ${!canReconcile ? 'cursor-not-allowed opacity-75' : ''}`}
            aria-label="Run reconciliation"
          >
            {reconciling ? (
              <div className="h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Activity className={`h-6 w-6 ${canReconcile ? 'text-white' : 'text-primary'}`} />
            )}
          </motion.button>
        </div>
        {renderDropzone('835 Remittance File', 'Upload the payer response to compare payment outcome.', drop835, data835, loadingFile[835], fileNames[835], 'accent')}
      </section>

      {error ? (
        <section className="rounded-[22px] border border-[color:rgba(205,60,68,0.2)] bg-[color:rgba(205,60,68,0.1)] px-5 py-4 text-sm font-semibold text-danger">
          {error}
        </section>
      ) : null}

      {results ? (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <MetricCard label="Total Billed" value={`$${totals.billed}`} hint="Combined billed amount from matched claims." accent="var(--accent-primary)" />
            <MetricCard label="Total Paid" value={`$${totals.paid}`} hint="Combined paid amount from remittance output." accent="var(--accent-secondary)" />
            <MetricCard label="Net Delta" value={`$${totals.delta}`} hint="Shortfall or overpayment across the returned set." accent="var(--danger)" />
          </section>

          <section className="table-shell">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Reconciliation Report</p>
                <h2 className="mt-1 text-xl font-bold">Matched claims and payment variance</h2>
              </div>
              <div className="rounded-2xl bg-[color:rgba(15,108,189,0.12)] p-3 text-primary">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--bg-base)] text-[var(--text-soft)]">
                  <tr>
                    <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Claim ID</th>
                    <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Billed</th>
                    <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Paid</th>
                    <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Delta</th>
                    <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Adjustment Reasons</th>
                    <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, index) => {
                    const delta = Number.parseFloat(item.delta || 0);
                    const isMatched = delta === 0;

                    return (
                      <tr key={`${item.claim_id || 'claim'}-${index}`} className="border-t transition hover:bg-[var(--bg-base)]">
                        <td className="px-5 py-4 font-code text-xs sm:text-sm">{item.claim_id || 'N/A'}</td>
                        <td className="px-5 py-4 font-semibold">${Number.parseFloat(item.billed || 0).toFixed(2)}</td>
                        <td className="px-5 py-4 font-semibold">${Number.parseFloat(item.paid || 0).toFixed(2)}</td>
                        <td className={`px-5 py-4 font-semibold ${isMatched ? 'text-success' : 'text-danger'}`}>
                          ${delta.toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-[var(--text-secondary)]">
                          {item.adjustments?.length ? item.adjustments.map((adj) => adj.reason_code).join(', ') : 'None'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isMatched
                                ? 'bg-[color:rgba(15,139,95,0.12)] text-success'
                                : 'bg-[color:rgba(205,60,68,0.12)] text-danger'
                            }`}
                          >
                            {isMatched ? 'Matched' : 'Shortfall'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-10 text-center text-[var(--text-secondary)]">
                        No differences found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

export default Reconcile;

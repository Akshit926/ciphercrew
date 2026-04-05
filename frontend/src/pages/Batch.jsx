import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronRight, FileStack, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { useEdiStore } from '../store/useEdiStore';
import { MetricCard, PageHeader, Pill } from '../components/ui';

const Batch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setParsedData = useEdiStore((state) => state.setParsedData);
  const storedBatchData = useEdiStore((state) => state.batchData);
  const setBatchData = useEdiStore((state) => state.setBatchData);
  const clearBatchData = useEdiStore((state) => state.clearBatchData);
  const [batchData, setBatchDataState] = useState(() => storedBatchData.length > 0 ? storedBatchData : (location.state?.batchData || []));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedName, setUploadedName] = useState('');

  useEffect(() => {
    if (location.state?.batchData?.length) {
      setBatchData(location.state.batchData);
    }
  }, [location.state, setBatchData]);

  useEffect(() => {
    if (storedBatchData.length > 0) {
      setBatchDataState(storedBatchData);
      return;
    }

    if (location.state?.batchData?.length) {
      setBatchDataState(location.state.batchData);
      return;
    }

    setBatchDataState([]);
  }, [location.state, storedBatchData]);

  const handleViewFile = (item) => {
    setParsedData({
      ...item,
      parsed: item?.parsed || item,
      validation: item?.validation || {},
    });
    navigate('/claims');
  };

  const handleClearBatch = () => {
    clearBatchData();
    setBatchDataState([]);
    setUploadedName('');
    setUploadError('');
    navigate('/batch', { replace: true, state: null });
  };

  const handleZipUpload = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setUploadError('');
    setUploadedName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/parse', formData);
      const { data } = response;
      const results = data?.results || [];
      setBatchData(results);
      setBatchDataState(results);
      navigate('/batch', { replace: true, state: { batchData: results } });
    } catch (err) {
      setUploadError(err.response?.data?.detail || err.message || 'Failed to upload archive.');
    } finally {
      setUploading(false);
    }
  }, [navigate]);

  const batchDropzone = useDropzone({
    onDrop: handleZipUpload,
    multiple: false,
    accept: { 'application/zip': ['.zip'] },
  });

  const summary = useMemo(() => {
    let passed = 0;
    let flagged = 0;

    batchData.forEach((item) => {
      const errors =
        item?.validation?.errors?.length ||
        item?.parsed?.errors?.length ||
        item?.errors?.length ||
        0;
      if (item.status === 'success' || errors === 0) passed += 1;
      else flagged += 1;
    });

    return { passed, flagged };
  }, [batchData]);

  return (
    <div className="page-shell space-y-6">
      <section className="glass-panel-strong p-6 sm:p-8 lg:p-10">
        <PageHeader
          eyebrow="Batch Processing"
          title="Review archive-level outcomes without losing file-level detail."
          description="The batch screen is now denser and easier to scan, so users can move from a zip upload to a specific claim review in one click."
          action={
            <div
              {...batchDropzone.getRootProps()}
              className={`batch-upload-shell w-full cursor-pointer rounded-[28px] p-6 text-center transition duration-300 sm:w-[320px] ${
                batchDropzone.isDragActive ? 'scale-[1.01] border-[var(--accent-primary)]' : ''
              }`}
            >
              <input {...batchDropzone.getInputProps()} />
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--bg-surface-strong)] text-primary shadow-[var(--shadow-sm)]">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">
                {uploading ? 'Uploading archive...' : batchDropzone.isDragActive ? 'Release to upload' : 'Upload Another Archive'}
              </p>
              {uploadedName ? (
                <p className="mt-3 break-all rounded-full border border-[var(--border-default)] bg-[var(--bg-surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
                  {uploadedName}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Accepted: `.zip`</p>
            </div>
          }
        />

        <div className="mt-6 flex flex-wrap gap-3">
          <Pill tone="primary">
            <FileStack className="h-3.5 w-3.5" />
            Ready for claim drilldown
          </Pill>
          <Pill tone="success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Clear pass and fail signals
          </Pill>
          {batchData.length > 0 ? (
            <button type="button" onClick={handleClearBatch} className="btn-secondary">
              <Trash2 className="h-4 w-4" />
              Remove Saved Archive
            </button>
          ) : null}
        </div>

        {uploadError ? (
          <div className="mt-5 rounded-[18px] border border-[color:rgba(205,60,68,0.2)] bg-[color:rgba(205,60,68,0.1)] px-4 py-3 text-sm font-medium text-danger">
            {uploadError}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard label="Files Processed" value={`${batchData.length}`} hint="Entries returned from the batch parser." accent="var(--accent-primary)" />
        <MetricCard label="Passed" value={`${summary.passed}`} hint="Files with no critical validation failures." accent="var(--success)" />
        <MetricCard label="Flagged" value={`${summary.flagged}`} hint="Files that need follow-up or failed validation." accent="var(--danger)" />
      </section>

      <section className="table-shell">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Batch Results</p>
            <h2 className="mt-1 text-xl font-bold">Archive contents</h2>
          </div>
        </div>

        {batchData.length === 0 ? (
          <div className="px-6 py-16 text-center text-[var(--text-secondary)]">
            No batch data found. Upload a `.zip` file here to populate this view.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-base)] text-[var(--text-soft)]">
                <tr>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">File</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Transaction</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Validation</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em]">Status</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-[0.14em] text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {batchData.map((item, index) => {
                  const fileName = item.filename || item.file_name || `File ${index + 1}`;
                  const txType =
                    item?.parsed?.transaction_info?.type ||
                    item?.parsed?.transaction_info?.transaction_type ||
                    item?.transaction_info?.type ||
                    item?.transaction_info?.transaction_type ||
                    item?.transaction_type ||
                    'EDI';
                  const parseErrors = item?.parsed?.errors?.length || item?.errors?.length || 0;
                  const validationErrorsLength = item?.validation?.errors?.length || 0;
                  const errorCount = parseErrors + validationErrorsLength;
                  const passed = item.status === 'success' || errorCount === 0;

                  return (
                    <tr
                      key={`${fileName}-${index}`}
                      className="cursor-pointer border-t transition hover:bg-[var(--bg-base)]"
                      onClick={() => handleViewFile(item)}
                    >
                      <td className="px-5 py-4 font-semibold">{fileName}</td>
                      <td className="px-5 py-4 text-[var(--text-secondary)]">{txType}</td>
                      <td className="px-5 py-4">
                        {errorCount > 0 ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(214,134,29,0.14)] px-3 py-1 text-xs font-semibold text-warning">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {errorCount} issue{errorCount === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {passed ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(15,139,95,0.12)] px-3 py-1 text-xs font-semibold text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(205,60,68,0.12)] px-3 py-1 text-xs font-semibold text-danger">
                            <XCircle className="h-3.5 w-3.5" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-primary">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          View
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Batch;

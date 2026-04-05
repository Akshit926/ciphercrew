import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileCode2,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useEdiStore } from '../store/useEdiStore';
import SemanticClaimViewer from '../components/SemanticClaimViewer';
import { MetricCard, Pill } from '../components/ui';
import AutoFixModal from '../components/AutoFixModal';

const tabs = [
  { id: 'validation', label: 'Validation', icon: ClipboardCheck },
  { id: 'chat', label: 'AI Chat', icon: MessageSquareText },
];

const buildValidationItems = (data) => [
  ...(data?.parsed?.errors || data?.errors || []),
  ...(data?.validation?.errors || []),
  ...(data?.parsed?.warnings || data?.warnings || []),
  ...(data?.validation?.warnings || []),
];

const TypewriterText = ({ text, animate }) => {
  const [visibleText, setVisibleText] = useState(animate ? '' : text);

  useEffect(() => {
    if (!animate) {
      setVisibleText(text);
      return undefined;
    }

    let index = 0;
    setVisibleText('');
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 12);

    return () => window.clearInterval(timer);
  }, [animate, text]);

  return (
    <>
      {visibleText.split('\n').map((line, lineIndex) => (
        <React.Fragment key={`${line}-${lineIndex}`}>
          {line}
          <br />
        </React.Fragment>
      ))}
      {animate && visibleText.length < text.length ? (
        <span className="inline-block h-4 w-[2px] animate-pulse bg-current align-middle opacity-70" />
      ) : null}
    </>
  );
};

const Claims = () => {
  const navigate = useNavigate();
  const parsedData = useEdiStore((state) => state.parsedData);

  const [validating, setValidating] = useState(false);
  const [validationItems, setValidationItems] = useState(() => buildValidationItems(parsedData));
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatting, setChatting] = useState(false);
  const [activeTab, setActiveTab] = useState('validation');
  const chatEndRef = useRef(null);
  
  const [isAutoFixOpen, setIsAutoFixOpen] = useState(false); 

  useEffect(() => {
    if (!parsedData) navigate('/');
  }, [navigate, parsedData]);

  useEffect(() => {
    setValidationItems(buildValidationItems(parsedData));
    setChatHistory([]);
    setChatMessage('');
    setActiveTab('validation');
  }, [parsedData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatting]);

  if (!parsedData) return null;

  const payload = parsedData.parsed || parsedData;
  const transactionInfo = payload.transaction_info || parsedData.transaction_info || {};
  const txType = payload.transaction_type || transactionInfo.type || transactionInfo.transaction_type || parsedData.transaction_type || 'EDI';
  const rawEdi = payload.raw_edi || payload.raw || parsedData.raw_edi || parsedData.raw || '';
  const rawSegments = rawEdi
    ? rawEdi.includes('\n')
      ? rawEdi
          .split(/\r?\n/)
          .filter((line) => line.length > 0)
      : rawEdi
          .split('~')
          .filter((segment) => segment.length > 0)
          .map((segment) => `${segment}~`)
    : [];

  const errorCount = validationItems.filter((item) => item.severity === 'ERROR' || !item.severity).length;
  const warningCount = validationItems.filter((item) => item.severity === 'WARNING').length;
  const segmentCount = payload.raw_segment_count || rawSegments.length || 0;

  const stats = useMemo(
    () => [
      {
        label: 'Transaction Type',
        value: txType,
        hint: 'Detected from parsed transaction metadata.',
        accent: 'var(--accent-primary)',
      },
      {
        label: 'Segments',
        value: `${segmentCount}`,
        hint: 'Segment count shown for raw transaction review.',
        accent: 'var(--accent-secondary)',
      },
      {
        label: 'Validation Flags',
        value: `${errorCount + warningCount}`,
        hint: 'Combined errors and warnings in the current review state.',
        accent: errorCount > 0 ? 'var(--danger)' : 'var(--accent-warm)',
      },
    ],
    [errorCount, segmentCount, txType, warningCount],
  );

  const handleFullValidate = async () => {
    setValidating(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
      const res = await axios.post(`${baseUrl}/validate/full`, { parsed: payload });
      const newErrors = res.data.errors || res.data.validation?.errors || [];
      const newWarnings = res.data.warnings || res.data.validation?.warnings || [];
      setValidationItems([...newErrors, ...newWarnings]);
    } catch (err) {
      console.error(err);
    } finally {
      setValidating(false);
    }
  };

  const handleChat = async (event) => {
    event.preventDefault();
    if (!chatMessage.trim() || chatting) return;

    const message = chatMessage.trim();
    const historyForApi = chatHistory.map((entry) => ({
      role: entry.role === 'user' ? 'user' : 'model',
      content: entry.content,
    }));

    setChatMessage('');
    setChatting(true);
    setChatHistory((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: message, animate: false },
    ]);

    try {
      const res = await axios.post('/chat', {
        message,
        history: historyForApi,
        parsed_context: {
          transaction_info: payload.transaction_info || parsedData.transaction_info,
          tree: payload.tree || parsedData.tree,
          raw_segment_count: segmentCount,
          validation_errors: validationItems.filter((item) => item.severity !== 'WARNING'),
          validation_warnings: validationItems.filter((item) => item.severity === 'WARNING'),
        },
      });

      setChatHistory((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          content: res.data.response || res.data.reply || 'No response from model.',
          animate: true,
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `model-error-${Date.now()}`,
          role: 'model',
          content: 'Unable to contact the AI assistant right now.',
          animate: true,
        },
      ]);
    } finally {
      setChatting(false);
    }
  };

  const renderValidationItem = (item, index) => {
    const isWarning = item.severity === 'WARNING';
    const message =
      typeof item === 'object' ? item.message || item.detail || item.description || JSON.stringify(item) : item;

    return (
      <div
        key={`${message}-${index}`}
        className={`rounded-[20px] border px-4 py-4 ${
          isWarning
            ? 'border-[color:rgba(214,134,29,0.2)] bg-[color:rgba(214,134,29,0.12)]'
            : 'border-[color:rgba(205,60,68,0.2)] bg-[color:rgba(205,60,68,0.12)]'
        }`}
      >
        <div className="flex gap-3">
          {isWarning ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          )}
          <div>
            <p className={`text-sm font-semibold ${isWarning ? 'text-warning' : 'text-danger'}`}>{message}</p>
            {typeof item === 'object' && (item.rule_id || item.loop || item.segment) ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.rule_id ? <Pill tone={isWarning ? 'warning' : 'danger'}>{item.rule_id}</Pill> : null}
                {item.loop ? <Pill tone="primary">{item.loop}</Pill> : null}
                {item.segment ? (
                  <Pill tone="default">
                    {item.segment}
                    {item.element ? `-${item.element}` : ''}
                  </Pill>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderRawSegment = (segment, index) => (
    <div
      key={`${segment}-${index}`}
      className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl pl-1 pr-3 py-2 hover:bg-[color:rgba(15,108,189,0.05)]"
    >
      <span className="pt-0.5 text-right font-code text-xs font-semibold tabular-nums text-[var(--text-soft)]">
        {index + 1}
      </span>
      <code className="min-w-0 whitespace-pre-wrap break-all font-code text-[13px] leading-7 text-[var(--text-primary)]">
        {segment}
      </code>
    </div>
  );

  return (
    <div className="page-shell space-y-6">
      <section className="glass-panel-strong p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <span className="hero-badge border-[var(--border-strong)] text-primary">Claim Review Workspace</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[var(--text-primary)] sm:text-5xl">
              Review structured claim data, validation, raw EDI, and AI guidance side by side.
            </h1>
            <p
              className="mt-3 max-w-3xl text-base leading-7 sm:text-lg"
              style={{ color: 'color-mix(in srgb, var(--text-primary) 72%, var(--bg-base) 28%)' }}
            >
              This workspace is denser and more reliable-looking, with the semantic tree kept visible while supporting panels stay one click away.
            </p>
          </div>
          <div className="flex justify-start xl:justify-end">
            <button type="button" onClick={handleFullValidate} className="btn-secondary" disabled={validating}>
              {validating ? 'Re-validating...' : 'Re-Validate'}
              <RefreshCw className={`h-4 w-4 ${validating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Pill tone="primary">
            <Sparkles className="h-3.5 w-3.5" />
            Route preserved: `/chat` and `/validate/full`
          </Pill>
          <Pill tone={errorCount > 0 ? 'danger' : 'success'}>
            {errorCount > 0 ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {errorCount > 0 ? `${errorCount} critical issue(s)` : 'No critical validation issues'}
          </Pill>
          <Pill tone={warningCount > 0 ? 'warning' : 'default'}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {warningCount} warning(s)
          </Pill>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-3">
        <div className="glass-panel-strong overflow-hidden xl:h-[760px]">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Semantic View</p>
              <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Parsed claim structure</h2>
            </div>
            <button
              type="button"
              onClick={handleFullValidate}
              className="hidden rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)] md:inline-flex xl:hidden"
              disabled={validating}
            >
              {validating ? 'Re-validating...' : 'Re-Validate'}
            </button>
          </div>
          <div className="h-[calc(100%-77px)]">
            <SemanticClaimViewer treeData={payload} />
          </div>
        </div>

        <div className="glass-panel-strong flex flex-col overflow-hidden xl:h-[760px]">
          <div className="border-b px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`tab-chip ${
                    activeTab === id
                      ? 'border-[var(--border-strong)] bg-[color:rgba(15,108,189,0.12)] text-primary'
                      : 'border-[var(--border-default)] bg-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'validation' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="grid gap-3 border-b px-5 py-4 sm:grid-cols-2">
                <div className="rounded-[18px] bg-[color:rgba(205,60,68,0.12)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-danger">Errors</p>
                  <p className="mt-2 text-2xl font-extrabold text-danger">{errorCount}</p>
                </div>
                <div className="rounded-[18px] bg-[color:rgba(214,134,29,0.14)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">Warnings</p>
                  <p className="mt-2 text-2xl font-extrabold text-warning">{warningCount}</p>
                </div>
              </div>
              
              <div className="border-b px-5 py-3">
                <button 
                  onClick={() => setIsAutoFixOpen(true)}
                  disabled={errorCount === 0}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all group ${
                    errorCount > 0 
                      ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Wand2 className={`h-4 w-4 ${errorCount > 0 ? 'text-[var(--accent-primary)] group-hover:animate-pulse' : 'text-slate-400'}`} /> 
                  {errorCount > 0 ? 'Auto-Fix with AI' : 'No Fixes Needed'}
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-auto px-5 py-5">
                {validationItems.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[var(--text-secondary)]">
                    <CheckCircle2 className="h-10 w-10 text-success" />
                    <p className="font-semibold">No validation issues detected.</p>
                  </div>
                ) : (
                  <div className="space-y-3">{validationItems.map(renderValidationItem)}</div>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === 'chat' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="custom-scrollbar flex-1 overflow-auto bg-[var(--bg-base)] px-5 py-5">
                {chatHistory.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-strong)] px-5 py-6 text-sm leading-6 text-[var(--text-secondary)]">
                    Ask focused questions like:
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Why might this claim be denied?', 'Summarize the key validation issues.', 'Which segment should I inspect first?'].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setChatMessage(prompt)}
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-[color:rgba(15,108,189,0.08)]"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatHistory.map((message) => (
                      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm leading-6 ${
                            message.role === 'user'
                              ? 'bg-primary text-white'
                              : 'border bg-[var(--bg-surface-strong)] text-[var(--text-primary)]'
                          }`}
                        >
                          <TypewriterText text={message.content} animate={message.role === 'model' && message.animate} />
                        </div>
                      </div>
                    ))}
                    {chatting ? (
                      <div className="flex justify-start">
                        <div className="rounded-[20px] border bg-[var(--bg-surface-strong)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                          Thinking...
                        </div>
                      </div>
                    ) : null}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
              <form onSubmit={handleChat} className="border-t p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    value={chatMessage}
                    onChange={(event) => setChatMessage(event.target.value)}
                    className="input-shell min-h-[92px] resize-none"
                    placeholder="Ask about denials, loops, segments, or validation outcomes..."
                  />
                  <button type="submit" className="btn-primary h-[52px] px-4" disabled={chatting || !chatMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>

        <div className="glass-panel-strong flex flex-col overflow-hidden xl:h-[760px]">
          <div className="border-b px-5 py-4">
            <div className="flex flex-wrap gap-2">
              <span className="tab-chip border-[var(--border-strong)] bg-[color:rgba(15,108,189,0.12)] text-primary">
                <FileCode2 className="h-4 w-4" />
                Raw EDI
              </span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Original transaction segments</h2>
          </div>
          <div className="custom-scrollbar flex-1 overflow-auto bg-[var(--bg-base)] px-5 py-5">
            {rawSegments.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[var(--text-secondary)]">
                <FileCode2 className="h-10 w-10 text-primary" />
                <p className="font-semibold">No raw EDI content available.</p>
              </div>
            ) : (
              <div className="rounded-[22px] border border-[var(--border-default)] bg-[var(--bg-surface-strong)] pl-0 pr-2 py-4">
                <div className="space-y-4">{rawSegments.map(renderRawSegment)}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <AutoFixModal 
        isOpen={isAutoFixOpen} 
        onClose={() => setIsAutoFixOpen(false)} 
        rawEdi={rawEdi} 
        errors={validationItems.filter(item => item.severity === 'ERROR' || !item.severity)} 
      />

    </div>
  );
};

export default Claims;

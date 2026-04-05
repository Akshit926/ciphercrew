import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const rawEdiPreview = [
  'ISA*00*          *00*          *ZZ*SENDERID...',
  'GS*HC*SENDER*RECEIVER*20260404*2248*1*X*005010X222A1',
  'ST*837*0001*005010X222A1',
  'NM1*IL*1*JONES*AMELIA****MI*P00014527',
  'CLM*2648391*1240***11:B:1*Y*A*Y*I',
  'HI*ABK:J189*ABF:R509',
];

const structuredPreview = [
  { label: 'Patient', value: 'Amelia Jones' },
  { label: 'Transaction', value: '837 Professional Claim' },
  { label: 'Claim ID', value: '2648391' },
  { label: 'Billed Amount', value: '$1,240.00' },
  { label: 'Priority Check', value: 'Ready for validation' },
];

let welcomeDismissedUntilReload = false;

export const shouldShowWelcome = () => !welcomeDismissedUntilReload;

export const dismissWelcomeUntilReload = () => {
  welcomeDismissedUntilReload = true;
};

const Welcome = ({ onEnter }) => {
  const [entered, setEntered] = useState(false);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.getAttribute('data-theme') === 'dark');
    });

    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const handleEnter = () => {
    if (entered) return;
    setEntered(true);
    window.setTimeout(() => {
      dismissWelcomeUntilReload();
      onEnter();
    }, 700);
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.015, y: -10, filter: 'blur(12px)' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleEnter}
      className={`fixed inset-0 z-[80] overflow-hidden text-left ${
        isDark ? 'bg-[#061120] text-white' : 'bg-[#eef4fb] text-[#10233c]'
      }`}
    >
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_20%_20%,rgba(45,127,255,0.28),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(37,208,178,0.22),transparent_22%),linear-gradient(180deg,#07111f_0%,#0b1730_100%)]'
            : 'bg-[radial-gradient(circle_at_20%_20%,rgba(67,127,223,0.18),transparent_22%),radial-gradient(circle_at_80%_10%,rgba(31,174,150,0.14),transparent_20%),linear-gradient(180deg,#f6faff_0%,#edf4fb_100%)]'
        }`}
      />
      <motion.div
        className={`absolute -left-24 top-16 h-72 w-72 rounded-full blur-[90px] ${
          isDark ? 'bg-[rgba(62,150,255,0.18)]' : 'bg-[rgba(62,150,255,0.14)]'
        }`}
        animate={{ x: [0, 30, 0], y: [0, 10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`absolute bottom-0 right-[-80px] h-80 w-80 rounded-full blur-[100px] ${
          isDark ? 'bg-[rgba(37,208,178,0.15)]' : 'bg-[rgba(37,208,178,0.12)]'
        }`}
        animate={{ x: [0, -35, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-x-0 bottom-0 top-[88px] z-10 overflow-hidden sm:top-[94px]">
        <div className="mx-auto grid h-full max-w-[1320px] items-start gap-4 px-5 pb-4 pt-3 sm:px-6 sm:pt-4 lg:grid-cols-[0.96fr_1.04fr] lg:gap-5 lg:px-6 lg:pt-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl self-start"
        >
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              boxShadow: isDark
                ? [
                    '0 0 0 rgba(62,150,255,0)',
                    '0 0 28px rgba(62,150,255,0.18)',
                    '0 0 0 rgba(62,150,255,0)',
                    '0 0 0 rgba(62,150,255,0)',
                  ]
                : [
                    '0 0 0 rgba(62,150,255,0)',
                    '0 0 24px rgba(62,150,255,0.12)',
                    '0 0 0 rgba(62,150,255,0)',
                    '0 0 0 rgba(62,150,255,0)',
                  ],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 1] }}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${
              isDark
                ? 'border-[rgba(120,175,255,0.28)] bg-[rgba(13,33,61,0.6)] text-[#9ec6ff]'
                : 'border-[rgba(80,130,205,0.22)] bg-[rgba(255,255,255,0.72)] text-[#356cc4]'
            }`}
          >
            Welcome To ClaimCraft
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{
              opacity: 1,
              y: 0,
              textShadow: isDark
                ? [
                    '0 0 0 rgba(255,255,255,0)',
                    '0 0 24px rgba(120,175,255,0.18)',
                    '0 0 0 rgba(255,255,255,0)',
                    '0 0 0 rgba(255,255,255,0)',
                  ]
                : [
                    '0 0 0 rgba(16,35,60,0)',
                    '0 0 20px rgba(98,146,214,0.14)',
                    '0 0 0 rgba(16,35,60,0)',
                    '0 0 0 rgba(16,35,60,0)',
                  ],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 1] }}
            className={`mt-3 max-w-[44rem] font-headline text-[clamp(2.6rem,6vw,4.6rem)] font-extrabold leading-[0.94] ${
              isDark ? 'text-white' : 'text-[#10233c]'
            }`}
          >
            Welcome in. Let&apos;s make healthcare EDI feel readable, structured, and useful.
          </motion.h1>
          <p className={`mt-3 max-w-[34rem] text-[14px] leading-6 sm:text-[16px] sm:leading-7 ${
            isDark ? 'text-[#bed0ea]' : 'text-[#526983]'
          }`}>
            EDI stands for Electronic Data Interchange. In healthcare, it is the format used to send claims,
            remittances, eligibility, and enrollment information between providers, payers, and clearinghouses.
            It is essential infrastructure, but in raw form it can feel dense and difficult to understand at a glance.
            ClaimCraft helps by turning those segments into clean summaries that are easier to review, validate,
            and act on.
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span
              className={`rounded-full border px-4 py-2 font-semibold ${
                isDark
                  ? 'border-[rgba(120,175,255,0.22)] bg-[rgba(10,24,46,0.7)] text-[#cfe0fb]'
                  : 'border-[rgba(80,130,205,0.18)] bg-[rgba(255,255,255,0.7)] text-[#2f5ca2]'
              }`}
            >
              Tap once to enter
            </span>
            <span
              className={`rounded-full border px-4 py-2 font-semibold ${
                isDark
                  ? 'border-[rgba(76,214,181,0.22)] bg-[rgba(10,24,46,0.7)] text-[#c8f0e8]'
                  : 'border-[rgba(31,174,150,0.18)] bg-[rgba(255,255,255,0.7)] text-[#157c6b]'
              }`}
            >
              Parsing animation included
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={entered ? { opacity: 0, y: -24, scale: 1.025 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[640px] self-start lg:max-w-[700px]"
        >
          <div className={`absolute inset-x-16 top-10 h-12 rounded-full blur-2xl ${
            isDark ? 'bg-[rgba(49,121,255,0.35)]' : 'bg-[rgba(49,121,255,0.22)]'
          }`} />

          <div className={`relative rounded-[40px] border px-5 py-4 ${
            isDark
              ? 'border-[rgba(120,175,255,0.22)] bg-[linear-gradient(180deg,rgba(11,27,50,0.96),rgba(7,18,33,0.98))] shadow-[0_40px_120px_rgba(0,0,0,0.45)]'
              : 'border-[rgba(120,175,255,0.18)] bg-[linear-gradient(180deg,rgba(240,246,255,0.95),rgba(226,237,249,0.98))] shadow-[0_30px_90px_rgba(67,103,148,0.18)]'
          }`}>
            <div className={`mx-auto w-full max-w-[395px] rounded-[40px] border p-3 ${
              isDark
                ? 'border-[rgba(134,170,214,0.14)] bg-[#09121f] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                : 'border-[rgba(120,150,192,0.18)] bg-[#f3f8fe] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]'
            }`}>
              <div className={`rounded-[32px] border px-4 pb-4 pt-5 ${
                isDark
                  ? 'border-[rgba(116,151,196,0.1)] bg-[linear-gradient(180deg,#0a1527_0%,#0d1b31_100%)]'
                  : 'border-[rgba(133,162,204,0.18)] bg-[linear-gradient(180deg,#eef5fd_0%,#e6f0fb_100%)]'
              }`}>
                <div className={`mx-auto mb-4 h-1.5 w-16 rounded-full ${
                  isDark ? 'bg-[rgba(170,190,220,0.24)]' : 'bg-[rgba(95,120,170,0.22)]'
                }`} />

                <div className={`overflow-hidden rounded-[24px] border p-4 ${
                  isDark
                    ? 'border-[rgba(118,150,195,0.12)] bg-[linear-gradient(180deg,rgba(12,22,38,0.92),rgba(7,16,29,0.98))]'
                    : 'border-[rgba(127,157,200,0.16)] bg-[linear-gradient(180deg,rgba(244,248,255,0.98),rgba(234,241,251,0.98))]'
                }`}>
                  <div className={`flex items-center justify-between border-b pb-3 ${
                    isDark ? 'border-[rgba(130,166,214,0.12)]' : 'border-[rgba(127,157,200,0.18)]'
                  }`}>
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${
                        isDark ? 'text-[#7ca8de]' : 'text-[#4d78b8]'
                      }`}>Live Parse</p>
                      <p className={`mt-1 text-sm font-bold ${isDark ? 'text-white' : 'text-[#10233c]'}`}>EDI to Structured Summary</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      isDark ? 'bg-[rgba(62,150,255,0.14)] text-[#a8cbff]' : 'bg-[rgba(62,150,255,0.12)] text-[#4474bc]'
                    }`}>
                      005010
                    </div>
                  </div>

                  <div className={`relative mt-4 min-h-[320px] overflow-hidden rounded-[18px] border px-3 py-3 sm:min-h-[340px] ${
                    isDark
                      ? 'border-[rgba(125,158,204,0.1)] bg-[#07111e]'
                      : 'border-[rgba(127,157,200,0.16)] bg-[#edf4fc]'
                  }`}>
                    <div className="absolute inset-3 space-y-2">
                      {rawEdiPreview.map((line) => (
                        <div
                          key={line}
                          className={`overflow-hidden rounded-xl border px-3 py-2 font-code text-[10px] leading-5 ${
                            isDark
                              ? 'border-[rgba(125,158,204,0.08)] bg-[rgba(10,22,40,0.78)] text-[#7ea0c9]'
                              : 'border-[rgba(127,157,200,0.14)] bg-[rgba(255,255,255,0.72)] text-[#607ea8]'
                          }`}
                        >
                          {line}
                        </div>
                      ))}
                    </div>

                    <motion.div
                      initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }}
                      animate={
                        entered
                          ? { opacity: 0, clipPath: 'inset(0 0 0 0)' }
                          : { clipPath: ['inset(0 100% 0 0)', 'inset(0 100% 0 0)', 'inset(0 0% 0 0)', 'inset(0 0% 0 0)'] }
                      }
                      transition={{ duration: 5, repeat: Infinity, times: [0, 0.34, 0.76, 1], ease: 'easeInOut' }}
                      className="absolute inset-3 z-[5] overflow-hidden"
                    >
                      <div className="h-full">
                        <div className="grid h-full gap-2">
                          {structuredPreview.map((item) => (
                            <div
                              key={item.label}
                              className={`rounded-xl border px-3 py-2 ${
                                isDark
                                  ? 'border-[rgba(129,169,215,0.12)] bg-[linear-gradient(180deg,rgba(13,28,51,0.96),rgba(8,20,37,0.96))]'
                                  : 'border-[rgba(127,157,200,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,246,253,0.98))]'
                              }`}
                            >
                              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                isDark ? 'text-[#77a7e6]' : 'text-[#4d78b8]'
                              }`}>{item.label}</p>
                              <p className={`mt-1 text-sm font-semibold ${isDark ? 'text-white' : 'text-[#10233c]'}`}>{item.value}</p>
                            </div>
                          ))}

                          <div className={`mt-1 rounded-2xl border px-3 py-3 ${
                            isDark
                              ? 'border-[rgba(76,214,181,0.14)] bg-[rgba(16,61,57,0.42)]'
                              : 'border-[rgba(31,174,150,0.16)] bg-[rgba(199,244,234,0.65)]'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                isDark ? 'text-[#81dcc9]' : 'text-[#157c6b]'
                              }`}>Status</span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                isDark
                                  ? 'bg-[rgba(76,214,181,0.14)] text-[#b0f0e3]'
                                  : 'bg-[rgba(31,174,150,0.12)] text-[#157c6b]'
                              }`}>
                                Structured
                              </span>
                            </div>
                            <p className={`mt-2 text-sm ${isDark ? 'text-[#ddf6f0]' : 'text-[#265f55]'}`}>Claim data extracted and ready for validation.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className={`pointer-events-none absolute inset-y-2 left-0 z-20 w-[88px] opacity-90 blur-[2px] ${
                        isDark
                          ? 'bg-[linear-gradient(90deg,rgba(53,136,255,0),rgba(53,136,255,0.88),rgba(53,136,255,0))]'
                          : 'bg-[linear-gradient(90deg,rgba(53,136,255,0),rgba(53,136,255,0.58),rgba(53,136,255,0))]'
                      }`}
                      animate={entered ? { opacity: 0 } : { x: ['-22%', '-22%', '320%', '320%'] }}
                      transition={{ duration: 5, repeat: Infinity, times: [0, 0.34, 0.76, 1], ease: 'easeInOut' }}
                    />

                    <motion.div
                      className={`pointer-events-none absolute inset-y-3 left-0 z-10 w-[160px] blur-md ${
                        isDark
                          ? 'bg-[linear-gradient(90deg,rgba(53,136,255,0),rgba(53,136,255,0.16),rgba(53,136,255,0))]'
                          : 'bg-[linear-gradient(90deg,rgba(53,136,255,0),rgba(53,136,255,0.12),rgba(53,136,255,0))]'
                      }`}
                      animate={entered ? { opacity: 0 } : { x: ['-30%', '-30%', '290%', '290%'] }}
                      transition={{ duration: 5, repeat: Infinity, times: [0, 0.34, 0.76, 1], ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </motion.button>
  );
};

export default Welcome;

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const rawEdiPreview = [
  { id: '001', text: 'ISA*00*          *00*          *ZZ*SENDERID*ZZ*RECEIVERID*260404*2248*^*00501*000000001*0*T*:~' },
  { id: '002', text: 'GS*HC*SENDER*RECEIVER*20260404*2248*1*X*005010X222A1~' },
  { id: '003', text: 'ST*837*0001*005010X222A1~' },
  { id: '004', text: 'NM1*IL*1*JONES*AMELIA****MI*P00014527~' },
  { id: '005', text: 'CLM*2648391*1240***11:B:1*Y*A*Y*I~' },
  { id: '006', text: 'HI*ABK:J189*ABF:R509~' },
];

const structuredPreview = [
  { label: 'Patient', value: 'Amelia Jones' },
  { label: 'Transaction', value: '837 Professional Claim' },
  { label: 'Claim ID', value: '2648391' },
  { label: 'Billed Amount', value: '$1,240.00' },
];

let welcomeDismissedUntilReload = false;

export const shouldShowWelcome = () => !welcomeDismissedUntilReload;

export const dismissWelcomeUntilReload = () => {
  welcomeDismissedUntilReload = true;
  window.dispatchEvent(new Event('claimcraft:welcome-dismissed'));
};

const pulseTransition = {
  duration: 9,
  repeat: Infinity,
  ease: 'easeInOut',
};

const Welcome = ({ onEnter }) => {
  const [entered, setEntered] = useState(false);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
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
    dismissWelcomeUntilReload();
    onEnter();
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.003, y: -2, filter: 'blur(2px)' }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleEnter}
      className={`fixed inset-0 z-[80] overflow-hidden text-left ${
        isDark ? 'bg-[#061120] text-white' : 'bg-[#eef4fb] text-[#10233c]'
      }`}
    >
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_18%_18%,rgba(45,127,255,0.24),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(37,208,178,0.18),transparent_22%),linear-gradient(180deg,#07111f_0%,#0b1730_100%)]'
            : 'bg-[radial-gradient(circle_at_18%_18%,rgba(67,127,223,0.16),transparent_23%),radial-gradient(circle_at_82%_12%,rgba(31,174,150,0.12),transparent_20%),linear-gradient(180deg,#f6faff_0%,#edf4fb_100%)]'
        }`}
      />

      <motion.div
        className={`absolute -left-24 top-16 h-72 w-72 rounded-full blur-[90px] ${
          isDark ? 'bg-[rgba(62,150,255,0.16)]' : 'bg-[rgba(62,150,255,0.12)]'
        }`}
        animate={{ x: [0, 24, 0], y: [0, 8, 0] }}
        transition={{ ...pulseTransition }}
      />
      <motion.div
        className={`absolute bottom-0 right-[-80px] h-80 w-80 rounded-full blur-[100px] ${
          isDark ? 'bg-[rgba(37,208,178,0.12)]' : 'bg-[rgba(37,208,178,0.1)]'
        }`}
        animate={{ x: [0, -28, 0], y: [0, -14, 0] }}
        transition={{ ...pulseTransition, duration: 10 }}
      />

      <div className="absolute inset-0 z-10 overflow-hidden">
        <div className="mx-auto grid min-h-screen max-w-[1360px] items-center gap-8 px-6 py-8 sm:px-7 sm:py-10 lg:grid-cols-[0.94fr_1.06fr] lg:px-8 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl self-center"
          >
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.28em] shadow-[0_14px_34px_rgba(15,108,189,0.16)] ${
                isDark
                  ? 'border-[#78afff] bg-[#102949] text-[#f3f8ff]'
                  : 'border-[#6f9fe0] bg-[#ffffff] text-[#13458f]'
              }`}
            >
              Welcome To ClaimCraft
            </motion.span>

            <h1
              className={`mt-4 max-w-[46rem] font-headline text-[clamp(2.8rem,6vw,4.8rem)] font-extrabold leading-[0.96] ${
                isDark ? 'text-white' : 'text-[#10233c]'
              }`}
            >
              Turn dense healthcare EDI into something you can actually read.
            </h1>

            <p
              className={`mt-4 max-w-[35rem] text-[15px] leading-7 sm:text-[17px] sm:leading-8 ${
                isDark ? 'text-[#bed0ea]' : 'text-[#526983]'
              }`}
            >
              ClaimCraft takes raw X12 claim data and translates it into a cleaner review flow, so users can
              understand the transaction, validate it, and act on it faster.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
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
                Watch the claim become readable
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={entered ? { opacity: 0, y: -10, scale: 1.006 } : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-[700px] self-center"
          >
            <div
              className={`absolute inset-x-12 top-8 h-14 rounded-full blur-3xl ${
                isDark ? 'bg-[rgba(49,121,255,0.28)]' : 'bg-[rgba(49,121,255,0.18)]'
              }`}
            />

            <div
              className={`relative rounded-[42px] border px-5 py-5 ${
                isDark
                  ? 'border-[rgba(120,175,255,0.22)] bg-[linear-gradient(180deg,rgba(11,27,50,0.96),rgba(7,18,33,0.98))] shadow-[0_40px_120px_rgba(0,0,0,0.42)]'
                  : 'border-[rgba(120,175,255,0.18)] bg-[linear-gradient(180deg,rgba(240,246,255,0.95),rgba(226,237,249,0.98))] shadow-[0_30px_90px_rgba(67,103,148,0.18)]'
              }`}
            >
              <div
                className={`mx-auto w-full max-w-[430px] rounded-[38px] border p-3 ${
                  isDark
                    ? 'border-[rgba(134,170,214,0.14)] bg-[#09121f]'
                    : 'border-[rgba(120,150,192,0.18)] bg-[#f3f8fe]'
                }`}
              >
                <div
                  className={`rounded-[30px] border px-4 pb-4 pt-5 ${
                    isDark
                      ? 'border-[rgba(116,151,196,0.1)] bg-[linear-gradient(180deg,#0a1527_0%,#0d1b31_100%)]'
                      : 'border-[rgba(133,162,204,0.18)] bg-[linear-gradient(180deg,#eef5fd_0%,#e6f0fb_100%)]'
                  }`}
                >
                  <div
                    className={`mx-auto mb-4 h-1.5 w-16 rounded-full ${
                      isDark ? 'bg-[rgba(170,190,220,0.24)]' : 'bg-[rgba(95,120,170,0.22)]'
                    }`}
                  />

                  <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] pb-3">
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-[#7ca8de]' : 'text-[#4d78b8]'}`}>
                        Live Parse
                      </p>
                      <p className={`mt-1 text-sm font-bold ${isDark ? 'text-white' : 'text-[#10233c]'}`}>
                        EDI to Readable Claim
                      </p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      isDark ? 'bg-[rgba(62,150,255,0.14)] text-[#a8cbff]' : 'bg-[rgba(62,150,255,0.12)] text-[#4474bc]'
                    }`}>
                      005010
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1.08fr_0.92fr]">
                    <div
                      className={`relative min-h-[322px] overflow-hidden rounded-[22px] border p-3 ${
                        isDark
                          ? 'border-[rgba(125,158,204,0.1)] bg-[#07111e]'
                          : 'border-[rgba(127,157,200,0.16)] bg-[#edf4fc]'
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#87a7ce]' : 'text-[#6782a8]'}`}>
                          Raw EDI
                        </span>
                        <span className={`text-[10px] font-semibold ${isDark ? 'text-[#6f88a7]' : 'text-[#7c91ad]'}`}>
                          segment stream
                        </span>
                      </div>

                      <div className="space-y-2">
                        {rawEdiPreview.map((line, index) => (
                          <motion.div
                            key={line.id}
                            animate={
                              entered
                                ? { opacity: 0.25 }
                                : {
                                    opacity: [0.62, 0.62, 1, 0.82, 0.62],
                                    scale: [1, 1, 1.012, 1, 1],
                                  }
                            }
                            transition={{
                              duration: 6.2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: index * 0.12,
                              times: [0, 0.22, 0.42, 0.68, 1],
                            }}
                            className={`grid grid-cols-[auto_1fr] items-start gap-2 rounded-2xl border px-3 py-2 font-code text-[10px] leading-5 ${
                              isDark
                                ? 'border-[rgba(125,158,204,0.08)] bg-[rgba(10,22,40,0.78)] text-[#7ea0c9]'
                                : 'border-[rgba(127,157,200,0.14)] bg-[rgba(255,255,255,0.76)] text-[#607ea8]'
                            }`}
                          >
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                              isDark ? 'bg-[rgba(62,150,255,0.12)] text-[#9dc5ff]' : 'bg-[rgba(62,150,255,0.1)] text-[#4474bc]'
                            }`}>
                              {line.id}
                            </span>
                            <span className="break-all">{line.text}</span>
                          </motion.div>
                        ))}
                      </div>

                      <motion.div
                        className={`pointer-events-none absolute inset-y-4 left-0 z-10 w-[88px] blur-[2px] ${
                          isDark
                            ? 'bg-[linear-gradient(90deg,rgba(53,136,255,0),rgba(53,136,255,0.72),rgba(53,136,255,0))]'
                            : 'bg-[linear-gradient(90deg,rgba(53,136,255,0),rgba(53,136,255,0.48),rgba(53,136,255,0))]'
                        }`}
                        animate={entered ? { opacity: 0 } : { x: ['-18%', '-18%', '315%', '315%'], opacity: [0, 0, 0.95, 0] }}
                        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.22, 0.68, 1] }}
                      />
                    </div>

                    <div
                      className={`relative min-h-[322px] overflow-hidden rounded-[22px] border p-3 ${
                        isDark
                          ? 'border-[rgba(125,158,204,0.1)] bg-[linear-gradient(180deg,rgba(10,22,38,0.96),rgba(7,16,29,0.98))]'
                          : 'border-[rgba(127,157,200,0.16)] bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(239,245,252,0.98))]'
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#8ed4c2]' : 'text-[#2d8b7b]'}`}>
                          Readable Output
                        </span>
                        <span className={`text-[10px] font-semibold ${isDark ? 'text-[#79a8a0]' : 'text-[#4f8f84]'}`}>
                          structured claim
                        </span>
                      </div>

                      <motion.div
                        animate={entered ? { opacity: 0.96 } : { opacity: [0.28, 0.28, 0.46, 1, 1] }}
                        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.34, 0.56, 0.74, 1] }}
                        className="space-y-2"
                      >
                        {structuredPreview.map((item, index) => (
                          <motion.div
                            key={item.label}
                            animate={
                              entered
                                ? { opacity: 1, y: 0 }
                                : {
                                    opacity: [0.18, 0.18, 0.18, 1, 1],
                                    y: [8, 8, 8, 0, 0],
                                    scale: [0.985, 0.985, 0.985, 1, 1],
                                  }
                            }
                            transition={{
                              duration: 6.2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: index * 0.08,
                              times: [0, 0.42, 0.56, 0.74, 1],
                            }}
                            className={`rounded-2xl border px-3 py-3 ${
                              isDark
                                ? 'border-[rgba(129,169,215,0.12)] bg-[linear-gradient(180deg,rgba(13,28,51,0.96),rgba(8,20,37,0.96))]'
                                : 'border-[rgba(127,157,200,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,246,253,0.98))]'
                            }`}
                          >
                            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#77a7e6]' : 'text-[#4d78b8]'}`}>
                              {item.label}
                            </p>
                            <p className={`mt-1 text-sm font-semibold ${isDark ? 'text-white' : 'text-[#10233c]'}`}>
                              {item.value}
                            </p>
                          </motion.div>
                        ))}

                        <motion.div
                          animate={
                            entered
                              ? { opacity: 1, y: 0 }
                              : { opacity: [0.14, 0.14, 0.14, 1, 1], y: [8, 8, 8, 0, 0] }
                          }
                          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 0.64, 0.8, 1] }}
                          className={`rounded-2xl border px-3 py-3 ${
                            isDark
                              ? 'border-[rgba(76,214,181,0.14)] bg-[rgba(16,61,57,0.42)]'
                              : 'border-[rgba(31,174,150,0.16)] bg-[rgba(199,244,234,0.65)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#81dcc9]' : 'text-[#157c6b]'}`}>
                              Status
                            </span>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                isDark
                                  ? 'bg-[rgba(76,214,181,0.14)] text-[#b0f0e3]'
                                  : 'bg-[rgba(31,174,150,0.12)] text-[#157c6b]'
                              }`}
                            >
                              Ready
                            </span>
                          </div>
                          <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-[#ddf6f0]' : 'text-[#265f55]'}`}>
                            Claim data extracted into readable fields for review and validation.
                          </p>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#7da1ca]' : 'text-[#5f7ca4]'}`}>
                      Raw EDI
                    </span>
                    <motion.div
                      animate={entered ? { scaleX: 1 } : { scaleX: [0.15, 0.15, 0.55, 1, 1] }}
                      transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.28, 0.48, 0.7, 1] }}
                      className={`h-[2px] flex-1 origin-left rounded-full ${
                        isDark ? 'bg-[linear-gradient(90deg,#3e96ff,#3bd0bd)]' : 'bg-[linear-gradient(90deg,#4a86da,#1ba28d)]'
                      }`}
                    />
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#8ed4c2]' : 'text-[#2d8b7b]'}`}>
                      Readable claim
                    </span>
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

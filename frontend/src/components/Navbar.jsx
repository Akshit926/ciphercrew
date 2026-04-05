import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Menu, Moon, SunMedium, X } from 'lucide-react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';

const navLinks = [
  { path: '/', label: 'Dashboard' },
  { path: '/claims', label: 'Claim Review' },
  { path: '/reconcile', label: 'Reconcile' },
  { path: '/batch', label: 'Batch' },
  { path: '/about', label: 'About' },
  { path: '/team', label: 'Team' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const location = useLocation();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 24);
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navClass = useMemo(
    () =>
      `fixed inset-x-0 top-0 z-50 transition duration-500 ${
        scrolled ? 'pt-3' : 'pt-5'
      }`,
    [scrolled],
  );

  return (
    <header className={navClass}>
      <div className="mx-auto max-w-[1320px] px-5 sm:px-6 lg:px-6">
        <div
          className={`glass-panel flex items-center justify-between px-5 py-3.5 sm:px-6 ${
            scrolled ? 'shadow-[var(--shadow-md)]' : ''
          }`}
        >
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[var(--border-strong)] bg-[color:rgba(15,108,189,0.12)] text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="font-headline text-lg font-bold leading-none">ClaimCraft</p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                EDI Intelligence
              </p>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-2.5 lg:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2.5 text-sm font-semibold transition duration-300 ${
                    isActive
                      ? 'bg-[color:rgba(15,108,189,0.12)] text-primary'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[20px] border bg-[var(--bg-surface-strong)] text-[var(--text-secondary)] transition duration-300 hover:text-primary"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[20px] border bg-[var(--bg-surface-strong)] text-[var(--text-secondary)] transition duration-300 lg:hidden"
              aria-label="Open menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel mt-3 overflow-hidden lg:hidden"
            >
              <div className="grid gap-1.5 p-3">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      `rounded-[20px] px-4 py-3 text-sm font-semibold transition duration-300 ${
                        isActive
                          ? 'bg-[color:rgba(15,108,189,0.12)] text-primary'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Navbar;

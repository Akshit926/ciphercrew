import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll } from 'framer-motion';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';
import Home from './pages/Home';
import Reconcile from './pages/Reconcile';
import Batch from './pages/Batch';
import Claims from './pages/Claims';
import About from './pages/About';
import Team from './pages/Team';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/reconcile" element={<PageTransition><Reconcile /></PageTransition>} />
        <Route path="/batch" element={<PageTransition><Batch /></PageTransition>} />
        <Route path="/claims" element={<PageTransition><Claims /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/team" element={<PageTransition><Team /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  const { scrollYProgress } = useScroll();

  return (
    <Router>
      <div className="app-shell">
        <motion.div
          className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-primary via-accent to-warm"
          style={{ scaleX: scrollYProgress }}
        />
        <Navbar />
        <main className="relative z-10 min-h-screen">
          <AnimatedRoutes />
        </main>
      </div>
    </Router>
  );
};

export default App;

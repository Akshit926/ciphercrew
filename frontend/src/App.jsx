import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Reconcile from './pages/Reconcile';
import Batch from './pages/Batch';
import About from './pages/About';
import Team from './pages/Team';
import Claims from './pages/Claims';

function App() {
  return (
    <Router>
      <div className="min-h-screen pt-16 flex flex-col">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/reconcile" element={<Reconcile />} />
            <Route path="/batch" element={<Batch />} />
            <Route path="/about" element={<About />} />
            <Route path="/team" element={<Team />} />
            <Route path="/claims" element={<Claims />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity } from 'lucide-react';

const Navbar = () => {
  const getNavClass = ({ isActive }) => 
    `text-sm font-medium transition-all px-4 py-1.5 rounded-full ${isActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 md:p-6 pointer-events-none">
      <nav className="glass-panel pointer-events-auto w-full max-w-6xl px-4 py-3 flex justify-between items-center animate-fade-in-up">
        <NavLink to="/" className="flex items-center gap-2 hover:-translate-y-0.5 transition-transform duration-300">
          <div className="bg-gradient-to-tr from-primary to-accent p-1.5 rounded-xl shadow-md shadow-primary/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-headline font-extrabold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">ClaimCraft</span>
        </NavLink>
        
        <div className="hidden lg:flex gap-1 items-center bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
          <NavLink to="/" className={getNavClass}>Home</NavLink>
          <NavLink to="/reconcile" className={getNavClass}>835 vs 837</NavLink>
          <NavLink to="/batch" className={getNavClass}>Batch Processing</NavLink>
          <NavLink to="/claims" className={getNavClass}>Single Claim</NavLink>
          <NavLink to="/about" className={getNavClass}>About</NavLink>
          <NavLink to="/team" className={getNavClass}>Team</NavLink>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;

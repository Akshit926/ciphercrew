import React from 'react';
import { Github, Linkedin, Mail, Code2 } from 'lucide-react';

const TEAM_MEMBERS = [
  { name: 'Dhruv Vaswani', role: 'Full Stack Engineer', specialty: 'Architecture & GenAI' },
  { name: 'Vitthal Humbe', role: 'Backend Developer', specialty: 'Python & FastAPI' },
  { name: 'Akshit Agrawal', role: 'Frontend Developer', specialty: 'React & UI/UX' },
  { name: 'Avinash Pawar', role: 'Data Engineer', specialty: 'EDI Parsing & NLP' }
];

const Team = () => {
  return (
    <div className="flex-grow relative pt-32 pb-16 px-6">
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        
        <div className="text-center mb-16 relative z-10">
          <div className="flex justify-center mb-6">
             <div className="glass-panel !border-accent/30 !bg-white/80 text-accent px-6 py-2.5 rounded-full font-code text-sm font-bold shadow-lg shadow-accent/10 flex items-center gap-2">
                <Code2 className="w-4 h-4"/> TEAM CIPHER CREW
             </div>
          </div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight mb-4 drop-shadow-sm">Meet the Developers</h1>
          <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">Proudly building from PCCOE Pune for INSPIRON 5.0</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          {TEAM_MEMBERS.map((member, idx) => (
            <div key={idx} className="glass-panel p-8 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
              <div className="w-24 h-24 bg-slate-50 border-4 border-white shadow-inner rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-extrabold text-slate-300 group-hover:scale-110 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-accent group-hover:border-accent/20 transition-all duration-300">
                {member.name.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 tracking-tight">{member.name}</h3>
              <p className="text-sm font-bold text-accent text-center mt-1.5">{member.role}</p>
              <div className="mt-5 pt-5 border-t border-slate-200/60 text-center">
                 <span className="text-xs font-code font-semibold text-slate-500 bg-white shadow-sm border border-slate-100 px-4 py-1.5 rounded-full inline-block">
                   {member.specialty}
                 </span>
              </div>
              
              <div className="flex justify-center gap-4 mt-8">
                 <a href="#" className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-full text-slate-400 hover:text-white hover:bg-primary transition-all hover:scale-110"><Github className="w-4 h-4"/></a>
                 <a href="#" className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-full text-slate-400 hover:text-white hover:bg-accent transition-all hover:scale-110"><Linkedin className="w-4 h-4"/></a>
                 <a href="#" className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-full text-slate-400 hover:text-white hover:bg-primary transition-all hover:scale-110"><Mail className="w-4 h-4"/></a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Team;

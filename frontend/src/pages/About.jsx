import React from 'react';
import { Target, Zap, Shield, Code } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="glass-panel p-8 hover:-translate-y-1 transition-all duration-300 group">
    <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform group-hover:bg-accent group-hover:text-white shadow-sm">
      <Icon className="w-7 h-7" />
    </div>
    <h3 className="text-xl font-bold mb-3 tracking-tight text-slate-800">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm font-medium">{description}</p>
  </div>
);

const About = () => {
  return (
    <div className="flex-grow relative pt-28 pb-16 px-6">
      <div className="max-w-5xl mx-auto animate-fade-in-up md:px-6">
        
        <div className="text-center mb-20 space-y-4 relative z-10">
          <div className="inline-block px-5 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-3 font-code border border-accent/20 shadow-sm backdrop-blur-sm">
            INSPIRON 5.0 Hackathon Project
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight drop-shadow-sm pb-2">
            Demystifying X12 EDI
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Healthcare communication relies on the archaic X12 EDI standard. ClaimCraft brings modern AI tooling to make it human-readable and actionable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="relative p-10 rounded-3xl shadow-xl shadow-primary/20 overflow-hidden group hover:-translate-y-1 transition-transform duration-300 bg-gradient-to-br from-primary to-accent text-white">
            <h2 className="text-3xl font-bold mb-4 font-headline drop-shadow-md">The Problem</h2>
            <p className="text-blue-50 leading-relaxed mb-8 font-medium">
              X12 EDI files (like the 837 Claim or 835 Remittance) are dense, segment-based text files composed of tildes, asterisks, and obscure codes. Billing teams spend hours manually parsing segments to track down claim errors, resulting in delayed revenue and compliance risks.
            </p>
            <div className="p-5 bg-black/30 rounded-2xl font-code text-xs text-blue-100 backdrop-blur-md border border-white/10 shadow-inner">
              NM1*IL*1*SMITH*JOHN*A***MI*123456789~<br/>
              CLM*12345*150.00***11:B:1*Y*A*Y*I~<br/>
              HI*BK:D123~
            </div>
          </div>

          <div className="glass-panel p-10 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors duration-500"></div>
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-headline relative z-10">Our Solution</h2>
            <p className="text-slate-500 leading-relaxed font-medium relative z-10 mb-8">
              ClaimCraft acts as an intelligent intermediary. By uploading an EDI file, our backend recursive parser structures the data instantly into interactive nested models.
            </p>
            <ul className="mt-6 space-y-4 relative z-10 font-semibold">
               <li className="flex items-center gap-4 text-slate-700"><div className="p-2 bg-success/10 rounded-lg text-success"><Zap className="w-5 h-5"/></div> Instant JSON Visualization</li>
               <li className="flex items-center gap-4 text-slate-700"><div className="p-2 bg-danger/10 rounded-lg text-danger"><Shield className="w-5 h-5"/></div> Automated SNIP Validation</li>
               <li className="flex items-center gap-4 text-slate-700"><div className="p-2 bg-primary/10 rounded-lg text-primary"><Code className="w-5 h-5"/></div> Context-Aware AI Chat</li>
               <li className="flex items-center gap-4 text-slate-700"><div className="p-2 bg-inspiron/10 rounded-lg text-inspiron"><Target className="w-5 h-5"/></div> Deep 835 vs 837 Reconciliation</li>
            </ul>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <FeatureCard 
            icon={Target} 
            title="For Billing Teams" 
            description="Visually trace claim denials directly to specific segments without deciphering codes manually." 
          />
          <FeatureCard 
            icon={Shield} 
            title="For Payers" 
            description="Automate batch validation of incoming EDI streams to ensure compliance instantly." 
          />
          <FeatureCard 
            icon={Code} 
            title="For Developers" 
            description="Tap into structured JSON APIs via ClaimCraft to build custom healthcare integrations faster." 
          />
        </div>

      </div>
    </div>
  );
};

export default About;

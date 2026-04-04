import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, User, FileText, Stethoscope } from 'lucide-react';

const ExpandableCard = ({ title, loopInfo, icon: Icon, children, defaultOpen = true, forceState }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  React.useEffect(() => {
    if (forceState !== null) setIsOpen(forceState);
  }, [forceState]);

  return (
    <div className="mb-2 last:mb-0">
      <div 
        className="flex items-center gap-3 py-2 px-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-slate-400 group-hover:text-primary transition-colors">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        {Icon && <Icon className="w-4 h-4 text-accent" />}
        <span className="font-semibold text-slate-800 text-sm tracking-wide">{title}</span>
        {loopInfo && <span className="ml-auto text-xs text-slate-500 font-mono tracking-wider">{loopInfo}</span>}
      </div>
      
      <div className={`overflow-hidden transition-all ease-in-out duration-300 ${isOpen ? 'opacity-100 max-h-none' : 'opacity-0 max-h-0'}`}>
        <div className="ml-5 pl-4 py-2 border-l border-slate-200 flex flex-col gap-2.5">
          {children}
        </div>
      </div>
    </div>
  );
};

const DataRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start text-sm px-3 py-1 hover:bg-slate-50 rounded transition-colors group">
      <span className="text-slate-500 font-medium group-hover:text-slate-600 transition-colors">{label}</span>
      <span className="text-slate-700 font-mono text-right break-all ml-4 group-hover:text-slate-900 transition-colors">{value}</span>
    </div>
  );
};

const SemanticClaimViewer = ({ treeData }) => {
  const [globalExpand, setGlobalExpand] = useState(true);
  const [forceState, setForceState] = useState(null);

  const handleToggleAll = () => {
    const newState = !globalExpand;
    setGlobalExpand(newState);
    setForceState(newState);
    setTimeout(() => setForceState(null), 50);
  };

  if (!treeData || !treeData.loops || treeData.loops.length === 0) {
    return (
      <div className="flex-grow flex flex-col h-full bg-white">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Parsed Data Structure</h3>
        </div>
        <div className="flex-grow flex items-center justify-center p-8 text-slate-500 text-sm">
          No semantic tree data available or empty loops.
        </div>
      </div>
    );
  }

  const ServiceLine = ({ line, index }) => {
    return (
      <ExpandableCard 
        title={`Service Line (${index + 1})`} 
        loopInfo="Loop 2400" 
        icon={Stethoscope}
        defaultOpen={true}
        forceState={forceState}
      >
        <DataRow label="Procedure" value={`${line.procedure} ${line.procedure_qualifier ? `(${line.procedure_qualifier})` : ''}`.trim()} />
        <DataRow label="Charge" value={line.charge ? `$${parseFloat(line.charge).toFixed(2)}` : null} />
        <DataRow label="Units" value={line.unit_count ? `${line.unit_count} ${line.units || 'UN'}` : null} />
        <DataRow label="Revenue" value={line.revenue_code} />
      </ExpandableCard>
    );
  };

  const ClaimDetails = ({ claim }) => {
    const diags = claim.diagnosis_codes?.map(d => d.code).join(', ');
    
    return (
      <ExpandableCard 
        title="Claim Details" 
        loopInfo="Loop 2300" 
        icon={FileText}
        defaultOpen={true}
        forceState={forceState}
      >
        <DataRow label="Claim Control ID" value={claim.claim_id} />
        <DataRow label="Total Claim Amount" value={claim.total_charge ? `$${parseFloat(claim.total_charge).toFixed(2)}` : null} />
        <DataRow label="POS Code" value={`${claim.facility_type || ''} ${claim.facility_type_name ? `- ${claim.facility_type_name}` : ''}`.trim()} />
        <DataRow label="Diagnosis" value={diags} />
        
        {claim.service_lines?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            {claim.service_lines.map((line, idx) => (
              <ServiceLine key={idx} line={line} index={idx} />
            ))}
          </div>
        )}
      </ExpandableCard>
    );
  };

  const Subscriber = ({ sub }) => {
    const s = sub.subscriber;
    const name = s ? `${s.first_name || ''} ${s.last_name_org || ''}`.trim() : 'Unknown';
    
    return (
      <ExpandableCard 
        title="Subscriber" 
        loopInfo="Loop 2000B" 
        icon={User}
        defaultOpen={true}
        forceState={forceState}
      >
        <DataRow label="Name" value={name || s?.entity_name} />
        <DataRow label="Subscriber ID" value={s?.id} />

        {sub.claims?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            {sub.claims.map((claim, idx) => (
              <ClaimDetails key={idx} claim={claim} />
            ))}
          </div>
        )}
      </ExpandableCard>
    );
  };

  const BillingProvider = ({ provider }) => {
    const p = provider.provider;
    const name = p ? `${p.first_name || ''} ${p.last_name_org || ''}`.trim() : 'Unknown';

    return (
      <ExpandableCard 
        title="Billing Provider" 
        loopInfo="Loop 2000A" 
        icon={Building2}
        defaultOpen={true}
        forceState={forceState}
      >
        <DataRow label="Name" value={name || p?.entity_name} />
        <DataRow label="NPI" value={p?.id} />

        {provider.subscriber_loops?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            {provider.subscriber_loops.map((sub, idx) => (
              <Subscriber key={idx} sub={sub} />
            ))}
          </div>
        )}
      </ExpandableCard>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 className="font-bold text-slate-800 text-sm tracking-wide">Parsed Data Structure</h3>
        <button 
          onClick={handleToggleAll}
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none"
        >
          {globalExpand ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      
      <div className="flex-grow overflow-auto p-4 custom-scrollbar">
        {treeData.loops.map((provider, idx) => (
          <BillingProvider key={idx} provider={provider} />
        ))}
      </div>
    </div>
  );
};

export default SemanticClaimViewer;

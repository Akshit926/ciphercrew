import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, User, FileText, Stethoscope, DollarSign, Shield, Activity, AlertCircle } from 'lucide-react';

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
  if (!value && value !== 0 && value !== '0') return null;
  return (
    <div className="flex justify-between items-start text-sm px-3 py-1 hover:bg-slate-50 rounded transition-colors group">
      <span className="text-slate-500 font-medium group-hover:text-slate-600 transition-colors">{label}</span>
      <span className="text-slate-700 font-mono text-right break-all ml-4 group-hover:text-slate-900 transition-colors">{value}</span>
    </div>
  );
};

// ==========================================
// 837 Claim Components
// ==========================================
const ServiceLine837 = ({ line, index, forceState }) => (
  <ExpandableCard title={`Service Line (${index + 1})`} loopInfo="Loop 2400" icon={Stethoscope} forceState={forceState}>
    <DataRow label="Procedure" value={`${line.procedure || ''} ${line.procedure_qualifier ? `(${line.procedure_qualifier})` : ''}`.trim()} />
    <DataRow label="Charge" value={line.charge ? `$${parseFloat(line.charge).toFixed(2)}` : null} />
    <DataRow label="Units" value={line.unit_count ? `${line.unit_count} ${line.units || 'UN'}` : null} />
    <DataRow label="Revenue" value={line.revenue_code} />
  </ExpandableCard>
);

const ClaimDetails837 = ({ claim, forceState }) => {
  const diags = claim.diagnosis_codes?.map(d => d.code).join(', ');
  return (
    <ExpandableCard title="Claim Details" loopInfo="Loop 2300" icon={FileText} forceState={forceState}>
      <DataRow label="Claim Control ID" value={claim.claim_id} />
      <DataRow label="Total Claim Amount" value={claim.total_charge ? `$${parseFloat(claim.total_charge).toFixed(2)}` : null} />
      <DataRow label="POS Code" value={`${claim.facility_type || ''} ${claim.facility_type_name && claim.facility_type_name !== claim.facility_type ? `- ${claim.facility_type_name}` : ''}`.trim()} />
      <DataRow label="Diagnosis" value={diags} />
      {claim.service_lines?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          {claim.service_lines.map((line, idx) => <ServiceLine837 key={idx} line={line} index={idx} forceState={forceState} />)}
        </div>
      )}
    </ExpandableCard>
  );
};

const Subscriber837 = ({ sub, forceState }) => {
  const s = sub.subscriber;
  const name = s ? `${s.first_name || ''} ${s.last_name_org || ''}`.trim() : 'Unknown';
  return (
    <ExpandableCard title="Subscriber" loopInfo="Loop 2000B" icon={User} forceState={forceState}>
      <DataRow label="Name" value={name || s?.entity_name} />
      <DataRow label="Subscriber ID" value={s?.id} />
      {sub.claims?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          {sub.claims.map((claim, idx) => <ClaimDetails837 key={idx} claim={claim} forceState={forceState} />)}
        </div>
      )}
    </ExpandableCard>
  );
};

const BillingProvider837 = ({ provider, forceState }) => {
  const p = provider.provider;
  const name = p ? `${p.first_name || ''} ${p.last_name_org || ''}`.trim() : 'Unknown';
  return (
    <ExpandableCard title="Billing Provider" loopInfo="Loop 2000A" icon={Building2} forceState={forceState}>
      <DataRow label="Name" value={name || p?.entity_name} />
      <DataRow label="NPI" value={p?.id} />
      {provider.subscriber_loops?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          {provider.subscriber_loops.map((sub, idx) => <Subscriber837 key={idx} sub={sub} forceState={forceState} />)}
        </div>
      )}
    </ExpandableCard>
  );
};

// ==========================================
// 835 Remittance Components
// ==========================================
const Adjustment835 = ({ adj, index, forceState }) => (
  <ExpandableCard title={`Adjustment (${adj.group_code || index + 1})`} loopInfo="CAS" icon={AlertCircle} defaultOpen={false} forceState={forceState}>
    <DataRow label="Group" value={`${adj.group_code || ''} ${adj.group_description ? `- ${adj.group_description}` : ''}`.trim()} />
    {adj.adjustments?.map((a, i) => (
      <div key={i} className="mb-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
        <DataRow label="Reason" value={`${a.reason_code}: ${a.reason_description}`} />
        <DataRow label="Amount" value={a.amount ? `-$${parseFloat(a.amount).toFixed(2)}` : null} />
      </div>
    ))}
  </ExpandableCard>
);

const ServiceLine835 = ({ svc, index, forceState }) => (
  <ExpandableCard title={`Service Line (${svc.procedure_code || index + 1})`} loopInfo="SVC" icon={Stethoscope} defaultOpen={false} forceState={forceState}>
    <DataRow label="Procedure" value={`${svc.procedure_code || ''} ${svc.procedure_qualifier ? `(${svc.procedure_qualifier})` : ''}`.trim()} />
    <DataRow label="Billed" value={svc.billed_amount ? `$${parseFloat(svc.billed_amount).toFixed(2)}` : null} />
    <DataRow label="Paid" value={svc.paid_amount ? `$${parseFloat(svc.paid_amount).toFixed(2)}` : null} />
    {svc.adjustments?.length > 0 && (
      <div className="mt-2 pt-2 border-t border-slate-100">
        {svc.adjustments.map((adj, idx) => <Adjustment835 key={idx} adj={adj} index={idx} forceState={forceState} />)}
      </div>
    )}
  </ExpandableCard>
);

const Claim835 = ({ clp, forceState }) => {
  const p = clp.patient;
  const patName = p ? `${p.first_name || ''} ${p.last_name_org || ''}`.trim() : 'Unknown';
  return (
    <ExpandableCard title={`Claim: ${clp.claim_id}`} loopInfo="CLP Loop" icon={DollarSign} forceState={forceState}>
      <DataRow label="Status" value={`${clp.claim_status_code} - ${clp.claim_status}`} />
      <DataRow label="Patient" value={patName} />
      <DataRow label="Billed Amount" value={clp.billed_amount ? `$${parseFloat(clp.billed_amount).toFixed(2)}` : null} />
      <DataRow label="Paid Amount" value={clp.paid_amount ? `$${parseFloat(clp.paid_amount).toFixed(2)}` : null} />
      <DataRow label="Patient Resp." value={clp.patient_responsibility ? `$${parseFloat(clp.patient_responsibility).toFixed(2)}` : null} />
      
      {clp.adjustments?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider mb-2 block">Claim Level Adjustments</span>
          {clp.adjustments.map((adj, idx) => <Adjustment835 key={idx} adj={adj} index={idx} forceState={forceState} />)}
        </div>
      )}

      {clp.service_lines?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider mb-2 block">Service Lines</span>
          {clp.service_lines.map((svc, idx) => <ServiceLine835 key={idx} svc={svc} index={idx} forceState={forceState} />)}
        </div>
      )}
    </ExpandableCard>
  );
};

// ==========================================
// 834 Enrollment Components
// ==========================================
const Coverage834 = ({ cov, forceState }) => (
  <ExpandableCard title="Health Coverage" loopInfo="HD Loop" icon={Shield} defaultOpen={false} forceState={forceState}>
    <DataRow label="Maintenance Type" value={cov.maintenance_type} />
    <DataRow label="Coverage Level" value={cov.coverage_level_code} />
    <DataRow label="Description" value={cov.plan_coverage_description} />
  </ExpandableCard>
);

const Member834 = ({ member, forceState }) => {
  const m = member.member_name;
  const name = m ? `${m.first_name || ''} ${m.last_name_org || ''}`.trim() : 'Unknown';
  return (
    <ExpandableCard title={`Member: ${name}`} loopInfo="INS Loop" icon={Activity} forceState={forceState}>
      <DataRow label="Member ID" value={member.member_id} />
      <DataRow label="Maintenance" value={`${member.maintenance_type_code} - ${member.maintenance_type}`} />
      <DataRow label="Relationship" value={member.relationship} />
      
      {member.coverages?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          {member.coverages.map((cov, idx) => <Coverage834 key={idx} cov={cov} forceState={forceState} />)}
        </div>
      )}
    </ExpandableCard>
  );
};

// ==========================================
// Main Viewer Component
// ==========================================
const SemanticClaimViewer = ({ treeData }) => {
  const [globalExpand, setGlobalExpand] = useState(true);
  const [forceState, setForceState] = useState(null);

  const handleToggleAll = () => {
    const newState = !globalExpand;
    setGlobalExpand(newState);
    setForceState(newState);
    setTimeout(() => setForceState(null), 50);
  };

  // =========================================================================
  // THE FIX: Intelligently find the loops array no matter what Python named it
  // =========================================================================
  const targetObj = treeData?.tree || treeData;
  const loopsToRender = targetObj?.loops || 
                        targetObj?.claim_loops || 
                        targetObj?.member_loops || 
                        treeData?.claim_loops || 
                        treeData?.member_loops || 
                        [];

  if (!targetObj || loopsToRender.length === 0) {
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

  const txType = targetObj?.transaction_type || treeData?.transaction_type || '';
  const is835 = txType.includes('835');
  const is834 = txType.includes('834');

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <h3 className="font-bold text-slate-800 text-sm tracking-wide">
          Parsed Data Structure 
          <span className="ml-2 font-mono text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{txType || 'EDI'}</span>
        </h3>
        <button 
          onClick={handleToggleAll}
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none"
        >
          {globalExpand ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      
      <div className="flex-grow overflow-auto p-4 custom-scrollbar">
        {loopsToRender.map((loopItem, idx) => {
          if (is835) return <Claim835 key={idx} clp={loopItem} forceState={forceState} />;
          if (is834) return <Member834 key={idx} member={loopItem} forceState={forceState} />;
          // Default to 837
          return <BillingProvider837 key={idx} provider={loopItem} forceState={forceState} />;
        })}
      </div>
    </div>
  );
};

export default SemanticClaimViewer;
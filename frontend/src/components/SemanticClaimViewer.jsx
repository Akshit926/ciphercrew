import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  Shield,
  Stethoscope,
  User,
  Download // Added Download icon
} from 'lucide-react';

// --- Bulletproof money formatter to prevent $NaN ---
const formatMoney = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const cleanVal = Array.isArray(val) ? val[0] : val;
  const num = parseFloat(cleanVal);
  if (isNaN(num)) return String(cleanVal);
  return `$${num.toFixed(2)}`;
};

const ExpandableCard = ({ title, loopInfo, icon: Icon, children, defaultOpen = true, forceState }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  React.useEffect(() => {
    if (forceState !== null) setIsOpen(forceState);
  }, [forceState]);

  return (
    <div className="mb-2 last:mb-0">
      <div
        className="group flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[color:color-mix(in_srgb,var(--bg-base)_90%,white_10%)]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="text-[var(--text-soft)] transition-colors group-hover:text-primary">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        <span className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">{title}</span>
        {loopInfo ? <span className="ml-auto font-code text-xs tracking-wider text-[var(--text-soft)]">{loopInfo}</span> : null}
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="ml-5 flex flex-col gap-2.5 border-l border-[var(--border-default)] py-2 pl-4">{children}</div>
      </div>
    </div>
  );
};

const DataRow = ({ label, value }) => {
  if (!value && value !== 0 && value !== '0') return null;

  return (
    <div className="group flex items-start justify-between rounded px-3 py-1 text-sm transition-colors hover:bg-[color:color-mix(in_srgb,var(--bg-base)_92%,white_8%)]">
      <span className="font-medium text-[color:color-mix(in_srgb,var(--text-primary)_68%,var(--bg-base)_32%)] transition-colors">
        {label}
      </span>
      <span className="ml-4 break-all text-right font-code text-[var(--text-primary)] transition-colors">
        {value}
      </span>
    </div>
  );
};

const ServiceLine837 = ({ line, index, forceState }) => {
  // Re-integrated fetched procedure descriptions
  const procCode = line.procedure || '';
  const procDesc = line.procedure_description && line.procedure_description !== "Unknown Procedure" ? ` - ${line.procedure_description}` : '';
  const procDisplay = `${procCode}${procDesc} ${line.procedure_qualifier ? `(${line.procedure_qualifier})` : ''}`.trim();

  return (
    <ExpandableCard title={`Service Line (${index + 1})`} loopInfo="Loop 2400" icon={Stethoscope} forceState={forceState}>
      <DataRow label="Procedure" value={procDisplay} />
      <DataRow label="Charge" value={formatMoney(line.charge)} />
      <DataRow label="Units" value={line.unit_count ? `${line.unit_count} ${line.units || 'UN'}` : null} />
      <DataRow label="Revenue" value={line.revenue_code} />
    </ExpandableCard>
  );
};

const ClaimDetails837 = ({ claim, forceState }) => {
  // Re-integrated fetched ICD-10 descriptions
  const diags = claim.diagnosis_codes?.map((d) => {
    const desc = d.description && d.description !== "Unknown Diagnosis" ? ` (${d.description})` : '';
    return `${d.code}${desc}`;
  }).join(', ');
  
  return (
    <ExpandableCard title="Claim Details" loopInfo="Loop 2300" icon={FileText} forceState={forceState}>
      <DataRow label="Claim Control ID" value={claim.claim_id} />
      <DataRow label="Total Claim Amount" value={formatMoney(claim.total_charge)} />
      <DataRow label="POS Code" value={`${claim.facility_type || ''} ${claim.facility_type_name && claim.facility_type_name !== claim.facility_type ? `- ${claim.facility_type_name}` : ''}`.trim()} />
      <DataRow label="Diagnosis" value={diags} />
      {claim.service_lines?.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-[var(--border-default)] pt-3">
          {claim.service_lines.map((line, idx) => (
            <ServiceLine837 key={idx} line={line} index={idx} forceState={forceState} />
          ))}
        </div>
      ) : null}
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
      {sub.claims?.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-[var(--border-default)] pt-3">
          {sub.claims.map((claim, idx) => (
            <ClaimDetails837 key={idx} claim={claim} forceState={forceState} />
          ))}
        </div>
      ) : null}
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
      {provider.subscriber_loops?.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-[var(--border-default)] pt-3">
          {provider.subscriber_loops.map((sub, idx) => (
            <Subscriber837 key={idx} sub={sub} forceState={forceState} />
          ))}
        </div>
      ) : null}
    </ExpandableCard>
  );
};

const Adjustment835 = ({ adj, index, forceState }) => (
  <ExpandableCard title={`Adjustment (${adj.group_code || index + 1})`} loopInfo="CAS" icon={AlertCircle} defaultOpen={false} forceState={forceState}>
    <DataRow label="Group" value={`${adj.group_code || ''} ${adj.group_description ? `- ${adj.group_description}` : ''}`.trim()} />
    {adj.adjustments?.map((a, i) => (
      <div key={i} className="mb-2 border-b border-[var(--border-default)] pb-2 last:border-0 last:pb-0">
        <DataRow label="Reason" value={`${a.reason_code}: ${a.reason_description}`} />
        <DataRow label="Amount" value={a.amount ? `-${formatMoney(a.amount)}` : null} />
      </div>
    ))}
  </ExpandableCard>
);

const ServiceLine835 = ({ svc, index, forceState }) => {
  // Re-integrated fetched procedure descriptions
  const procCode = svc.procedure_code || '';
  const procDesc = svc.procedure_description && svc.procedure_description !== "Unknown Procedure" ? ` - ${svc.procedure_description}` : '';
  const procDisplay = `${procCode}${procDesc} ${svc.procedure_qualifier ? `(${svc.procedure_qualifier})` : ''}`.trim();

  return (
    <ExpandableCard title={`Service Line (${procCode || index + 1})`} loopInfo="SVC" icon={Stethoscope} defaultOpen={false} forceState={forceState}>
      <DataRow label="Procedure" value={procDisplay} />
      <DataRow label="Billed" value={formatMoney(svc.billed_amount)} />
      <DataRow label="Paid" value={formatMoney(svc.paid_amount)} />
      {svc.adjustments?.length > 0 ? (
        <div className="mt-2 border-t border-[var(--border-default)] pt-2">
          {svc.adjustments.map((adj, idx) => (
            <Adjustment835 key={idx} adj={adj} index={idx} forceState={forceState} />
          ))}
        </div>
      ) : null}
    </ExpandableCard>
  );
};

const Claim835 = ({ clp, forceState }) => {
  const p = clp.patient;
  const patName = p ? `${p.first_name || ''} ${p.last_name_org || ''}`.trim() : 'Unknown';
  return (
    <ExpandableCard title={`Claim: ${clp.claim_id}`} loopInfo="CLP Loop" icon={DollarSign} forceState={forceState}>
      <DataRow label="Status" value={`${clp.claim_status_code} - ${clp.claim_status}`} />
      <DataRow label="Patient" value={patName} />
      <DataRow label="Billed Amount" value={formatMoney(clp.billed_amount)} />
      <DataRow label="Paid Amount" value={formatMoney(clp.paid_amount)} />
      <DataRow label="Patient Resp." value={formatMoney(clp.patient_responsibility)} />

      {clp.adjustments?.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-[var(--border-default)] pt-3">
          <span className="mb-2 block px-3 text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">Claim Level Adjustments</span>
          {clp.adjustments.map((adj, idx) => (
            <Adjustment835 key={idx} adj={adj} index={idx} forceState={forceState} />
          ))}
        </div>
      ) : null}

      {clp.service_lines?.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-[var(--border-default)] pt-3">
          <span className="mb-2 block px-3 text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">Service Lines</span>
          {clp.service_lines.map((svc, idx) => (
            <ServiceLine835 key={idx} svc={svc} index={idx} forceState={forceState} />
          ))}
        </div>
      ) : null}
    </ExpandableCard>
  );
};

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

      {member.coverages?.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-[var(--border-default)] pt-3">
          {member.coverages.map((cov, idx) => (
            <Coverage834 key={idx} cov={cov} forceState={forceState} />
          ))}
        </div>
      ) : null}
    </ExpandableCard>
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

  // ADDED: Download Function
  const handleDownload = () => {
    const raw = treeData?.raw_edi || treeData?.raw || treeData?.parsed?.raw_edi || '';
    if (!raw) return alert("No raw EDI data available to download.");
    
    const blob = new Blob([raw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ClaimCraft_Corrected.edi';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const targetObj = treeData?.tree || treeData;
  const loopsToRender =
    targetObj?.loops ||
    targetObj?.claim_loops ||
    targetObj?.member_loops ||
    treeData?.claim_loops ||
    treeData?.member_loops ||
    [];

  if (!targetObj || loopsToRender.length === 0) {
    return (
      <div className="flex h-full flex-col bg-[var(--bg-surface-strong)]">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Parsed Data Structure</h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--text-secondary)]">
          No semantic tree data available or empty loops.
        </div>
      </div>
    );
  }

  const txType = targetObj?.transaction_type || treeData?.transaction_type || '';
  const is835 = txType.includes('835');
  const is834 = txType.includes('834');

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-surface-strong)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-default)] bg-[color:color-mix(in_srgb,var(--bg-base)_82%,white_18%)] px-4 py-3">
        <h3 className="text-sm font-bold tracking-wide text-[var(--text-primary)]">
          Parsed Data Structure
          <span className="ml-2 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
            {txType || '837P'}
          </span>
        </h3>
        
        {/* ADDED: Button Group for Expand All & Export EDI */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleAll}
            className="text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none"
          >
            {globalExpand ? 'Collapse All' : 'Expand All'}
          </button>

          <button 
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--text-primary)] px-3 py-1.5 text-xs font-bold text-[var(--bg-base)] shadow-sm transition-colors hover:opacity-90 focus:outline-none"
          >
            <Download className="h-3.5 w-3.5" /> Export EDI
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-4">
        {loopsToRender.map((loopItem, idx) => {
          if (is835) return <Claim835 key={idx} clp={loopItem} forceState={forceState} />;
          if (is834) return <Member834 key={idx} member={loopItem} forceState={forceState} />;
          return <BillingProvider837 key={idx} provider={loopItem} forceState={forceState} />;
        })}
      </div>
    </div>
  );
};

export default SemanticClaimViewer;
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { UploadCloud, Activity, Zap, Play, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const Reconcile = () => {
  const [data837, setData837] = useState(null);
  const [data835, setData835] = useState(null);
  const [loadingFile, setLoadingFile] = useState({ 837: false, 835: false });
  const [reconciling, setReconciling] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (file, type) => {
    setLoadingFile(prev => ({ ...prev, [type]: true }));
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/parse', formData);
      if (type === 837) setData837(res.data);
      if (type === 835) setData835(res.data);
    } catch (err) {
      console.error(err);
      setError(`Failed to parse ${type} file.`);
    } finally {
      setLoadingFile(prev => ({ ...prev, [type]: false }));
    }
  };

  const onDrop837 = useCallback((acceptedFiles) => {
     if (acceptedFiles.length) handleUpload(acceptedFiles[0], 837);
  }, []);
  
  const onDrop835 = useCallback((acceptedFiles) => {
     if (acceptedFiles.length) handleUpload(acceptedFiles[0], 835);
  }, []);

  const drop837 = useDropzone({ onDrop: onDrop837 });
  const drop835 = useDropzone({ onDrop: onDrop835 });

  const runReconciliation = async () => {
    if (!data837 || !data835) return;
    setReconciling(true);
    setError(null);
    try {
      const res = await axios.post('/api/reconcile', {
        parsed_837: data837,
        parsed_835: data835
      });
      // FIX 1: Access the correct key from the backend response
      setResults(res.data.matched_claims || []);
    } catch (err) {
      setError('Reconciliation failed. Check your data formats.');
      console.error(err);
    } finally {
      setReconciling(false);
    }
  };

  const renderDropzone = (type, dp, data, loading) => (
    <div 
      {...dp.getRootProps()} 
      className={`glass-panel relative overflow-hidden border-2 border-dashed p-10 text-center transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 group ${
        dp.isDragActive ? 'border-accent bg-blue-50/50 scale-[1.02]' : 
        data ? 'border-success/40 bg-success/5' : 'border-slate-300/60 hover:border-accent/40 bg-white/40 hover:bg-white/70'
      }`}
    >
      <input {...dp.getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        {data ? (
          <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center border-4 border-success/20 shadow-sm transition-transform duration-300 scale-110">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-white text-slate-400 flex items-center justify-center border border-white/60 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:text-accent group-hover:bg-blue-50">
            <UploadCloud className="w-7 h-7" />
          </div>
        )}
        <div>
          <h3 className={`text-lg font-bold ${data ? 'text-success' : 'text-slate-800'}`}>
            {data ? `${type} Parsed Successfully` : `Upload ${type} File`}
          </h3>
          {!data && <p className="text-slate-500 text-xs mt-1">Drag & drop or browse</p>}
        </div>
      </div>
      {loading && (
         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
           <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
         </div>
      )}
    </div>
  );

  return (
    <div className="flex-grow relative pt-28 pb-12 px-6">
      <div className="max-w-6xl mx-auto space-y-10 relative z-10 animate-fade-in-up">
        
        <div className="text-center">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4 tracking-tight drop-shadow-sm">835 vs 837 Reconciliation</h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">Upload the original 837 Claim and the 835 Remittance to cross-reference discrepancies.</p>
        </div>

        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
           {renderDropzone('837 Claim', drop837, data837, loadingFile[837])}
           
           <div className="flex justify-center">
             <div className="glass-panel w-14 h-14 rounded-full flex items-center justify-center text-accent shadow-md relative z-20">
               <Activity className="w-6 h-6 animate-pulse" />
             </div>
           </div>

           {renderDropzone('835 Remittance', drop835, data835, loadingFile[835])}
        </div>

        <div className="flex justify-center">
          <button 
            disabled={!data837 || !data835 || reconciling}
            onClick={runReconciliation}
            className={`flex items-center gap-2 px-10 py-3.5 rounded-full font-bold transition-all shadow-lg text-lg ${
              (!data837 || !data835) 
                ? 'bg-slate-200/50 text-slate-400 cursor-not-allowed shadow-none border border-slate-200 backdrop-blur-md' 
                : 'glass-button'
            }`}
          >
            {reconciling ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Running...</>
            ) : (
              <><Play className="w-5 h-5 fill-current" /> Run Reconciliation</>
            )}
          </button>
        </div>

        {error && (
          <div className="text-center text-danger font-medium p-4 bg-danger/10 rounded-xl border border-danger/20">
            {error}
          </div>
        )}

        {results && (
          <div className="glass-panel overflow-hidden mt-10 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
             <div className="p-6 border-b border-white/30 bg-white/40 flex items-center gap-3 backdrop-blur-md">
                <Zap className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-slate-800 text-lg">Reconciliation Report</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/50 border-b border-white/20 text-xs uppercase font-bold text-slate-500 tracking-wider">
                     <th className="px-6 py-4">Claim ID</th>
                     <th className="px-6 py-4">Billed</th>
                     <th className="px-6 py-4">Paid</th>
                     <th className="px-6 py-4">Delta</th>
                     <th className="px-6 py-4">CARC Reason</th>
                     <th className="px-6 py-4">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/20">
                   {results.map((r, i) => (
                     <tr key={i} className="hover:bg-white/40 transition-colors">
                       <td className="px-6 py-4 font-code text-sm text-slate-700">{r.claim_id || 'N/A'}</td>
                       <td className="px-6 py-4 font-medium">${parseFloat(r.billed || 0).toFixed(2)}</td>
                       <td className="px-6 py-4 font-medium">${parseFloat(r.paid || 0).toFixed(2)}</td>
                       <td className="px-6 py-4 font-medium text-danger">${parseFloat(r.delta || 0).toFixed(2)}</td>
                       <td className="px-6 py-4 text-sm text-slate-600">
                         {/* FIX 2: Map over the backend's adjustments array properly */}
                         {r.adjustments && r.adjustments.length > 0 
                           ? r.adjustments.map(adj => adj.reason_code).join(', ') 
                           : 'None'}
                       </td>
                       <td className="px-6 py-4">
                         {parseFloat(r.delta || 0) === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-success/10 text-success rounded-md">Matched</span>
                         ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-danger/10 text-danger rounded-md">Shortfall</span>
                         )}
                       </td>
                     </tr>
                   ))}
                   {results.length === 0 && (
                     <tr>
                       <td colSpan="6" className="text-center py-8 text-slate-500">No differences found.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reconcile;
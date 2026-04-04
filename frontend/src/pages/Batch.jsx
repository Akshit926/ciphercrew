import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { FileDown, CheckCircle2, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { useEdiStore } from '../store/useEdiStore';

const Batch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setParsedData = useEdiStore(state => state.setParsedData);
  
  const batchData = location.state?.batchData || [];

  // THE FIX: Handler to set the global store and navigate to the 3-panel view
  const handleViewFile = (item) => {
    setParsedData(item);
    navigate('/claims');
  };

  return (
    <div className="flex-grow relative pt-28 pb-12 px-6">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
           <div>
             <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight drop-shadow-sm">Batch Processing Results</h1>
             <p className="text-slate-500 mt-2">Processed {batchData.length} files from zip archive.</p>
           </div>
           <Link to="/" className="glass-panel inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5 transition-all">
             Upload Another
           </Link>
        </div>

        {batchData.length === 0 ? (
          <div className="glass-panel p-16 text-center text-slate-500 font-medium">
            No batch data found. Please upload a .zip file on the Home page.
          </div>
        ) : (
          <div className="glass-panel overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
                     <th className="px-6 py-4">File Name</th>
                     <th className="px-6 py-4">Transaction Type</th>
                     <th className="px-6 py-4">Errors</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   {batchData.map((item, idx) => {
                     const hasErrors = item.validation?.errors?.length > 0 || item.parsed?.errors?.length > 0;
                     const errorCount = (item.validation?.errors?.length || 0) + (item.parsed?.errors?.length || 0);
                     
                     const txType = item.parsed?.transaction_info?.type || 
                                    item.validation?.transaction_type || 
                                    item.parsed?.tree?.transaction_type;

                     return (
                       <tr 
                         key={idx} 
                         onClick={() => handleViewFile(item)}
                         className="hover:bg-slate-50 transition-all border-b border-slate-100 last:border-0 cursor-pointer group"
                       >
                         <td className="px-6 py-4 font-medium text-slate-800">
                           <div className="flex items-center gap-3">
                             <FileDown className="w-5 h-5 text-slate-400 group-hover:text-accent transition-colors" />
                             {item.filename || `File ${idx + 1}`}
                           </div>
                         </td>
                         <td className="px-6 py-4">
                           {txType ? (
                             <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-wider group-hover:bg-white group-hover:shadow-sm transition-all">
                               {txType}
                             </span>
                           ) : (
                             <span className="text-slate-400 text-sm">-</span>
                           )}
                         </td>
                         <td className="px-6 py-4">
                           {hasErrors ? (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                               <AlertTriangle className="w-3.5 h-3.5" /> {errorCount} found
                             </span>
                           ) : (
                             <span className="text-slate-400 text-sm font-medium">None</span>
                           )}
                         </td>
                         <td className="px-6 py-4">
                           {item.status === 'success' || !hasErrors ? (
                             <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                               <CheckCircle2 className="w-4 h-4" /> Passed
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger">
                               <XCircle className="w-4 h-4" /> Failed
                             </span>
                           )}
                         </td>
                         <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all">
                               View <ChevronRight className="w-4 h-4" />
                            </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Batch;
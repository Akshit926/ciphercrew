import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FileDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const Batch = () => {
  const location = useLocation();
  const batchData = location.state?.batchData || [];

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
          <div className="glass-panel overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/50 border-b border-white/20 uppercase text-xs font-bold text-slate-500 tracking-wider">
                     <th className="px-6 py-4">Filename</th>
                     <th className="px-6 py-4">File Type</th>
                     <th className="px-6 py-4">Segments</th>
                     <th className="px-6 py-4">Errors</th>
                     <th className="px-6 py-4">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/20">
                   {batchData.map((item, idx) => {
                     const errorCount = item.errors ? item.errors.length : 0;
                     const hasErrors = errorCount > 0;
                     
                     return (
                       <tr key={idx} className="hover:bg-white/40 transition-colors">
                         <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                           <FileDown className="w-5 h-5 text-slate-400" />
                           {item.filename || `file_${idx}`}
                         </td>
                         <td className="px-6 py-4 text-slate-600 font-code text-sm">
                           {item.type || 'Unknown'}
                         </td>
                         <td className="px-6 py-4 text-slate-600">
                           {item.segment_count || 0}
                         </td>
                         <td className="px-6 py-4">
                           {hasErrors ? (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                               <AlertTriangle className="w-3.5 h-3.5" /> {errorCount} found
                             </span>
                           ) : (
                             <span className="text-slate-400 text-sm">None</span>
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

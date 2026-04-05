import React, { useState, useEffect } from 'react';
import { X, Check, Wand2, RefreshCw, AlertCircle, Save } from 'lucide-react';
import axios from 'axios';
import { useEdiStore } from '../store/useEdiStore';

const AutoFixModal = ({ isOpen, onClose, rawEdi, errors }) => {
  const setParsedData = useEdiStore(state => state.setParsedData);

  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [fileLines, setFileLines] = useState([]); 
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasGenerated(false);
      setFileLines([]);
    }
  }, [isOpen]);

  const generateFix = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/autofix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_edi: rawEdi, errors: errors })
      });
      
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      
      const data = await response.json();
      if (data && data.fixed_edi) {
        calculateDiff(rawEdi, data.fixed_edi);
        setHasGenerated(true);
      } else {
        throw new Error("API did not return fixed_edi");
      }
    } catch (error) {
      console.error("Failed to generate fix:", error);
      alert(`Auto-fix failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDiff = (original, fixed) => {
    const origSegs = original.split('~').filter(Boolean);
    const fixedSegs = fixed.split('~').filter(Boolean);
    
    const lines = [];
    const maxLen = Math.max(origSegs.length, fixedSegs.length);
    
    for (let i = 0; i < maxLen; i++) {
      const isDiff = origSegs[i] !== fixedSegs[i];
      lines.push({
        index: i,
        original: origSegs[i] ? `${origSegs[i]}~` : '',
        suggested: fixedSegs[i] ? `${fixedSegs[i]}~` : '',
        isDifferent: isDiff,
        isAccepted: false // FIX: Default to false so button says "Accept" initially
      });
    }
    setFileLines(lines);
  };

  const toggleAccept = (index) => {
    setFileLines(prev => prev.map(line => 
      line.index === index ? { ...line, isAccepted: !line.isAccepted } : line
    ));
  };

  // THE NEW PIPELINE: Construct -> Parse -> Validate -> Update UI
  const handleApplyChanges = async () => {
    setIsApplying(true);
    try {
      // 1. Construct final string
      const finalEdiString = fileLines.map(line => 
        line.isDifferent && line.isAccepted ? line.suggested : line.original
      ).join('\n'); 

      // 2. Prepare file
      const blob = new Blob([finalEdiString], { type: 'text/plain' });
      const file = new File([blob], 'AutoFixed_Claim.edi', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

      // 3. Re-Parse
      const parseRes = await axios.post(`${baseUrl}/parse`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 4. Re-Validate
      const payload = parseRes.data.parsed || parseRes.data;
      const valRes = await axios.post(`${baseUrl}/validate/full`, { parsed: payload });

      // 5. Merge results and update global store
      const finalData = {
        ...parseRes.data,
        validation: {
          errors: valRes.data.errors || valRes.data.validation?.errors || [],
          warnings: valRes.data.warnings || valRes.data.validation?.warnings || []
        }
      };

      setParsedData(finalData);
      onClose();
    } catch (error) {
      console.error("Failed to apply changes:", error);
      alert("Failed to apply changes. Check the console for details.");
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  const diffCount = fileLines.filter(l => l.isDifferent).length;
  const acceptedCount = fileLines.filter(l => l.isDifferent && l.isAccepted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] overflow-hidden border border-slate-200">
        
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Review & Apply Fixes</h2>
              <p className="text-xs text-slate-500">AI has analyzed {errors.length} structural errors.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isApplying} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col bg-white">
          {!hasGenerated && !isLoading && (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 mb-6 max-w-md">Let ClaimCraft's AI rewrite the invalid segments to comply with strict HIPAA 5010 formatting rules.</p>
              <button 
                onClick={generateFix}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Wand2 className="w-5 h-5" /> Generate Fixes
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex-grow flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse">Reconstructing EDI syntax...</p>
            </div>
          )}

          {hasGenerated && (
            <div className="flex-grow overflow-y-auto p-6 font-mono text-sm custom-scrollbar bg-slate-50/50">
              <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                {fileLines.map((line) => {
                  if (!line.isDifferent) {
                    return (
                      <div key={line.index} className="flex border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <div className="w-12 shrink-0 bg-slate-100 border-r border-slate-200 text-slate-400 text-right pr-2 py-2 select-none text-xs flex items-center justify-end">
                          {line.index + 1}
                        </div>
                        <div className="py-2 px-4 text-slate-600 break-all w-full">
                          {line.original}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={line.index} className={`flex border-b border-slate-200 last:border-0 transition-colors ${line.isAccepted ? 'bg-green-50/30' : 'bg-white'}`}>
                      <div className={`w-12 shrink-0 border-r border-slate-200 text-right pr-2 py-2 select-none text-xs flex flex-col items-end justify-center font-bold ${line.isAccepted ? 'bg-green-100/50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                        {line.index + 1}
                      </div>
                      
                      <div className="flex-grow flex flex-col py-2 px-4 w-full border-r border-slate-100">
                        <div className="text-red-500 line-through decoration-red-500/50 break-all mb-1 bg-red-50/50 px-2 py-1 rounded border border-red-100/50">
                          {line.original}
                        </div>
                        <div className={`break-all px-2 py-1 rounded font-semibold border ${line.isAccepted ? 'text-green-800 bg-green-100 border-green-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                          {line.suggested}
                        </div>
                      </div>

                      <div className="w-32 shrink-0 flex items-center justify-center p-2 bg-slate-50/50">
                        <button 
                          onClick={() => toggleAccept(line.index)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-full justify-center border ${
                            line.isAccepted 
                              ? 'bg-green-500 text-white border-green-600 shadow-sm' 
                              : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <Check className="w-4 h-4" /> 
                          {line.isAccepted ? 'Accepted' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {hasGenerated && (
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-slate-800">{acceptedCount}</span>
              <span className="text-slate-500">of {diffCount} changes accepted.</span>
            </div>
            <button 
              onClick={handleApplyChanges}
              disabled={isApplying || acceptedCount === 0}
              className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${
                isApplying 
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                  : acceptedCount > 0 
                    ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isApplying ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Applying & Validating...</>
              ) : (
                <><Save className="w-4 h-4" /> Apply Changes to File</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoFixModal;
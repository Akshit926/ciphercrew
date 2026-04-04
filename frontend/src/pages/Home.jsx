import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useEdiStore } from '../store/useEdiStore';
import { UploadCloud, File, AlertCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const setParsedData = useEdiStore(state => state.setParsedData);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/parse', formData);
      
      const { data } = response;
      if (data.batch) {
        navigate('/batch', { state: { batchData: data.results } });
      } else {
        setParsedData(data);
        navigate('/claims'); 
        
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'An error occurred during parsing.');
    } finally {
      setLoading(false);
    }
  }, [navigate, setParsedData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="flex-grow flex items-center justify-center p-6 relative">
      {/* Ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[120px] animate-pulse-soft"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse-soft" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="max-w-3xl w-full relative z-10 animate-fade-in-up">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6 tracking-tight drop-shadow-sm">
            AI-Powered Healthcare EDI Parser
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Upload your X12 EDI documents (.edi, .txt) or a batch .zip file to instantly generate intelligent, actionable insights.
          </p>
        </div>
        
        <div 
          {...getRootProps()} 
          className={`glass-panel relative overflow-hidden border-2 border-dashed p-16 text-center transition-all duration-300 cursor-pointer shadow-xl group ${
            isDragActive ? 'border-accent bg-blue-50/50 scale-[1.02] shadow-accent/20' : 'border-slate-300 hover:border-accent/50 hover:bg-white/90 hover:shadow-2xl hover:-translate-y-1'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className={`p-5 rounded-full transition-all duration-300 group-hover:scale-110 shadow-sm ${isDragActive ? 'bg-accent text-white shadow-accent/30' : 'bg-slate-50 text-accent border border-slate-100 group-hover:bg-blue-50'}`}>
              <UploadCloud className="w-12 h-12" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-slate-800">
                {isDragActive ? 'Drop your file here' : 'Drag & Drop your EDI file'}
              </h3>
              <p className="text-slate-500 text-sm">or click to browse from your computer</p>
            </div>
            
            <div className="flex items-center gap-4 mt-6 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1"><File className="w-4 h-4"/> .edi</div>
              <div className="flex items-center gap-1"><File className="w-4 h-4"/> .txt</div>
              <div className="flex items-center gap-1"><File className="w-4 h-4"/> .zip</div>
            </div>
          </div>
          
          {loading && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
               <div className="flex flex-col items-center gap-3">
                 <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                 <p className="font-semibold text-primary animate-pulse">Parsing EDI...</p>
               </div>
             </div>
          )}
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3 p-4 bg-danger/10 text-danger rounded-xl border border-danger/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useEdiStore } from '../store/useEdiStore';
import { AlertCircle, AlertTriangle, CheckCircle2, MessageSquare, Send, Zap } from 'lucide-react';
import SemanticClaimViewer from '../components/SemanticClaimViewer';

const Claims = () => {
  const navigate = useNavigate();
  const parsedData = useEdiStore(state => state.parsedData);

  // Combine initial errors and warnings from the JSON structure
  const initialErrors = parsedData?.validation?.errors || parsedData?.parsed?.errors || parsedData?.errors || [];
  const initialWarnings = parsedData?.validation?.warnings || parsedData?.parsed?.warnings || parsedData?.warnings || [];
  
  const [validating, setValidating] = useState(false);
  const [validationItems, setValidationItems] = useState([...initialErrors, ...initialWarnings]);

  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatting, setChatting] = useState(false);
  const chatEndRef = useRef(null);

  const [activeTab, setActiveTab] = useState('validation'); // Defaulted to validation to see the new UI

  useEffect(() => {
    if (!parsedData) {
      navigate('/');
    }
  }, [parsedData, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatting]);

  if (!parsedData) return null;

  const rawEdi = parsedData.parsed?.raw_edi || parsedData.raw_edi || '';
  const rawLines = rawEdi ? rawEdi.split('~') : [];

  const handleFullValidate = async () => {
    setValidating(true);
    try {
      const payload = parsedData.parsed || parsedData;
      const res = await axios.post('/api/validate/full', { parsed: payload });
      const newErrors = res.data.errors || res.data.validation?.errors || [];
      const newWarnings = res.data.warnings || res.data.validation?.warnings || [];
      setValidationItems([...newErrors, ...newWarnings]);
    } catch (err) {
      console.error(err);
    } finally {
      setValidating(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatting) return;

    const newMsg = chatMessage.trim();
    setChatMessage('');
    setChatting(true);

    const historyForApi = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      content: msg.content
    }));

    setChatHistory(prev => [...prev, { role: 'user', content: newMsg }]);

    try {
      const res = await axios.post('/api/chat', {
        message: newMsg,
        history: historyForApi,
        parsed_context: {
          transaction_info: parsedData.parsed?.transaction_info || parsedData.transaction_info,
          tree: parsedData.parsed?.tree || parsedData.tree,
          raw_segment_count: parsedData.parsed?.raw_segment_count || parsedData.raw_segment_count,
          validation_errors: validationItems.filter(i => i.severity !== 'WARNING'),
          validation_warnings: validationItems.filter(i => i.severity === 'WARNING')
        }
      });
      setChatHistory(prev => [...prev, { role: 'model', content: res.data.response || res.data.reply || 'No response from model.' }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', content: '⚠️ Error communicating with AI assistant.' }]);
    } finally {
      setChatting(false);
    }
  };

  const formatRawLine = (line) => {
    if (!line.trim()) return null;
    const parts = line.split('*');
    if (parts.length === 0) return line;
    return (
      <div className="font-code text-xs leading-relaxed mb-1 pb-1 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded px-1 transition-colors">
        <span className="font-bold text-accent">{parts[0]}</span>
        {parts.slice(1).map((p, i) => (
          <span key={i}>
            <span className="text-slate-500">*</span>
            <span className="text-success">{p}</span>
          </span>
        ))}
        <span className="text-slate-500">~</span>
      </div>
    );
  };

  const errorCount = validationItems.filter(i => i.severity === 'ERROR' || !i.severity).length;
  const warningCount = validationItems.filter(i => i.severity === 'WARNING').length;

  return (
    <div className="flex-grow flex flex-col h-screen pt-24 pb-6 px-6 relative">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] animate-pulse-soft"></div>
        <div className="absolute bottom-[10%] -right-[5%] w-[30%] h-[30%] rounded-full bg-primary/10 blur-[100px] animate-pulse-soft" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 h-full gap-6 relative z-10">

        {/* Left: Raw EDI */}
        <div className="glass-panel flex flex-col overflow-hidden animate-fade-in-up shadow-lg" style={{animationDelay: '0.1s'}}>
          <div className="px-5 py-4 bg-white/50 border-b border-slate-200/50 flex items-center justify-between backdrop-blur-md">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Raw X12
            </h3>
          </div>
          <div className="flex-grow overflow-auto p-5 custom-scrollbar">
            {rawLines.map((line, idx) => (
              <React.Fragment key={idx}>
                {formatRawLine(line)}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Center: Semantic Tree */}
        <div className="glass-panel flex flex-col overflow-hidden animate-fade-in-up shadow-xl shadow-slate-200/50" style={{animationDelay: '0.2s'}}>
          <SemanticClaimViewer treeData={parsedData.parsed?.tree || parsedData.tree} />
        </div>

        {/* Right: Tabbed Errors & Chat */}
        <div className="flex flex-col gap-4 overflow-hidden h-full">
          
          {/* Tab Selector */}
          <div className="flex bg-white/40 backdrop-blur-md rounded-xl p-1.5 border border-slate-200/50 shadow-sm shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'chat'
                  ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <MessageSquare className={`w-4 h-4 ${activeTab === 'chat' ? 'text-accent' : ''}`} />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'validation'
                  ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <AlertCircle className={`w-4 h-4 ${activeTab === 'validation' ? (errorCount > 0 ? 'text-red-500' : 'text-amber-500') : ''}`} />
              Validation Status
              {(errorCount > 0 || warningCount > 0) && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-1 ${errorCount > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  {validationItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-grow overflow-hidden relative">
            
            {/* Validation Panel */}
            {activeTab === 'validation' && (
              <div className="glass-panel flex flex-col h-full overflow-hidden animate-fade-in-up shadow-lg absolute inset-0">
                <div className="px-5 py-4 bg-white/50 border-b border-slate-200/50 flex items-center justify-between backdrop-blur-sm">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    Validation Results
                  </h3>
                  <button
                    onClick={handleFullValidate}
                    disabled={validating}
                    className="glass-button text-xs py-1.5 px-4"
                  >
                    {validating ? 'Validating...' : 'Re-Validate'}
                  </button>
                </div>
                <div className="flex-grow overflow-auto p-4 space-y-3 custom-scrollbar">
                  {validationItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                      <p className="text-sm font-medium">No validation issues detected.</p>
                    </div>
                  ) : (
                    validationItems.map((item, idx) => {
                      const isWarning = item.severity === 'WARNING';
                      return (
                        <div 
                          key={idx} 
                          className={`p-3 border rounded-xl flex gap-3 text-sm shadow-sm transition-colors ${
                            isWarning 
                              ? 'bg-amber-50/60 border-amber-200' 
                              : 'bg-red-50/60 border-red-200'
                          }`}
                        >
                          {isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex flex-col gap-1.5">
                            <span className={`font-medium ${isWarning ? 'text-amber-900' : 'text-red-900'}`}>
                              {typeof item === 'object' ? item.message || item.description || JSON.stringify(item) : item}
                            </span>
                            {typeof item === 'object' && (item.rule_id || item.loop) && (
                              <div className={`text-xs font-code flex flex-wrap gap-2 ${isWarning ? 'text-amber-700/80' : 'text-red-700/80'}`}>
                                {item.rule_id && <span>[{item.rule_id}]</span>}
                                {item.loop && <span>{item.loop}</span>}
                                {item.segment && <span>{item.segment}{item.element ? `-${item.element}` : ''}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Chat Panel */}
            {activeTab === 'chat' && (
              <div className="glass-panel flex flex-col h-full overflow-hidden animate-fade-in-up shadow-lg absolute inset-0">
                <div className="flex-grow overflow-auto p-5 space-y-4 custom-scrollbar bg-slate-50/30">
                  {chatHistory.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm mt-8 animate-fade-in">
                      Ask me anything about this claim. Try:<br />
                      <span className="inline-block mt-3 font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-sm cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => setChatMessage("Why was this claim denied?")}>"Why was this claim denied?"</span>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`} style={{animationDuration: '0.3s'}}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-primary to-accent text-white rounded-tr-sm shadow-primary/20'
                            : 'bg-white border border-slate-200/60 text-slate-700 rounded-tl-sm backdrop-blur-sm'
                          }`}>
                          {msg.content.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                        </div>
                      </div>
                    ))
                  )}
                  {chatting && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-white/60 border-t border-slate-200/50 backdrop-blur-md">
                  <form onSubmit={handleChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Ask about specific segments..."
                      className="flex-grow bg-white/80 border border-slate-200 rounded-full px-5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all shadow-inner"
                      disabled={chatting}
                    />
                    <button
                      type="submit"
                      disabled={chatting || !chatMessage.trim()}
                      className="glass-button !p-2.5 !rounded-full aspect-square flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Claims;
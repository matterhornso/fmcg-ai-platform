import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';

/** Simple markdown renderer: bold, inline code, code blocks, bullet lists */
function renderMarkdown(text: string): string {
  let html = text
    // Code blocks: ```...```
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code: `...`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold: **...**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Bold: __...__
    .replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Convert bullet lines (- item or * item) into <ul><li>
  const lines = html.split('\n');
  let inList = false;
  const processed: string[] = [];
  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (bulletMatch) {
      if (!inList) { processed.push('<ul>'); inList = true; }
      processed.push(`<li>${bulletMatch[1]}</li>`);
    } else {
      if (inList) { processed.push('</ul>'); inList = false; }
      processed.push(line);
    }
  }
  if (inList) processed.push('</ul>');
  return processed.join('\n');
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  agentType: 'quality' | 'complaints' | 'finance';
  context?: string;
  placeholder?: string;
}

const agentConfig = {
  quality: {
    name: 'QualityAI',
    color: 'bg-success-600',
    lightBg: 'bg-success-50',
    borderColor: 'border-success-200',
    dotColor: 'bg-success-500',
    textColor: 'text-success-700',
    description: 'Ask about audit processes, compliance, HACCP, corrective actions...',
  },
  complaints: {
    name: 'ComplaintAI',
    color: 'bg-danger-500',
    lightBg: 'bg-danger-50',
    borderColor: 'border-danger-200',
    dotColor: 'bg-danger-500',
    textColor: 'text-danger-600',
    description: 'Ask about complaint handling, root cause analysis, regulatory requirements...',
  },
  finance: {
    name: 'FinanceAI',
    color: 'bg-accent-500',
    lightBg: 'bg-accent-50',
    borderColor: 'border-accent-200',
    dotColor: 'bg-accent-400',
    textColor: 'text-accent-600',
    description: 'Ask about export documentation, Incoterms, payment terms, compliance...',
  },
};

const suggestedPrompts: Record<string, string[]> = {
  quality: [
    "What does a BRC audit cover?",
    "Generate a HACCP checklist for biscuits",
    "What corrective actions for metal contamination?",
  ],
  complaints: [
    "How to handle a foreign object complaint?",
    "What are FSSAI notification requirements?",
    "Draft a root cause analysis template",
  ],
  finance: [
    "What documents does UAE require for food imports?",
    "Explain CIF vs FOB for FMCG exports",
    "What is RoDTEP and how to claim it?",
  ],
};

export default function AIChat({ agentType, context, placeholder }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const config = agentConfig[agentType];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendPrompt = async (text: string) => {
    if (loading) return;
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`/api/${agentType}/chat`, {
        messages: newMessages,
        context,
      });
      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`/api/${agentType}/chat`, {
        messages: newMessages,
        context,
      });
      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-xl overflow-hidden bg-white border ${config.borderColor} shadow-sm`}>
      {/* Header */}
      <div className={`${config.color} px-4 py-3 flex items-center gap-2`}>
        <Bot className="w-5 h-5 text-white" />
        <span className="text-white font-medium text-sm">{config.name}</span>
        <div className="ml-auto flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-white/60 hover:text-white/90 transition-colors flex items-center gap-1 text-xs"
              aria-label="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
            <span className="text-white/80 text-xs font-mono">Active</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className={`${config.lightBg} rounded-xl p-4 text-center border ${config.borderColor}`}>
            <Bot className={`w-8 h-8 mx-auto mb-2 ${config.textColor} opacity-50`} />
            <p className="text-sm text-surface-500 mb-3">{placeholder || config.description}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {(suggestedPrompts[agentType] || []).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendPrompt(prompt)}
                  className={`text-xs ${config.lightBg} ${config.textColor} border ${config.borderColor} rounded-full px-3 py-1.5 hover:opacity-80 transition-opacity text-left`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant' ? config.color : 'bg-surface-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-surface-600" />
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'assistant'
                  ? 'bg-surface-50 text-surface-800 border border-surface-200/60'
                  : `${config.color} text-white`
              }`}
            >
              {msg.role === 'assistant' ? (
                <div
                  className="chat-markdown whitespace-pre-wrap font-sans [&>pre]:my-2 [&>ul]:my-1 [&>ol]:my-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-surface-50 border border-surface-200/60 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className={`w-2 h-2 ${config.dotColor} rounded-full typing-dot`} />
                  <div className={`w-2 h-2 ${config.dotColor} rounded-full typing-dot`} />
                  <div className={`w-2 h-2 ${config.dotColor} rounded-full typing-dot`} />
                </div>
                <span className={`text-xs ${config.textColor} font-medium`}>{config.name} is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-surface-200 p-3 bg-surface-50/50">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI agent..."
            aria-label="Chat message"
            rows={1}
            className="flex-1 resize-none input text-sm"
            style={{ minHeight: '38px', maxHeight: '100px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className={`${config.color} hover:opacity-90 text-white p-2 rounded-lg transition-all duration-200 disabled:opacity-50 flex-shrink-0`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

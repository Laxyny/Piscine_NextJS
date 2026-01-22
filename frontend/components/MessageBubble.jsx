import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

export default function MessageBubble({ role, content, time }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`message ${role}`}>
      <div className="message-bubble">
        <div className="message-sender">
          {role === 'user' ? 'Vous' : 'Grok'}
        </div>
        
        <div className="markdown-content">
          {role === 'user' ? (
            <p>{content}</p>
          ) : (
            <ReactMarkdown
              components={{
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  
                  return !inline && match ? (
                    <div className="code-block-wrapper">
                      <div className="code-header">
                        <span>{match[1]}</span>
                        <button 
                          className="copy-btn" 
                          onClick={() => handleCopy(codeString)}
                        >
                          {copied ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>

        <div className="message-time">
           {time ? new Date(time).toLocaleTimeString() : ''}
        </div>
      </div>
    </div>
  );
}

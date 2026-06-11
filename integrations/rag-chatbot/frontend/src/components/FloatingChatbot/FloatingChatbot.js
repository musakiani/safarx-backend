import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiMessageCircle, FiX, FiSend, FiLoader } from 'react-icons/fi';
import { chatAPI } from '../../services/api';
import './FloatingChatbot.css';

const initialMessages = [
  {
    role: 'assistant',
    content: 'Assalam-o-Alaikum! I am SafarX assistant. How can I help you today?'
  }
];

function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const lastUserMessage = useMemo(
    () => messages.slice().reverse().find((message) => message.role === 'user'),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen((current) => !current);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isLoading) {
      return;
    }

    const userMessage = { role: 'user', content: trimmedMessage };
    const nextMessages = [...messages, userMessage];
    
    setMessages(nextMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatAPI.sendMessage(nextMessages);
      const reply = response?.reply?.trim();

      if (!reply) {
        throw new Error('Empty response from server');
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', content: reply }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="safarx-chatbot-root">
      {isOpen && <button className="safarx-chatbot-backdrop" aria-label="Close chat" onClick={toggleChat} />}

      {isOpen ? (
        <section className="safarx-chatbot-panel" aria-label="SafarX chatbot">
          <header className="safarx-chatbot-header">
            <div>
              <p className="safarx-chatbot-kicker">SafarX Assistant</p>
              <h2>Chat support</h2>
            </div>
            <button type="button" className="safarx-chatbot-close" onClick={toggleChat} aria-label="Close chat">
              <FiX />
            </button>
          </header>

          <div className="safarx-chatbot-body">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 20)}`}
                className={`safarx-chatbot-message ${message.role === 'user' ? 'is-user' : 'is-bot'}`}
              >
                <div className="safarx-chatbot-bubble">{message.content}</div>
              </div>
            ))}

            {isLoading && (
              <div className="safarx-chatbot-message is-bot">
                <div className="safarx-chatbot-bubble is-loading" aria-live="polite">
                  <span className="safarx-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="safarx-chatbot-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="safarx-chat-input">
              Type your message
            </label>
            <input
              id="safarx-chat-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask about tracking, pricing, or support..."
              disabled={isLoading}
            />
            <button type="submit" className="safarx-chatbot-send" disabled={isLoading || !inputValue.trim()}>
              <FiSend />
              <span>Send</span>
            </button>
          </form>

          {lastUserMessage && (
            <div className="safarx-chatbot-footer-note">Last question: {lastUserMessage.content}</div>
          )}
        </section>
      ) : null}

      <button type="button" className="safarx-chatbot-launcher" onClick={toggleChat} aria-label="Open SafarX chat">
        <FiMessageCircle />
        <span>Chat</span>
      </button>
    </div>
  );
}

export default FloatingChatbot;
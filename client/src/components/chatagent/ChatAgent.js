import React, { useState, useEffect, useRef } from 'react';

const ChatAgent = () => {
  const [messages, setMessages] = useState([{content: "Hey there, I am Genie. How may I help you today?", type: "bot"}]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const messagesEndRef = useRef(null);
  const recognition = useRef(null);

  useEffect(() => {
    initializeSpeechRecognition();
    scrollToBottom();
    setIsAnimating(false);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.onresult = handleSpeechResult;
    } else {
      console.error('Speech recognition not supported');
    }
  };

  const handleSpeechResult = (event) => {
    const transcript = Array.from(event.results).map((result) => result[0].transcript).join('');
    setInput(transcript);
  };

  const toggleListening = () => {
    if (isListening) {
      recognition.current.stop();
      setIsAnimating(false);
    } else {
      recognition.current.start();
      setIsAnimating(true);
    }
    setIsListening(!isListening);
  };

  const formatResponse = (text) => {
    // Replace multiple asterisks with appropriate HTML tags
    let formattedText = text.replace(/\*\*\*\*(.*?)\*\*\*\*/g, '<strong><em>$1</em></strong>');
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace new line characters with <br> tags
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage = { content: input, type: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    if (isListening) {
      toggleListening();
    }
    setError(null);

    try {
      const response = await fetch('https://aiagentserver.detrace.systems/graph/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { messages: [input] } }),
      });
      if (!response.ok) {
        setIsAnimating(false);
        throw new Error('Network response was not ok');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chatbot && data.chatbot.messages) {
                botResponse += data.chatbot.messages[0].content;
              }
            } catch (parseError) {
              console.error('Error parsing JSON:', parseError);
              // Continue processing other lines even if one fails
            }
          }
        }
      }

      const formattedResponse = formatResponse(botResponse);

      setMessages((prev) => [...prev, { content: formattedResponse, type: 'bot' }]);
      speakResponse(botResponse.replace(/\*+/g, '')); // Remove all asterisks for speech
    } catch (err) {
      setError('Failed to fetch response. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
      setIsAnimating(true);
    }
  };

  const speakResponse = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = speechSynthesis.getVoices().find((voice) => voice.name === 'Google US English') || speechSynthesis.getVoices()[0];
    speechSynthesis.speak(utterance);
    utterance.onend = () => {
      setIsAnimating(false);
    };
  };

  return (
    <div className="chat-container">
      <div className="blob-container">
        <div className={`blob ${isAnimating ? 'animate' : ''}`}></div>
        <div className="blob-label">Genie AI</div>
      </div>
      <div className="chat-interface">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className='content' dangerouslySetInnerHTML={{ __html: message.content }}></div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={toggleListening}
            className={`listen-button ${isListening ? 'listening' : ''}`}
          >
            {isListening ? 'Stop' : 'Listen'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatAgent;
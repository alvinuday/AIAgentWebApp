import React, { useState, useEffect, useRef } from 'react';

const ChatAgent = () => {
  const [messages, setMessages] = useState([]);
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
      setIsAnimating(false); // Start animating the blob
    } else {
      recognition.current.start();
      setIsAnimating(true); // Start animating the blob
    }
    setIsListening(!isListening);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage = { content: input, type: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    if(isListening==true){
        toggleListening();
    }
    setError(null);

    try {
      const response = await fetch('https://aiagentserver-yvfifalxwa-ew.a.run.app/graph/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { messages: [input] } }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      console.log('Response:', response);
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
            const data = JSON.parse(line.slice(6));
            if (data.chatbot && data.chatbot.messages) {
              botResponse += data.chatbot.messages[0].content;
            }
          }
        }
      }

      setMessages((prev) => [...prev, { content: botResponse, type: 'bot' }]);
      speakResponse(botResponse);
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
    }
  };

  return (
    <div style={{ display: 'flex', backgroundColor: '#000029', height: '100vh', padding: "5vw" }}>
      {/* Blob Animation and Label */}
      <div className="blobBox" style={{ width: '30%', position: 'relative' }}>
        {/* Blob Animation */}
        <div className={`blob ${isAnimating ? 'animate' : ''}`}></div>
        <p style={{ textAlign: 'center', color: '#FFFFFF', fontWeight: 'bold', width: '100%' }}>Jarvis</p>
      </div>

      {/* Chat Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '0.5rem 1rem',
                  borderRadius: '1rem',
                  backgroundColor: message.type === 'user' ? '#dcf8c6' : 'white',
                  color: message.type === 'user' ? 'black' : 'black',
                }}
              >
                <p style={{ margin: 0 }}>{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {error && (
          <div
            style={{
              backgroundColor: '#ffcccc',
              color: '#cc0000',
              padding: '0.5rem',
              marginBottom: '1rem',
              borderRadius: '0.25rem',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem',
              marginRight: '0.5rem',
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#075e54',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={toggleListening}
            style={{
              backgroundColor: isListening ? '#cc0000' : '#075e54',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              marginLeft: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatAgent;

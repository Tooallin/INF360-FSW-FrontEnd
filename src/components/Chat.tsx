import React, { useState, useRef, useEffect } from 'react';
import '../App.css';

interface MessageMap {
    [conversationId: string]: string[];
}

const Chat: React.FC = () => {
    const [conversations] = useState(['Conversación 1', 'Conversación 2', 'Conversación 3']);
    const [currentConversation, setCurrentConversation] = useState(conversations[0]);
    const [messages, setMessages] = useState<MessageMap>({
        'Conversación 1': [],
        'Conversación 2': [],
        'Conversación 3': []
    });
    const [input, setInput] = useState('');
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const handleSend = () => {
        if (input.trim()) {
            const userMessage = `Tú: ${input.trim()}`;
            const botReply = 'Gracias por tu mensaje';
            setMessages(prev => ({
                ...prev,
                [currentConversation]: [...prev[currentConversation], userMessage, botReply]
            }));
            setInput('');
        }
    };
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentConversation]);
    return (
        <div className="chat-layout">
            {isSidebarVisible && (
                <div className="sidebar">
                    <h3><br></br></h3>
                    <ul>
                        {conversations.map((conv) => (
                        <li
                            key={conv}
                            onClick={() => {
                            setCurrentConversation(conv);
                            setIsSidebarVisible(false);
                            }}
                            className={conv === currentConversation ? 'active' : ''}
                        >
                            {conv}
                        </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="chat-container">
                <button
                    className="hamburger-btn"
                    onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                    aria-label="Toggle menu"
                >
                    ☰
                </button>
                <h3 className='titulo'>Remember me</h3> 
                <div className="messages-box">
                    {messages[currentConversation].length === 0 && <p className="text">¿En que puedo ayudarte?</p>}
                    {messages[currentConversation].map((msg, i) => (
                        <div key={i} className="mb-2">{msg}</div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="input-group">
                    <input
                        className="form-control"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button className="boton-enviar" onClick={handleSend}>
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;

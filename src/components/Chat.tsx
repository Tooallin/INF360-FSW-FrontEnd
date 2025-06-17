import React, { useState, useRef, useEffect } from 'react';
import '../App.css';

interface MessageMap {
    [conversationId: string]: string[];
}

const Chat: React.FC = () => {
    const [conversations, setConversations] = useState(['Conversación 1']);
    const [currentConversation, setCurrentConversation] = useState(conversations[0]);
    const [messages, setMessages] = useState<MessageMap>({
        'Conversación 1': []
    });
    const [input, setInput] = useState('');
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isTyping, setIsTyping] = useState(false);

    const handleAddConversation = () => {
        const newId = conversations.length + 1;
        const newConversation = `Conversación ${newId}`;
        setConversations(prev => [newConversation,...prev]);
        setMessages(prev => ({
            ...prev,
            [newConversation]: []
        }));
        setCurrentConversation(newConversation);
    };
    const handleSend = async () => {
        if (input.trim()) {
            const userMessage = `Tú: ${input.trim()}`;
            setMessages(prev => ({
                ...prev,
                [currentConversation]: [...prev[currentConversation], userMessage]
            }));
            setInput('');
            setIsTyping(true); 
            try {
                const response = await fetch('http://localhost:8000/api/message/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id_chat: 1,
                        user_question: input.trim(),
                        ai_response: ""
                    }),
                });
                if (!response.ok) {
                    throw new Error('Respuesta no OK del servidor');
                }
                const data = await response.json();
                const botReply = `Bot: ${data.ai_response}`;
                setMessages(prev => ({
                    ...prev,
                    [currentConversation]: [...prev[currentConversation], botReply]
                }));
            } catch (error) {
                console.error('Error al enviar mensaje al backend:', error);
            } finally {
                setIsTyping(false); 
            }
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentConversation]);
    return (
        <div className="chat-layout">
            <div className={`sidebar ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
                <h3><br /></h3>
                <ul>
                <li onClick={handleAddConversation} className="add-chat">✚ Nuevo chat</li>
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
                    {messages[currentConversation].map((msg, i) => {
                        const isUser = msg.startsWith('Tú:');
                        return (
                            <div
                                key={i}
                                className={`message ${isUser ? 'user-message' : 'bot-message'}`}
                            >
                                {msg}
                            </div>
                        );
                    })}
                    {isTyping && (
                    <div className="typing-indicator">Bot está escribiendo...</div>
                    )}
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

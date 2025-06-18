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
    const [isTypingInitialMessage, setIsTypingInitialMessage] = useState(false);

    const handleBaseMessage = async () => {
        try {
            setIsTypingInitialMessage(true);
            const response = await fetch('http://10.147.19.99:8000/api/message/createbase', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Respuesta no OK del servidor');
            }
            const data = await response.json();
            const botReply = `Memo: ${data.ai_response}`;
            setBaseMessage(botReply);
            setIsTypingInitialMessage(false);
        } catch (error) {
            setIsTypingInitialMessage(false);
            setBaseMessage('Ocurrió un error inesperado, intenta más tarde');
            console.error('Error al enviar mensaje al backend:', error);
        } finally {
            setIsTypingInitialMessage(false);
        }
    };

    const [baseMessage, setBaseMessage] = useState('');

    useEffect(() => {
        handleBaseMessage();
    }, []);

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
                const botReply = `Memo: ${data.ai_response}`;
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
                <div className="navbar">
                    <button
                        className="hamburger-btn"
                        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                        aria-label="Toggle menu"
                    >
                        ☰
                    </button>
                    <div className="navbar-logo-title">
                        <img src="image/logoRemember.png" alt="Logo" className="navbar-logo" />
                        <span className="titulo">Remember me</span>
                    </div>
                </div>
                <div className="messages-box">
                    {messages[currentConversation].length === 0 ? (
                    <div className="message bot-message-with-avatar">
                        {isTypingInitialMessage ? 
                            (
                                <div className="typing-indicator">Memo está escribiendo...</div>
                            ) : (
                                <>
                                    <img src="image/logoBot.png" alt="Bot" className="bot-avatar" />
                                    <div className="bot-message-bubble">{baseMessage}</div>
                                </>
                            )
                        }
                    </div>
                    ) : (
                    messages[currentConversation].map((msg, i) => {
                        const isUser = msg.startsWith('Tú:');

                        if (isUser) {
                        return (
                            <div key={i} className="message user-message">
                            {msg}
                            </div>
                        );
                        }

                        return (
                        <div key={i} className="message bot-message-with-avatar">
                            <img src="image/logoBot.png" alt="Bot" className="bot-avatar" />
                            <div className="bot-message-bubble">{msg.replace('Memo: ', '')}</div>
                        </div>
                        );
                    })
                    )}
                    {isTyping && (
                    <div className="typing-indicator">Memo está escribiendo...</div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="input-bar">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Escribe un mensaje ..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button className="send-button" onClick={handleSend}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24" fill="#fff">
                            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;

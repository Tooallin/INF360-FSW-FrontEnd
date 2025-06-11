import { View, Text, Image } from 'react-native';
import React, { useState } from 'react';
import { GiftedChat } from 'react-native-gifted-chat';
import axios from 'axios';
import botAvatar from './huevito.jpg';

const ChatBot = () => {
    const [messages, setMessages] = useState([]);

    const API_KEY = '';

    const handleSend = async (newMessages = []) => {
        try {
            // Get the user's message
            const userMessage = newMessages[0];

            // Add the user's message
            setMessages(previousMessages => GiftedChat.append(previousMessages, userMessage));
            const messageText = userMessage.text.toLowerCase();
            const keywords = [];
            if (!keywords.some(keyword => messageText.includes(keyword))) {
                // default message
                const botMessage = {
                    _id: new Date().getTime() + 1,
                    text: "El Pete ete sech eso tilín",
                    createdAt: new Date(),
                    user: {
                        _id: 2,
                        name: 'Bot',
                        avatar: botAvatar,
                    }
                };
                setMessages(previousMessages => GiftedChat.append(previousMessages, botMessage));
                return;
            }

            
        } catch (error) {
            console.log(error);
        }
    }
    return (
        <View style={{ flex: 1}}>
            <View
                style={{
                    backgroundColor: "#fff",
                    padding: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottomWidth: 1,
                    marginTop: 40,
                    marginBottom: 5,
                }}
            >
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#000' }}>
                    RememberMe
                </Text>
                <Image source={require('./huevito.jpg')} />
            </View>
                <GiftedChat
                    messages={messages}
                    onSend={newMessages => handleSend(newMessages)}
                    user={{
                        _id: 1,
                    }}
                    placeholder="Escriba un mensaje..."
                    alwaysShowSend
                    scrollToBottom
                    scrollToBottomComponent={() => (
                        <Text style={{ color: '#fff', fontSize: 16 }}>↓</Text>
                    )}/>
            
        </View>
    )
}

export default ChatBot;
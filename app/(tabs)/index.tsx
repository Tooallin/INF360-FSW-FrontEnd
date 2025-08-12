import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet, Animated , KeyboardAvoidingView, Platform
} from 'react-native';

interface MessageMap {
  [conversationId: string]: string[];
}

const Chat: React.FC = () => {
  const [blinkAnim] = useState(new Animated.Value(1));
  const [conversations, setConversations] = useState(['Conversación 1']);
  const [currentConversation, setCurrentConversation] = useState(conversations[0]);
  const [messages, setMessages] = useState<MessageMap>({
    'Conversación 1': []
  });
  const [input, setInput] = useState('');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isTyping, setIsTyping] = useState(false);

  const handleBaseMessage = async () => {
    try {
      setIsTyping(true);
      const response = await fetch('http://10.147.19.90:8000/api/message/createbase', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Respuesta no OK del servidor');
      const data = await response.json();
      const botReply = `Memo: ${data.ai_response}`;
      setMessages(prev => ({
        ...prev,
        [currentConversation]: [...prev[currentConversation], botReply]
      }));
    } catch (error) {
      setMessages(prev => ({
        ...prev,
        [currentConversation]: [...prev[currentConversation], 'Ocurrió un error inesperado, intenta más tarde']
      }));
      console.error('Error al enviar mensaje al backend:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddConversation = () => {
    const newId = conversations.length + 1;
    const newConversation = `Conversación ${newId}`;
    setConversations(prev => [newConversation, ...prev]);
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
        const response = await fetch('http://10.147.19.90:8000/api/message/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_chat: 1,
            user_question: input.trim(),
            ai_response: ""
          }),
        });
        if (!response.ok) throw new Error('Respuesta no OK del servidor');
        const data = await response.json();
        const botReply = `Memo: ${data.ai_response}`;
        setMessages(prev => ({
          ...prev,
          [currentConversation]: [...prev[currentConversation], botReply]
        }));
      } catch (error) {
        setMessages(prev => ({
          ...prev,
          [currentConversation]: [...prev[currentConversation], 'Ocurrió un error inesperado, intenta más tarde']
        }));
        console.error('Error al enviar mensaje al backend:', error);
      } finally {
        setIsTyping(false);
      }
    }
  };
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      blinkAnim.setValue(1); 
    }
  }, [isTyping]);

  useEffect(() => {
    if (messages[currentConversation].length === 0) {
      handleBaseMessage();
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, currentConversation]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      keyboardVerticalOffset={0} 
    >
    <View style={styles.container}>
      {/* Sidebar */}
      {isSidebarVisible && (
        <View style={styles.sidebar}>
          <TouchableOpacity onPress={handleAddConversation} style={styles.addChatButton}>
            <Text style={styles.addChatText}>✚ Nuevo chat</Text>
          </TouchableOpacity>
          <ScrollView>
            {conversations.map((conv) => (
              <TouchableOpacity
                key={conv}
                onPress={() => {
                  setCurrentConversation(conv);
                  setIsSidebarVisible(false);
                }}
                style={[
                  styles.conversationItem,
                  conv === currentConversation && styles.activeConversationItem,
                ]}
              >
                <Text style={[
                  styles.conversationText,
                  conv === currentConversation && styles.activeConversationText,
                ]}>
                  {conv}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.chatContainer}>
        {/* Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setIsSidebarVisible(!isSidebarVisible)}
            accessibilityLabel="Toggle menu"
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.navbarLogoTitle}>
            <Image
              source={require('../../assets/images/logoRemember.png')}
              style={styles.navbarLogo}
            />
            <Text style={styles.title}>Remember me</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.messagesBox}
          ref={scrollViewRef}
          contentContainerStyle={{ padding: 10 }}
        >
          {messages[currentConversation].map((msg, i) => {
            const isUser = msg.startsWith('Tú:');
            if (isUser) {
              return (
                <View key={i} style={styles.userMessage}>
                  <Text style={styles.userMessageText}>{msg}</Text>
                </View>
              );
            }
            return (
              <View key={i} style={styles.botMessageWithAvatar}>
                <Image
                  source={require('../../assets/images/logoBot.png')}
                  style={styles.botAvatar}
                />
                <View style={styles.botMessageBubble}>
                  <Text style={styles.botMessageText}>{msg.replace('Memo: ', '')}</Text>
                </View>
              </View>
            );
          })}
          {isTyping && (
            <Animated.Text style={[styles.typingIndicator, { opacity: blinkAnim }]}>
              Memo está escribiendo...
            </Animated.Text>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Escribe un mensaje ..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#dff1f8' },

  sidebar: {
    width: 220,
    backgroundColor: '#aec4df',
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    
  },

  addChatButton: {
    backgroundColor: 'white',
    borderColor: '#5d8edb',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  addChatText: {
    color: '#4F5C6C',
    fontWeight: '600',
  },

  conversationItem: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    backgroundColor: '#CFA5FF',
  },
  activeConversationItem: {
    backgroundColor: '#AE81E0',
  },
  conversationText: {
    color: '#4F5C6C',
    textAlign: 'center',
  },
  activeConversationText: {
    color: 'white',
    fontWeight: '700',
  },

  chatContainer: {
    flex:1,
    padding: 20,
    backgroundColor: '#dff1f8',
  },

  navbar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
    paddingHorizontal: 10,
    elevation: 2,
  },

  hamburgerBtn: {
    marginRight: 10,
    padding: 10,
  },
  hamburgerIcon: {
    fontSize: 24,
    color: '#4F5C6C',
  },

  navbarLogoTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navbarLogo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6e46dd',
  },

  messagesBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#accfeb',
  },

  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#c59af6',
    borderTopRightRadius: 0,
    borderRadius: 15,
    padding: 10,
    marginVertical: 5,
    maxWidth: '70%',
  },
  userMessageText: {
    color: '#000',
    fontSize: 14,
  },

  botMessageWithAvatar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 5,
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#6e46dd',
    marginRight: 5,
  },
  botMessageBubble: {
    backgroundColor: '#EAF0F4',
    borderRadius: 15,
    borderTopLeftRadius: 0,
    padding: 10,
    maxWidth: '70%',
  },
  botMessageText: {
    fontSize: 14,
    color: '#000',
  },

  typingIndicator: {
    fontStyle: 'italic',
    color: '#000',
    marginVertical: 5,
    paddingLeft: 10,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#accfeb',
    marginTop: 10,
  },

  chatInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    fontSize: 14,
  },

  sendButton: {
    width: 45,
    height: 45,
    backgroundColor: '#6e46dd',
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonText: {
    color: '#fff',
    fontSize: 24,
  },
});

export default Chat;

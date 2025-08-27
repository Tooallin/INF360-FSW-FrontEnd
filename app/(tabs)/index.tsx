import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet, Animated , KeyboardAvoidingView, Platform
} from 'react-native';
import { Audio } from 'expo-av'; 
import * as Speech from 'expo-speech';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';



// import * as FileSystem from 'expo-file-system'; 
interface Conversation {
  id: number;
  name: string;
}
interface MessageMap {
  [conversationId: number]: string[];
}

const Chat: React.FC = () => {
  const API_URL="http://10.147.19.74:8000/api";
  const [baseMessage, setBaseMessage] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [blinkAnim] = useState(new Animated.Value(1));
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageMap>({});
  const [input, setInput] = useState('');
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const fetchConversationMessages = async (conversationId: number) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) throw new Error("No se encontró token, redirigir al login");

      const response = await fetch(`${API_URL}/message/getall/${conversationId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Error al cargar los mensajes del chat");

      const data: string[] = await response.json();

      setMessages(prev => ({
        ...prev,
        [conversationId]: data || [],
      }));

    } catch (error) {
      console.error('Error al cargar los mensajes del chat:', error);
      setMessages(prev => ({
        ...prev,
        [conversationId]: ['Ocurrió un error cargando la conversación'],
      }));
    }
  };

  const startRecording = async () => {
    try {
    console.log("Iniciando grabación...");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Se necesitan permisos de micrófono');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      console.error("Error iniciando grabación:", err);
    }
  };

  const stopRecording = async () => {
    console.log("Deteniendo grabación...");
    setIsRecording(false);
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log("Archivo guardado en:", uri);
    // Reproducir la grabación
    // const { sound } = await Audio.Sound.createAsync({ uri });
    // await sound.playAsync();

    // 👇 Enviar el audio al backend
    if (uri) {
      try {
        const formData = new FormData();
        formData.append("file", {
          uri,
          type: "audio/m4a",
          name: "recording.m4a",
        } as any);
        const token = await AsyncStorage.getItem("authToken");
        const response = await fetch(`${API_URL}/message/create`, {
          method: "POST",
          headers: {
            // 'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });
        const data = await response.json();
        const botReply = `Memo: ${data.ai_response || 'No se obtuvo respuesta'}`;
        setMessages(prev => ({
          ...prev,
          [currentConversation!.id]: [...prev[currentConversation!.id], botReply]
        }));
      } catch (err) {
        console.error("Error subiendo audio:", err);
      }
    }
    setRecording(null);
  };

  const handleBaseMessage = async (conversationId:number) => {
    try {
      setIsTyping(true);
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/message/createbase`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();
      const botReply = `Memo: ${data.ai_response}`;
      // ✅ Guardar el mensaje base para luego usarlo en handleSend
      setBaseMessage(data.ai_response);

      setMessages(prev => ({
        ...prev,
        [conversationId]: [...prev[conversationId], botReply]
      }));
      if (isAudioEnabled) {
        Speech.speak(data.ai_response); 
      }
    } catch (error) {
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...prev[conversationId], 'Ocurrió un error inesperado, intenta más tarde']
      }));
      if (isAudioEnabled) {
        Speech.speak('Ocurrió un error inesperado, intenta más tarde'); 
      }
      console.error('Error al enviar mensaje al backend, estoy en handleBaseMessage:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddConversation = () => {
    // Conversación solo local (todavía no existe en el back)
    const newConversation = { id: -1, name: "Nueva conversación" };

    setConversations(prev => [newConversation, ...prev]);
    setMessages(prev => ({ ...prev, [newConversation.id]: [] }));
    setCurrentConversation(newConversation);
  };

const handleSend = async () => {
  if (!input.trim() || !currentConversation) return;

  let conversationId = currentConversation.id;
  console.log("Id de la conversacion",conversationId);
  // Si es local (-1), crearla en el back
  if (conversationId < 0) {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/conversation/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
        ia_msg_in: baseMessage || "Inicio de conversación" 
      }),
      });
      
      const data = await res.json();
      console.log("Respuesta el back linea 197: ",data)
      conversationId = data.id;
      console.log("Id de la conversacion",conversationId);

      // Actualizar conversación actual con el id real
      setConversations(prev =>
        prev.map(c => c.id === -1 ? { ...c, id: conversationId } : c)
      );
      setCurrentConversation({ ...currentConversation, id: conversationId, name: `Conversación ${conversationId}` });
      setMessages(prev => {
        const updated = { ...prev };
        updated[conversationId] = updated[-1] || [];
        delete updated[-1];
        return updated;
      });
    } catch (err) {
      console.error("Error creando conversación:", err);
      return;
    }
  }

  // Mensaje del usuario
  const userMsg = `Tú: ${input.trim()}`;
  setMessages(prev => ({
    ...prev,
    [conversationId]: [...(prev[conversationId] || []), userMsg],
  }));
  setInput('');
  setIsTyping(true);

  try {
    const token = await AsyncStorage.getItem("authToken");
    console.log("id de la conversacion: ",conversationId);
    const response = await fetch(`${API_URL}/message/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: input.trim(),
        role: "user",
      }),
    });

    const data = await response.json();
    const botReply = `Memo: ${data.ai_response}`;
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...prev[conversationId], botReply],
    }));
    if (isAudioEnabled) {
      Speech.speak(data.ai_response);
    }
  } catch (err) {
    console.error("Error enviando mensaje:", err);
  } finally {
    setIsTyping(false);
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
    if (currentConversation) {
      // Solo si no hay mensajes aún
      if (!messages[currentConversation.id] || messages[currentConversation.id].length === 0) {
        handleBaseMessage(currentConversation.id);
      }
    }
  }, [currentConversation]);

  useEffect(() => {
  const fetchConversations = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/conversation/getall`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
          },
      });
      if (!response.ok) throw new Error('Error al obtener chats');
      const data: { chat_ids?: number[] } = await response.json();
      console.log("IDs: ",data);

      let chats: Conversation[] = [];

      if (data.chat_ids && data.chat_ids.length > 0) {
        // Crear chats dinámicamente según IDs del backend
        chats = data.chat_ids.map(id => ({ id, name: `Conversación ${id}` }));
      } else {
        // Fallback: crear chat por defecto como antes
        chats = [{ id: -1, name: 'Nueva conversación' }];
      }

      setConversations(chats);

      // Seleccionar el primer chat como activo
      setCurrentConversation(chats[0]);

      // Inicializar messages para cada chat
      const initialMessages: MessageMap = {};
      chats.forEach(chat => {
        initialMessages[chat.id] = [];
      });
      setMessages(initialMessages);

    } catch (error) {
      console.error('Error al obtener la lista de chats, usando chat por defecto:', error);
      // Fallback en caso de error
      const defaultChat = [{ id: -1, name: 'Nueva conversación' }];
      setConversations(defaultChat);
      setCurrentConversation(defaultChat[0]);
      setMessages({ 1: [] });
    }
  };

  fetchConversations();
  }, []);

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
                key={conv.id}
                onPress={async() => {
                  setCurrentConversation(conv);
                  setIsSidebarVisible(false);
                  // 🔹 Cargar la conversación histórica desde el backend
                  await fetchConversationMessages(conv.id);
                }}
                style={[
                  styles.conversationItem,
                  conv.id === currentConversation?.id && styles.activeConversationItem,
                ]}
              >
                <Text style={[
                  styles.conversationText,
                  conv.id === currentConversation?.id && styles.activeConversationText,
                ]}>
                  {conv.name}
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
            <Text style={styles.title}>RememberMe</Text>
          </View>
          <TouchableOpacity
            style={{ marginLeft: 'auto' }}
            onPress={() => setIsAudioEnabled(!isAudioEnabled)}
          >
            <Icon
              name={isAudioEnabled ? "volume-high" : "volume-off"}
              size={28}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.messagesBox}
          ref={scrollViewRef}
          contentContainerStyle={{ padding: 10 }}
        >
          {currentConversation && messages[currentConversation.id]?.map((msg, i) => {
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
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: isRecording ? 'red' : '#6e46dd' }]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Icon name="microphone" size={30} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sendButton,{marginLeft:3}]} onPress={handleSend}>
            <Text style={[styles.sendButtonText, { marginTop: -5 }]}>➤</Text>
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
    padding: 10,
  },
  hamburgerIcon: {
    fontSize: 24,
    color: '#000000ff',
    marginLeft:-10,
  },

  navbarLogoTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight:'auto',
    marginLeft:'auto',
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
    fontSize: 28,
  },
});

export default Chat;

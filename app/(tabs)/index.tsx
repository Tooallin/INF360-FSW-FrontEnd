import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet, Animated , KeyboardAvoidingView, Platform
} from 'react-native';
import { Audio } from 'expo-av'; 
import * as Speech from 'expo-speech';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import BlobUtil from 'react-native-blob-util';
import AudioRecord from 'react-native-audio-record';


interface Conversation {
  id: number;
  name: string;
}
interface MessageMap {
  [conversationId: number]: string[];
}

const Chat: React.FC = () => {
  // const API_URL="http://10.147.19.99:8000/api";
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const SPEECH_OPTIONS = {
  language: "es-ES",                      // Idioma
  pitch: 1.3,                             // Tono (0-2)
  rate: 1.0,                              // Velocidad (0.0-1.0+)
  voice: "com.apple.ttsbundle.Monica-compact" // ID de la voz
  };
  const [useFlag,setuseFlag]=useState(false);
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


  const startRecording = async () => {
  try {
    console.log("Iniciando grabación...");
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      alert("Se necesitan permisos para usar el micrófono");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    setRecording(recording);
    setIsRecording(true);
    console.log("Grabando...");
  } catch (err) {
    console.error("Error al iniciar grabación:", err);
  }
};

// 🛑 Detener grabación y enviar al backend
const stopRecording = async () => {
  console.log("Deteniendo grabación...");
  setIsRecording(false);

  if (!recording) return;

  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log("Archivo guardado en:", uri);

    // ✅ Subir al backend
    const token = await AsyncStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("audio", {
      uri,
      name: "audio.m4a", // extensión que graba expo-av
      type: "audio/m4a",
    } as any);

    const res = await fetch(`${API_URL}/message/transcribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // 👀 No pongas Content-Type, RN lo setea solo
      },
      body: formData,
    });

    if (!res.ok) throw new Error("Error subiendo audio");
    const data = await res.json();
    console.log("Respuesta backend:", data.content);

    // 🔄 refrescar mensajes
    await fetchConversationMessages(currentConversation?.id || -1);

    // Limpiar grabación
    setRecording(null);
  } catch (err) {
    console.error("Error al detener/enviar grabación:", err);
  }
};

  const fetchConversationMessages = async (conversationId: number) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) throw new Error("No se encontró token, redirigir al login");

      const response = await fetch(`${API_URL}/message/getall/${conversationId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Error al cargar los mensajes del chat");

      const data: { id: number; conversation_id: number; role: string; content: string; created_at: string; }[] = await response.json();

      const formattedMessages = data.map(msg =>
        msg.role === "user" ? ` ${msg.content}` : `Memo: ${msg.content}`
      );

      setMessages(prev => ({
        ...prev,
        [conversationId]: formattedMessages,
      }));

      return formattedMessages; // 🔹 Retornar los mensajes formateados

    } catch (error) {
      console.error('Error al cargar los mensajes del chat:', error);
      setMessages(prev => ({
        ...prev,
        [conversationId]: ['Ocurrió un error cargando la conversación'],
      }));
      return [];
    }
  };

  const handleAddConversation = async () => {
    const newConversation = { id: -1, name: "Nueva conversación" };

    setConversations(prev => [newConversation, ...prev]);
    // Inicializar el array vacío para este chat
    setMessages(prev => ({ ...prev, [newConversation.id]: [] }));
    setCurrentConversation(newConversation);
    setIsSidebarVisible(false);
    // Esperar la respuesta de la IA antes de mostrar
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
      const botReply = `Memo: ${data.content}`;

      // Guardar mensaje base
      setBaseMessage(data.content);

      // Actualizar mensajes
      setMessages(prev => ({
        ...prev,
        [newConversation.id]: [botReply]  // Aquí reemplazamos [] con el mensaje de IA
      }));

      if (isAudioEnabled) Speech.speak(data.content,SPEECH_OPTIONS);
    } catch (error) {
      console.error('Error al obtener mensaje inicial:', error);
      setMessages(prev => ({
        ...prev,
        [newConversation.id]: ['Error obteniendo mensaje inicial']
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConversation) return;

    let conversationId = currentConversation.id;

    // Si es local (-1), crearla en el backend
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
            ia_msg_in: baseMessage || "Inicio de conversación", 
          }),
        });
        const data = await res.json();
        conversationId = data.id;

        // Actualizar conversación actual con el id real
        setConversations(prev =>
          [...prev].map(c =>
            c.id === -1
              ? { ...c, id: conversationId, name: `Conversación ${conversationId}` }
              : c
          )
        );
        setMessages(prev => {
          const updated = { ...prev };
          updated[conversationId] = updated[-1] || [];
          delete updated[-1];
          return updated;
        });
        setCurrentConversation(prev => prev ? { ...prev, id: conversationId, name: `Conversación ${conversationId}` } : { id: conversationId, name: `Conversación ${conversationId}` });
      } catch (err) {
        console.error("Error creando conversación:", err);
        return;
      }
    }

    // Mensaje del usuario
    const userMsg = ` ${input.trim()}`;
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), userMsg],
    }));
    setInput('');
    setIsTyping(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      await fetch(`${API_URL}/message/create`, {
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

      // Traer todos los mensajes actualizados desde el backend
      await fetchConversationMessages(conversationId);

      // Traer todos los mensajes actualizados desde el backend
      const updatedMessages = await fetchConversationMessages(conversationId);

      // Reproducir el último mensaje del bot
      if (isAudioEnabled) {
        const botMessages = updatedMessages.filter(msg => !msg.startsWith(' ')); // solo bot
        if (botMessages.length > 0) {
          const lastBotMsg = botMessages[botMessages.length - 1].replace('Memo: ', '');
          Speech.speak(lastBotMsg, SPEECH_OPTIONS);
        }
      }

    } catch (err) {
      console.error("Error enviando mensaje:", err);
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), "Error enviando mensaje"],
      }));
    } finally {
      setIsTyping(false);
      setuseFlag(false);
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
    const fetchConversations = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const response = await fetch(`${API_URL}/conversation/getall`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Error al obtener chats');
        const dataFromBackend: {id:number, user_id:number, updated_at:string}[] = await response.json();

        let chats: Conversation[] = [];
        if (dataFromBackend && dataFromBackend.length > 0) {
          chats = dataFromBackend.map(chat => ({ id: chat.id, name: `Conversación ${chat.id}` }));
        } else {
          // No hay chats, crear uno local
          chats = [{ id: -1, name: 'Nueva conversación' }];
        }

        setConversations(chats);
        setCurrentConversation(chats[0]);

        // Inicializar messages para cada chat
        const initialMessages: MessageMap = {};
        chats.forEach(chat => { initialMessages[chat.id] = []; });
        setMessages(initialMessages);

        if (chats[0].id === -1) {
          // 🔹 Chat local: obtener mensaje inicial de IA
          setIsTyping(true);
          try {
            const response = await fetch(`${API_URL}/message/createbase`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
            });
            const data = await response.json();
            const botReply = `Memo: ${data.content}`;
            setBaseMessage(data.content);

            setMessages(prev => ({
              ...prev,
              [-1]: [botReply]
            }));

            if (isAudioEnabled) Speech.speak(data.content,SPEECH_OPTIONS);
          } catch (error) {
            console.error('Error al obtener mensaje inicial:', error);
            setMessages(prev => ({
              ...prev,
              [-1]: ['Error obteniendo mensaje inicial']
            }));
          } finally {
            setIsTyping(false);
          }
        } else {
          // 🔹 Chat existente: cargar mensajes del backend
          await fetchConversationMessages(chats[0].id);
        }

      } catch (error) {
        console.error('Error al obtener la lista de chats, usando chat por defecto:', error);
        const defaultChat = [{ id: -1, name: 'Nueva conversación' }];
        setConversations(defaultChat);
        setCurrentConversation(defaultChat[0]);
        setMessages(prev => ({ ...prev, [-1]: [] }));

        // 🔹 Intentar obtener mensaje inicial de IA para chat local
        setIsTyping(true);
        try {
          const token = await AsyncStorage.getItem("authToken");
          const response = await fetch(`${API_URL}/message/createbase`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
          });
          const data = await response.json();
          const botReply = `Memo: ${data.content}`;
          setBaseMessage(data.content);

          setMessages(prev => ({
            ...prev,
            [-1]: [botReply]
          }));

          if (isAudioEnabled) Speech.speak(data.content,SPEECH_OPTIONS);
        } catch (err) {
          console.error('Error al obtener mensaje inicial en fallback:', err);
          setMessages(prev => ({
            ...prev,
            [-1]: ['Error obteniendo mensaje inicial']
          }));
        } finally {
          setIsTyping(false);
        }
      }
    };

    fetchConversations();
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, currentConversation]);
  
  useEffect(() => {
    if(currentConversation?.id==-1){
      setuseFlag(true);
    }
  }, [currentConversation]);

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
          <TouchableOpacity 
            onPress={handleAddConversation} 
            style={[styles.addChatButton, useFlag && styles.block]}
            disabled={useFlag}
          >
            <Text style={styles.addChatText}>✚ Nuevo chat</Text>
          </TouchableOpacity>
          <ScrollView>
            {conversations.map((conv) => (
              <TouchableOpacity
                key={`${conv.id}-${conv.name}`}
                onPress={async() => {
                  setCurrentConversation(conv);
                  setIsSidebarVisible(false);
                  // Actualizar el nombre del chat al seleccionarlo
                  if (conv.id !== -1) {
                    // 🔹 Solo cambiar nombre si no es el chat local
                    setConversations(prev =>
                      prev.map(c =>
                        c.id === conv.id ? { ...c, name: `Conversación ${conv.id}` } : c
                      )
                    );

                    //Solo cargar mensajes desde backend si no es el chat local
                    await fetchConversationMessages(conv.id);
                  }
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
            const isUser = msg.startsWith(' ');
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
            style={[styles.sendButton, { marginLeft:3,backgroundColor: isRecording ? 'red' : '#6e46dd' }]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Icon name="microphone" size={30} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sendButton,{marginLeft:2}]} onPress={handleSend}>
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
  block: {
    opacity: 0.3,
    borderWidth: 0,
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

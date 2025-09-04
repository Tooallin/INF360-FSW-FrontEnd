import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

interface Conversation {
	id: number;
	title: string;
}
interface MessageMap {
	[conversationId: number]: string[];
}

const Chat: React.FC = () => {
	const API_URL = Constants.expoConfig.extra.API_URL;
	const SPEECH_OPTIONS = {
		language: "ES-US",
		pitch: 0.68,
		rate: 1.1,
		voice:  'es-us-x-esc-network',
	};
// const SPEECH_OPTIONS = {
//   language: "es-US",
//   pitch: 0.78,
//   rate: 1.3,
//   voice: "Google español de Estados Unidos"
// };
	const isWeb = Platform.OS === 'web';

	const [useFlag, setuseFlag] = useState(false);
	const [baseMessage, setBaseMessage] = useState<string | null>(null);
	const [isAudioEnabled, setIsAudioEnabled] = useState(false);
	const [blinkAnim] = useState(new Animated.Value(1));
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
	const [messages, setMessages] = useState<MessageMap>({});
	const [input, setInput] = useState('');
	const [isSidebarVisible, setIsSidebarVisible] = useState(false);
	const scrollViewRef = useRef<ScrollView>(null);
	const inputRef = useRef<TextInput>(null);
	const [isTyping, setIsTyping] = useState(false);

	// Móvil (expo-av)
	const [recording, setRecording] = useState<Audio.Recording | null>(null);
	const [isRecording, setIsRecording] = useState(false);

	// Web (MediaRecorder)
	const [isWebRec, setIsWebRec] = useState(false);
	const mediaRecorderRef = useRef<any>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const webChunksRef = useRef<BlobPart[]>([]);

	const [speakingKey, setSpeakingKey] = useState<string | null>(null);
	const [toast, setToast] = useState<{ visible: boolean; text: string }>({ visible: false, text: '' });

	const showToast = (text: string, duration = 2200) => {
		setToast({ visible: true, text });
		setTimeout(() => setToast({ visible: false, text: '' }), duration);
	};

	// Quita el prefijo "Memo: " y el espacio inicial de mensajes de usuario
	const cleanMsg = (raw: string) => {
		return raw.startsWith(' ') ? raw.trim() : raw.replace(/^Memo:\s*/, '');
	};

	const speakText = (key: string, raw: string) => {
		if (speakingKey === key) {
			Speech.stop();
			setSpeakingKey(null);
		 return;
		}
		const text = cleanMsg(raw);
		Speech.stop();
		setSpeakingKey(key);
		Speech.speak(text, {
			...SPEECH_OPTIONS,
			onDone: () => setSpeakingKey(null),
			onStopped: () => setSpeakingKey(null),
			onError: () => setSpeakingKey(null),
		});
	};

	/* ===========================
	 *		WEB: grabación con MediaRecorder
	 * =========================== */
	const getBestWebMime = () => {
		const candidates = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/ogg;codecs=opus',
			'audio/ogg',
		];
		// @ts-ignore
		if (typeof window !== 'undefined' && (window as any).MediaRecorder) {
			// @ts-ignore
			const MR = (window as any).MediaRecorder;
			for (const t of candidates) {
				if (MR.isTypeSupported?.(t)) return t;
			}
		}
		return 'audio/webm';
	};

	const uploadAudioFile = async (file: File) => {
		try {
			const token = await AsyncStorage.getItem("authToken");
			const extFromMime = (file.type?.split("/")?.[1] || "webm").toLowerCase();
			const safeName = file.name && file.name !== "blob" ? file.name : `grabacion.${extFromMime}`;
			const form = new FormData();
			form.append("audio", file, safeName);

			const res = await fetch(`${API_URL}/message/transcribe`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					'ngrok-skip-browser-warning': 'true',
				},
				body: form,
			});

			if (!res.ok) {
				let detail = "No se pudo procesar el audio";
				try {
					const errJson = await res.json();
					detail = errJson?.detail || detail;
				} catch {}
				if (res.status === 422) {
					showToast("No se ha entendido el audio, por favor inténtalo de nuevo.");
				} else {
					showToast(`Error: ${detail}`);
				}
				return;
			}

			const data = await res.json();
			setInput(data?.content ?? "");
			inputRef.current?.focus();
			if (currentConversation?.id && currentConversation.id > 0) {
				await fetchConversationMessages(currentConversation.id);
			}
		} catch (err) {
			console.error("Error subiendo audio (web):", err);
			showToast("Hubo un problema con tu conexión. Intenta de nuevo.");
		}
	};

	const startWebRecording = async () => {
		try {
			if (!isWeb) return;
			// @ts-ignore
			if (typeof window === 'undefined' || !(window as any).MediaRecorder) {
				showToast("Tu navegador no soporta grabación de audio.");
				return;
			}
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaStreamRef.current = stream;

			const mimeType = getBestWebMime();
			// @ts-ignore
			const mr = new (window as any).MediaRecorder(stream, { mimeType });
			mediaRecorderRef.current = mr;
			webChunksRef.current = [];

			mr.ondataavailable = (e: BlobEvent) => {
				if (e.data && e.data.size > 0) webChunksRef.current.push(e.data);
			};

			mr.onstop = async () => {
				try {
					const blob = new Blob(webChunksRef.current, { type: mimeType });
					const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
					const file = new File([blob], `grabacion.${ext}`, { type: mimeType });
					await uploadAudioFile(file);
				} catch (e) {
					console.error('Error al procesar blob:', e);
					showToast('No se pudo procesar la grabación.');
				} finally {
					mediaStreamRef.current?.getTracks().forEach(t => t.stop());
					mediaStreamRef.current = null;
					mediaRecorderRef.current = null;
					setIsWebRec(false);
				}
			};

			mr.start(250);
			setIsWebRec(true);
			showToast('Grabando… toca el micrófono para detener.', 1500);
		} catch (e) {
			console.error('Error al iniciar grabación web:', e);
			showToast('No se pudo iniciar el micrófono en el navegador.');
		}
	};

	const stopWebRecording = () => {
		try {
			if (!isWeb) return;
			if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
				mediaRecorderRef.current.stop();
			} else {
				mediaStreamRef.current?.getTracks().forEach(t => t.stop());
				mediaStreamRef.current = null;
				mediaRecorderRef.current = null;
				setIsWebRec(false);
			}
		} catch (e) {
			console.error('Error al detener grabación web:', e);
			showToast('No se pudo detener la grabación.');
		}
	};

	/* ===========================
	 *		MÓVIL: grabación con expo-av
	 * =========================== */
	const startRecording = async () => {
		try {
			if (isWeb) {
				// En web no usamos expo-av; sólo MediaRecorder
				showToast("En navegador, usa el micrófono para grabar.");
				return;
			}
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
		} catch (err) {
			console.error("Error al iniciar grabación:", err);
			showToast("No se pudo iniciar la grabación.");
		}
	};

	const stopRecording = async () => {
		setIsRecording(false);
		if (!recording) return;

		try {
			await recording.stopAndUnloadAsync();
			const uri = recording.getURI();

			const token = await AsyncStorage.getItem("authToken");
			const formData = new FormData();
			formData.append("audio", {
				uri,
				name: "audio.m4a",
				type: "audio/m4a",
			} as any);

			const res = await fetch(`${API_URL}/message/transcribe`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					'ngrok-skip-browser-warning': 'true',
				},
				body: formData,
			});

			if (!res.ok) {
				let detail = "No se pudo procesar el audio";
				try {
					const errJson = await res.json();
					detail = errJson?.detail || detail;
				} catch {}
				if (res.status === 422) {
					showToast("No se ha entendido el audio, porfavor intentalo de nuevo.");
				} else {
					showToast(`Error: ${detail}`);
				}
				setRecording(null);
				return;
			}

			const data = await res.json();
			setInput(data?.content ?? "");
			inputRef.current?.focus();
			if (currentConversation?.id && currentConversation.id > 0) {
				await fetchConversationMessages(currentConversation.id);
			}
			setRecording(null);
		} catch (err) {
			console.error("Error al detener/enviar grabación:", err);
			showToast("Hubo un problema con tu conexión. Intenta de nuevo.");
		}
	};

	/* ===========================
	 *		Mensajes / conversaciones
	 * =========================== */
	const fetchConversationMessages = async (conversationId: number) => {
		try {
			// ⛔ no consultes al backend por conversaciones temporales
			if (!conversationId || conversationId < 0) return messages[conversationId] || [];

			const token = await AsyncStorage.getItem("authToken");
			if (!token) throw new Error("No se encontró token, redirigir al login");

			const response = await fetch(`${API_URL}/message/getall/${conversationId}`, {
				method: "GET",
				headers: {
					"Authorization": `Bearer ${token}`,
					'ngrok-skip-browser-warning': 'true',
				},
			});
			if (!response.ok) throw new Error("Error al cargar los mensajes del chat");

			const data: { id: number; conversation_id: number; role: string; content: string; created_at: string; }[] = await response.json();
			const formatted = data.map(msg => (msg.role === "user" ? ` ${msg.content}` : `Memo: ${msg.content}`));

			setMessages(prev => ({ ...prev, [conversationId]: formatted }));
			return formatted;
		} catch (error) {
			console.error('Error al cargar los mensajes del chat:', error);
			setMessages(prev => ({ ...prev, [conversationId]: ['Ocurrió un error cargando la conversación'] }));
			return [];
		}
	};

	const refreshConversationTitle = async (conversationId: number) => {
		try {
			const token = await AsyncStorage.getItem("authToken");
			const res = await fetch(`${API_URL}/conversation/getall`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'ngrok-skip-browser-warning': 'true',
				},
			});
			if (!res.ok) return;
			const all = await res.json(); // debe traer { id, title, ... }
			const found = all.find((c: any) => c.id === conversationId);
			if (!found) return;

			setConversations(prev =>
				prev.map(c => c.id === conversationId
					? { ...c, title: found.title ?? c.title }
					: c
				)
			);
			setCurrentConversation(prev =>
				prev && prev.id === conversationId
					? { ...prev, title: found.title ?? prev.title }
					: prev
			);
		} catch (e) {
			console.error('No se pudo refrescar el título', e);
		}
	};

	const handleAddConversation = async () => {
		const newConversation = { id: -1, title: "Nueva conversación" };
		setConversations(prev => [newConversation, ...prev]);
		setMessages(prev => ({ ...prev, [newConversation.id]: [] }));
		setCurrentConversation(newConversation);
		setIsSidebarVisible(false);

		try {
			setIsTyping(true);
			const token = await AsyncStorage.getItem("authToken");
			const response = await fetch(`${API_URL}/message/createbase`, {
			 method: 'GET',
			 headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
					'ngrok-skip-browser-warning': 'true',
				},
			});
			const data = await response.json();
			const botReply = `Memo: ${data.content}`;
			setBaseMessage(data.content);

			setMessages(prev => ({ ...prev, [newConversation.id]: [botReply] }));
			if (isAudioEnabled) Speech.speak(data.content, SPEECH_OPTIONS);
		} catch (error) {
			console.error('Error al obtener mensaje inicial:', error);
			setMessages(prev => ({ ...prev, [newConversation.id]: ['Error obteniendo mensaje inicial'] }));
		} finally {
			setIsTyping(false);
		}
	};

	const handleSend = async () => {
		if (!input.trim() || !currentConversation) return;

		let conversationId = currentConversation.id;

		if (conversationId < 0) {
			try {
				const token = await AsyncStorage.getItem("authToken");
				const res = await fetch(`${API_URL}/conversation/create`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${token}`,
						'ngrok-skip-browser-warning': 'true',
					},
					body: JSON.stringify({ ia_msg_in: baseMessage || "Inicio de conversación" }),
				});
				const data = await res.json();
				conversationId = data.id;

				setConversations(prev =>
					[...prev].map(c => c.id === -1 ? { ...c, id: conversationId, title: data.title ?? `Nueva conversación` } : c)
				);
				setMessages(prev => {
					const updated = { ...prev };
					updated[conversationId] = updated[-1] || [];
					delete updated[-1];
					return updated;
				});
				setCurrentConversation(prev => prev ? { ...prev, id: conversationId, title: data.title ?? `Nueva conversación` } : { id: conversationId, title: data.title ?? `Nueva conversación` });
			} catch (err) {
				console.error("Error creando conversación:", err);
				return;
			}
		}

		const userMsg = ` ${input.trim()}`;
		setMessages(prev => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), userMsg] }));
		setInput('');
		setIsTyping(true);

		try {
			const token = await AsyncStorage.getItem("authToken");
			await fetch(`${API_URL}/message/create`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}`,
					'ngrok-skip-browser-warning': 'true',
				},
				body: JSON.stringify({
					conversation_id: conversationId,
					content: input.trim(),
					role: "user",
				}),
			});

			await fetchConversationMessages(conversationId);
			const updatedMessages = await fetchConversationMessages(conversationId);

			await refreshConversationTitle(conversationId);
			if (isAudioEnabled) {
				const botMessages = updatedMessages.filter(msg => !msg.startsWith(' '));
				if (botMessages.length > 0) {
					const lastBotMsg = botMessages[botMessages.length - 1].replace('Memo: ', '');
					Speech.speak(lastBotMsg, SPEECH_OPTIONS);
				}
			}
		} catch (err) {
			console.error("Error enviando mensaje:", err);
			setMessages(prev => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), "Error enviando mensaje"] }));
		} finally {
			setIsTyping(false);
			setuseFlag(false);
		}
	};

	useEffect(() => {
		if (isTyping) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(blinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
					Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
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
					headers: {
						'Authorization': `Bearer ${token}`,
						'ngrok-skip-browser-warning': 'true',
					},
				});
				if (!response.ok) throw new Error('Error al obtener chats');
				const dataFromBackend: { id: number, user_id: number, title: string, updated_at: string }[] = await response.json();

				let chats: Conversation[] = [];
				if (dataFromBackend && dataFromBackend.length > 0) {
					chats = dataFromBackend.map(chat => ({ id: chat.id, title: chat.title ?? `Nueva conversación` }));
				} else {
					chats = [{ id: -1, title: 'Nueva conversación' }];
				}

				setConversations(chats);
				setCurrentConversation(chats[0]);

				const initialMessages: MessageMap = {};
				chats.forEach(chat => { initialMessages[chat.id] = []; });
				setMessages(initialMessages);

				if (chats[0].id === -1) {
					setIsTyping(true);
					try {
						const response = await fetch(`${API_URL}/message/createbase`, {
							method: 'GET',
							headers: {
								'Content-Type': 'application/json',
								'Authorization': `Bearer ${token}`,
								'ngrok-skip-browser-warning': 'true',
							},
						});
						const data = await response.json();
						const botReply = `Memo: ${data.content}`;
						setBaseMessage(data.content);

						setMessages(prev => ({ ...prev, [-1]: [botReply] }));
						if (isAudioEnabled) Speech.speak(data.content, SPEECH_OPTIONS);
					} catch (error) {
						console.error('Error al obtener mensaje inicial:', error);
						setMessages(prev => ({ ...prev, [-1]: ['Error obteniendo mensaje inicial'] }));
					} finally {
						setIsTyping(false);
					}
				} else {
					await fetchConversationMessages(chats[0].id);
				}
			} catch (error) {
				console.error('Error al obtener la lista de chats, usando chat por defecto:', error);
				const defaultChat = [{ id: -1, title: 'Nueva conversación' }];
				setConversations(defaultChat as any);
				setCurrentConversation(defaultChat[0] as any);
				setMessages(prev => ({ ...prev, [-1]: [] }));

				setIsTyping(true);
				try {
					const token = await AsyncStorage.getItem("authToken");
					const response = await fetch(`${API_URL}/message/createbase`, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${token}`,
							'ngrok-skip-browser-warning': 'true',
						},
					});
					const data = await response.json();
					const botReply = `Memo: ${data.content}`;
					setBaseMessage(data.content);

					setMessages(prev => ({ ...prev, [-1]: [botReply] }));
					if (isAudioEnabled) Speech.speak(data.content, SPEECH_OPTIONS);
				} catch (err) {
					console.error('Error al obtener mensaje inicial en fallback:', err);
					setMessages(prev => ({ ...prev, [-1]: ['Error obteniendo mensaje inicial'] }));
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
		if (currentConversation?.id == -1) {
			setuseFlag(true);
		}
	}, [currentConversation]);

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'android' ? 'height' : 'padding'}
			keyboardVerticalOffset={0}
		>
			<View
				style={[
					styles.container,
					Platform.OS !== "web" ? { marginTop: 30 } : null
				]}
				>
				{/* Sidebar */}
				{isSidebarVisible && (
						<LinearGradient
							colors={['#a98dff', '#bfd7ff']} // degradado morado → azul
							start={{ x: 0, y: 0 }} // parte superior
							end={{ x: 0, y: 1 }}   // parte inferior
							style={styles.sidebar}
						>      
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
									key={`${conv.id}-${conv.title}`}
									onPress={async () => {
										setCurrentConversation(conv);
										setIsSidebarVisible(false);
										if (conv.id !== -1) {
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
										{conv.title}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</LinearGradient>
				)}

				<View style={{flex:1}}>
					{/* Navbar */}
					<View style={styles.navbar}>
						<LinearGradient
							colors={["#7b62ff", "#99cdff"]} // morado → azul
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={styles.navbarGradient}
						>
							<TouchableOpacity
								style={styles.hamburgerBtn}
								onPress={() => setIsSidebarVisible(!isSidebarVisible)}
								accessibilityLabel="Toggle menu"
							>
								<Text style={styles.hamburgerIcon}>☰</Text>
							</TouchableOpacity>
							<View style={styles.navbarLogoTitle}>
								<Image
									source={require('../../assets/images/Logo_color.png')}
									style={styles.navbarTextImage}
								/>
							</View>
							<TouchableOpacity
							style={{ marginLeft: "auto" }}
							>
							</TouchableOpacity>
						</LinearGradient>
					</View>

					{/* Messages */}
						<LinearGradient
						colors={['#ffffffff', '#dae7ffff']} // degradado vertical
						start={{ x: 0, y: 0 }}
						end={{ x: 0, y: 1 }}
						style={{ flex: 1, paddingHorizontal: 10, paddingBottom: 10 }}
						>
					<ScrollView
						style={styles.messagesBox}
						ref={scrollViewRef}
						contentContainerStyle={{ padding: 10 }}
					>
						{currentConversation && messages[currentConversation.id]?.map((msg, i) => {
							const isUser = msg.startsWith(' ');
							const key = `${currentConversation.id}-${i}`;
							const cleaned = cleanMsg(msg);
							const isPlaying = speakingKey === key;

							if (isUser) {
								return (
									<View key={key} style={styles.userMessageBlock}>
										<View style={styles.userMessage}>
											<Text style={styles.userMessageText}>{msg}</Text>
										</View>
										<View style={styles.audioControlsRight}>
											<TouchableOpacity
												style={[styles.audioBtn, isPlaying && styles.audioBtnActive]}
												onPress={() => speakText(key, msg)}
												hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
											>
												<Icon name={isPlaying ? "stop-circle" : "volume-high"} size={18} color="#fff" />
												<Text style={styles.audioBtnText}>{isPlaying ? 'Detener' : 'Escuchar'}</Text>
											</TouchableOpacity>
										</View>
									</View>
								);
							}

							return (
								<View key={key} style={styles.botMessageBlock}>
									<View style={styles.botMessageWithAvatar}>
										<Image
											source={require('../../assets/images/logoBot.png')}
											style={styles.botAvatar}
										/>
										<View style={styles.botMessageBubble}>
											<Text style={styles.botMessageText}>{cleaned}</Text>
										</View>
									</View>
									<View style={styles.audioControlsLeft}>
										<TouchableOpacity
											style={[styles.audioBtn, isPlaying && styles.audioBtnActive]}
											onPress={() => speakText(key, msg)}
											hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
										>
											<Icon name={isPlaying ? "stop-circle" : "volume-high"} size={18} color="#fff" />
											<Text style={styles.audioBtnText}>{isPlaying ? 'Detener' : 'Escuchar'}</Text>
										</TouchableOpacity>
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
							ref={inputRef}
							style={styles.chatInput}
							placeholder="Escribe un mensaje ..."
							value={input}
							onChangeText={setInput}
							onSubmitEditing={handleSend}
							returnKeyType="send"
						/>

						{isWeb ? (
							<TouchableOpacity
							onPress={isWebRec ? stopWebRecording : startWebRecording}
							style={{ borderRadius: 50, overflow: "hidden", marginLeft: 3 }}
							>
							<LinearGradient
								colors={isWebRec ? ["#ff4d4d", "#ff1a1a"] : ["#7b62ff", "#99cdff"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={[styles.sendButton, { justifyContent: "center", alignItems: "center" }]}
							>
								<Icon name="microphone" size={24} color="#fff" />
							</LinearGradient>
							</TouchableOpacity>
						) : (
							// Móvil: micrófono expo-av
							<TouchableOpacity
							onPress={isRecording ? stopRecording : startRecording}
							style={{ borderRadius: 50, overflow: "hidden", marginLeft: 3 }}
							>
							<LinearGradient
								colors={isRecording ? ["#ff4d4d", "#ff1a1a"] : ["#7b62ff", "#99cdff"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={[styles.sendButton, { justifyContent: "center", alignItems: "center" }]}
							>
								<Icon name="microphone" size={30} color="#fff" />
							</LinearGradient>
							</TouchableOpacity>
						)}
							<TouchableOpacity onPress={handleSend}>
								<LinearGradient
								colors={["#7b62ff", "#99cdff"]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={[styles.sendButton, { marginLeft: 2 }]}
								>
								<Text style={[styles.sendButtonText, { marginTop: -5 }]}>➤</Text>
								</LinearGradient>
							</TouchableOpacity>
					</View>
				</LinearGradient>
				</View>
			</View>

			{toast.visible && (
				<View style={styles.toast} pointerEvents="none">
					<Text style={styles.toastText}>{toast.text}</Text>
				</View>
			)}
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, 
		flexDirection: 'row'
	},
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
		flex: 1,
	},
	navbar: {
		flexDirection: 'row',
		alignItems: 'center',
		elevation: 0,
	},
	navbarGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
	},
	hamburgerBtn: {
		padding: 10,
	},
	hamburgerIcon: {
		fontSize: 24,
		color: '#ffffffff',
	},
	navbarLogoTitle: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 'auto',
		marginLeft: 'auto',
	},
	navbarTextImage: {
    width: 190,
    height: 50,
    resizeMode: 'contain',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#6e46dd',
	},
	messagesBox: {
		flex: 1,
	},
	userMessage: {
		alignSelf: 'flex-end',
		backgroundColor: '#935DF7',
		borderTopRightRadius: 0,
		borderRadius: 15,
		padding: 10,
		marginVertical: 5,
		maxWidth: '70%',
	},
	userMessageText: {
		color: '#ffffffff',
		fontSize: 14,
	},
	botMessageWithAvatar: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginVertical: 3,
	},
	botAvatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderWidth: 2,	
		borderColor: '#6e46dd',
		marginRight: 4,
		marginLeft:-10,
	},
	botMessageBubble: {
		backgroundColor: '#ebd7ffff',
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
		padding: 4,
		backgroundColor: '#ffffffff',
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#ffffffff',
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
	audioControlsLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
		marginBottom: 6,
		marginLeft: 41,
	},
	audioControlsRight: {
		flexDirection: 'row',
		alignSelf: 'flex-end',
		marginTop: 2,
		marginBottom: 6,
	},
	audioBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#6e46dd',
		borderRadius: 14,
		paddingVertical: 6,
		paddingHorizontal: 10,
	},
	audioBtnActive: {
		backgroundColor: '#d53f8c',
	},
	audioBtnText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
	botMessageBlock: { marginVertical: 2 },
	userMessageBlock: { marginVertical: 2 },

	// Toast centrado y semi-transparente
	toast: {
		position: 'absolute',
		top: '45%',
		left: 40,
		right: 40,
		paddingVertical: 14,
		paddingHorizontal: 20,
		backgroundColor: 'rgba(110, 70, 221, 0.9)',
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 6,
		shadowColor: '#000',
		shadowOpacity: 0.25,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 6,
		zIndex: 9999,
	},
	toastText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
	},
});

export default Chat;
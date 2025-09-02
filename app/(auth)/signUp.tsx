import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	Alert,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const SignIn = () => {
	const [name, setName] = useState("");
	const [surname, setSurname] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [age, setAge] = useState<string>("");
	const [gender, setGender] = useState("");
	const [serverMsg, setServerMsg] = useState<string | null>(null);

	const router = useRouter();
	const API_URL = process.env.EXPO_PUBLIC_API_URL;

	const onSignUpPress = async () => {
		if (!name || !surname) {
			// ❌ Error de validación local
			setServerMsg("Debes ingresar nombre y apellido.");
			return;
		}
		if (!email || !password) {
			setServerMsg("Debes ingresar correo y contraseña.");
			return;
		}
		const ageNumber = parseInt(age, 10);
		if (age && (isNaN(ageNumber) || ageNumber <= 0)) {
			setServerMsg("Ingresa una edad válida.");
			return;
		}

		const payload: any = {
			name,
			surname,
			email,
			password,
			gender: gender || null,
			age: age ? ageNumber : null,
		};

		try {
			const response = await fetch(`${API_URL}/users/create`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				let msg = "No se pudo crear el usuario";
				try {
					const err = await response.json();
					if (err?.detail)
						msg = Array.isArray(err.detail)
							? err.detail[0]?.msg ?? msg
							: err.detail;
				} catch {}
				throw new Error(msg);
			}

			const data = await response.json();

			// ✅ Éxito → invitación a logearse
			setServerMsg("Usuario creado con éxito 🎉. Ahora puedes iniciar sesión.");
		} catch (err: any) {
			// ✅ Error → mostrar burbuja
			setServerMsg(err.message || "Ocurrió un error al registrarte");
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Crea una cuenta</Text>

			<TextInput
				style={styles.input}
				placeholder="Nombre"
				value={name}
				onChangeText={setName}
			/>
			<TextInput
				style={styles.input}
				placeholder="Apellido"
				value={surname}
				onChangeText={setSurname}
			/>
			<TextInput
				style={styles.input}
				placeholder="Correo electrónico"
				keyboardType="email-address"
				autoCapitalize="none"
				value={email}
				onChangeText={setEmail}
			/>
			<TextInput
				style={styles.input}
				placeholder="Contraseña"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
				autoCapitalize="none"
			/>
			<TextInput
				style={styles.input}
				placeholder="Edad (opcional)"
				keyboardType="numeric"
				value={age}
				onChangeText={setAge}
			/>
			<TextInput
				style={styles.input}
				placeholder="Género (opcional)"
				autoCapitalize="none"
				value={gender}
				onChangeText={setGender}
			/>

			<TouchableOpacity style={styles.button} onPress={onSignUpPress}>
				<Text style={styles.buttonText}>Registrarse</Text>
			</TouchableOpacity>

			{/* ✅ Burbuja con el mensaje */}
			{serverMsg && (
				<View style={styles.bubble}>
					<Text style={styles.bubbleText}>{serverMsg}</Text>
					<TouchableOpacity onPress={() => router.push("/(auth)/signIn")}>
						<Text style={styles.linkText}>Ir a iniciar sesión</Text>
					</TouchableOpacity>
				</View>
			)}

			<Text
				onPress={() => router.push("/(auth)/signIn")}
				style={{ marginTop: 20, color: "#6e46dd", textAlign: "center" }}
			>
				¿Ya tienes una cuenta?
			</Text>
		</View>
	);
};

export default SignIn;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		justifyContent: "center",
		paddingHorizontal: 20,
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#6e46dd",
		marginBottom: 40,
		textAlign: "center",
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 10,
		padding: 12,
		marginBottom: 20,
		fontSize: 16,
	},
	button: {
		backgroundColor: "#6e46dd",
		paddingVertical: 15,
		borderRadius: 10,
		alignItems: "center",
	},
	buttonText: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "600",
	},
	bubble: {
		backgroundColor: "#e6e0ff",
		borderRadius: 12,
		padding: 15,
		marginTop: 20,
		alignItems: "center",
	},
	bubbleText: {
		color: "#333",
		fontSize: 15,
		marginBottom: 10,
		textAlign: "center",
	},
	linkText: {
		color: "#6e46dd",
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
	},
});
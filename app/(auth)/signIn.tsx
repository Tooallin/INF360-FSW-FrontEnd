import InputField from '@/components/InputField';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import OAuth from './OAuth';

// https://youtu.be/kmy_YNhl0mw?t=7273

const SignIn = () => {
    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const { signIn, setActive, isLoaded } = useSignIn()
    const router = useRouter()

    // Handle the submission of the sign-in form
    const onSignInPress = async () => {
        if (!isLoaded) return

        // Start the sign-in process using the email and password provided
        try {
        const signInAttempt = await signIn.create({
            identifier: form.email,
            password: form.password,
        })

        // If sign-in process is complete, set the created session as active
        // and redirect the user
        if (signInAttempt.status === 'complete') {
            await setActive({ session: signInAttempt.createdSessionId })
            router.replace('../(tabs)/')
        } else {
            // If the status isn't complete, check why. User might need to
            // complete further steps.
            console.error(JSON.stringify(signInAttempt, null, 2))
        }
        } catch (err: any) {
        // See https://clerk.com/docs/custom-flows/error-handling
        // for more info on error handling
        Alert.alert("Error", err.errors[0].longMessage);
        }
    }
    
    return (
        <ScrollView className="flex-1 bg-white">
            <View className="flex-1 bg-white ">
                <View className="relative w-full h-48">
                    <Text className="text-4xl text-black absolute bottom-5 left-5">Crea tu cuenta</Text>
                </View>
                <View className='p-5'>
                    <InputField 
                        label="Email"
                        placeholder="Ingresa tu email"
                        value={form.email}
                        icon="at" // pass the icon name as a string
                        iconColor="#333"
                        iconSize={24}
                        iconStyle="ml-2"
                        autoCapitalize='none'
                        onChangeText={(value: string) => setForm({ ...form, email: value })}
                    />
                    <InputField 
                        label="Contraseña"
                        placeholder="Ingresa tu contraseña"
                        secureTextEntry={true}
                        value={form.password}
                        icon="lock.contour" // pass the icon name as a string
                        iconColor="#333"
                        iconSize={24}
                        iconStyle="ml-2"
                        autoCapitalize='none'
                        onChangeText={(value: string) => setForm({ ...form, password: value })}
                    />
                    {/* <Button  onPress={onSignInPress} className="mt-5 text-purple-500"/> */}
                    <TouchableOpacity onPress={onSignInPress} className="mt-5 bg-purple-600 py-3 px-6 rounded-full flex items-center">
                        <Text className="text-white text-lg">Ingresar</Text>
                    </TouchableOpacity>
                </View>

                <OAuth />

                <Link href="/signUp" className="text-lg text-center mt-10">
                    <Text>¿No tienes una cuenta? </Text>
                    <Text className='text-purple-700'>Ingresa aquí</Text>
                </Link>

                {/* Verification Modal */}
            </View>
        </ScrollView>
    );
};

export default SignIn;
import InputField from '@/components/InputField';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import OAuth from './OAuth';

const SignIn = () => {
    const [form, setForm] = useState({
        email: '',
        password: ''
    });

    const onSignInPress = async () => {
    };
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
                    onChange={(value: any) => setForm({ ...form, email: value })}
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
                    onChange={(value: any) => setForm({ ...form, password: value })}
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
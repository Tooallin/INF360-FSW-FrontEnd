import InputField from '@/components/InputField';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ReactNativeModal from "react-native-modal";
import OAuth from './OAuth';

const SignUp = () => {
    const [form, setForm] = React.useState({
        name: "",
        email: "",
        password: "",
    });

    const { isLoaded, signUp, setActive } = useSignUp()
    const [showSuccessModal, setShowSuccessModal] = React.useState(false);
    const router = useRouter()

    // const [emailAddress, setEmailAddress] = React.useState('')
    // const [password, setPassword] = React.useState('')
    // const [pendingVerification, setPendingVerification] = React.useState(false)
    // const [code, setCode] = React.useState('')

    const [verification, setVerification] = React.useState({
        state: 'default', // 'default' | 'pending' | 'success' | 'failed'
        error: '',
        code: '',
    });

    // Handle submission of sign-up form
    const onSignUpPress = async () => {
        if (!isLoaded) return

        // Start sign-up process using email and password provided
        try {
        await signUp.create({
            emailAddress: form.email,
            password: form.password,
        })

        // Send user an email with verification code
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

        // Set 'pendingVerification' to true to display second form
        // and capture OTP code
        setVerification( { ...verification, state: 'pending' } )
        } catch (err: any) {
        // See https://clerk.com/docs/custom-flows/error-handling
        // for more info on error handling
        console.log(JSON.stringify(err, null, 2));
        Alert.alert("Error", err.errors[0].longMessage);
        }
    }

    // Handle submission of verification form
    const onPressVerify = async () => {
        if (!isLoaded) return

        try {
        // Use the code the user provided to attempt verification
            const signUpAttempt = await signUp.attemptEmailAddressVerification({
                code: verification.code,
            })

            // If verification was completed, set the session to active
            // and redirect the user
            if (signUpAttempt.status === 'complete') {
                //TODO create user in db
                await setActive({ session: signUpAttempt.createdSessionId })
                setVerification( { ...verification, state: 'success' } )
                router.replace('../(tabs)/')
            } else {
                // If the status is not complete, check why. User may need to
                // complete further steps.
                setVerification( { ...verification, error: "Falló la verificación", state: 'failed' } )
            }
            } catch (err: any) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            setVerification( { ...verification, error: err.errors[0].longMessage, state: 'success' } )
            }
        }

    // if (pendingVerification) {
    //     return (
    //     <>
    //         <Text>Verify your email</Text>
    //         <TextInput
    //         value={code}
    //         placeholder="Enter your verification code"
    //         onChangeText={(code) => setCode(code)}
    //         />
    //         <TouchableOpacity onPress={onVerifyPress}>
    //         <Text>Verify</Text>
    //         </TouchableOpacity>
    //     </>
    //     )
    // }
    return (
        <ScrollView className="flex-1 bg-white">
            <View className="flex-1 bg-white ">
                <View className="relative w-full h-48">
                    <Text className="text-4xl text-black absolute bottom-5 left-5">Crea tu cuenta</Text>
                </View>
                <View className='p-5'>
                    <InputField 
                        label="Nombre"
                        placeholder="Ingresa tu nombre"
                        value={form.name}
                        icon="account.fill" // pass the icon name as a string
                        iconColor="#333"
                        iconSize={24}
                        iconStyle="ml-2"
                        onChangeText={(value: string) => setForm({ ...form, name: value })}
                    />
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
                    {/* <Button  onPress={onSignUpPress} className="mt-5 text-purple-500"/> */}
                    <TouchableOpacity onPress={onSignUpPress} className="mt-5 bg-purple-600 py-3 px-6 rounded-full flex items-center">
                        <Text className="text-white text-lg">Registrarse</Text>
                        //TODO const await response
                    </TouchableOpacity>
                </View>

                <OAuth />

                <Link href="/signIn" className="text-lg text-center mt-10">
                    <Text>¿Ya tienes una cuenta? </Text>
                    <Text className='text-purple-700'>Ingresa aquí</Text>
                </Link>

                {/* Verification Modal */}

                <ReactNativeModal 
                    isVisible={verification.state === 'pending'}
                    onModalHide={() => {
                        if (verification.state === "success") {
                            setShowSuccessModal(true);
                        }
                    }}>
                    <View className='bg-white px-7 py-9 rounded-2xl min-h-[300px]'>
                        <Text className='text-2xl mb-2'>
                            Verificación de correo
                        </Text>
                        <Text className='mb-5'>
                            Enviamos un código de verificación a tu correo.
                        </Text>

                        <InputField 
                            label="Code"
                            icon="lock.contour"
                            iconColor='#333'
                            iconSize={20}
                            iconStyle='ml-4'
                            placeholder='123456'
                            value={verification.code}
                            keyboardType='numeric'
                            maxLength={6}
                            onChangeText={(code) => setVerification({...verification, code})}
                        />

                        {verification.error ? (
                            <Text className='text-red-500 mt-2'>
                                {verification.error}
                            </Text>
                        ) : null}

                        <TouchableOpacity onPress={onPressVerify} className='mt-5 bg-green-400 rounded-full'>
                            <Text className='text-white text-center py-3 text-xl'>Verificar email</Text>
                        </TouchableOpacity>
                    </View>
                </ReactNativeModal>

                <ReactNativeModal isVisible={showSuccessModal}>
                    <View className='bg-white px-7 py-9 rounded-2xl min-h-[300px] items-center'>
                        <IconSymbol name="check-circle" color="#34b233" size={150} />
                        <Text className='text-3xl text-center'>
                            Verificado
                        </Text>
                        <Text className='text-base text-gray-400 text-center mt-2'>
                            Tu correo ha sido verificado exitosamente.
                        </Text>
                        <TouchableOpacity onPress={() => {
                            setShowSuccessModal(false);
                            router.replace('../(tabs)/');
                        }}
                        className="mt-5 border-2  py-3 px-6 rounded-full flex items-center">
                            <Text className=" text-lg">Continuar</Text>
                        </TouchableOpacity>
                    </View>
                </ReactNativeModal>
                
            </View>
        </ScrollView>
    );
};

export default SignUp;
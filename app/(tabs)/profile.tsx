// import { SignOutButton } from '@/components/signOutButton';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Profile = () => {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}> 
            <Text style={{fontWeight: 'bold', fontSize: 40, margin: 20}}> 
                Perfil
            </Text>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                {/* <Text > className='text-2xl mt-5'
                    Logout
                </Text> */}
                <TouchableOpacity style={{padding: 20, backgroundColor: 'red', borderRadius: 5}} onPress={async () => {
                    // Aquí iría la lógica para cerrar sesión
                    console.log('Cerrar sesión');
                    router.replace('/(auth)/signIn');
                }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 18 }}>
                        Cerrar sesión
                    </Text>
                </TouchableOpacity>
                {/* <SignOutButton /> */}
            </View>
        </SafeAreaView>
    );
}

export default Profile;
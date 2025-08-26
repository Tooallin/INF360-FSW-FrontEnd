import { SignOutButton } from '@/components/signOutButton';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Perfil = () => {
    return (
        <SafeAreaView className='bg-white'>
            <Text className='text-5xl mt-5'>
                Perfil
            </Text>
            <View className='h-96 w-full mt-5'>
                <Text className='text-2xl mt-5'>
                    Logout
                </Text>
                <SignOutButton />
            </View>
        </SafeAreaView>
    );
}

export default Perfil;
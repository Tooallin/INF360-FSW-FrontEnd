import { Text, TouchableOpacity, View } from 'react-native';

const OAuth = () => {
    const handleGoogleSignIn = async () => {};
    return(
    <View className='pl-5 pr-5'>
        <View className="flex flex-row justify-center items-center gap-x-3 mt-0">
            <View className="flex-1 h-[1px] bg-slate-400" />
            <Text className="text-lg">O</Text>
            <View className="flex-1 h-[1px] bg-slate-400" />
        </View>
        <View className='mt-5'>
            <TouchableOpacity className="border border-purple-400 py-3 px-6 rounded-full flex items-center">
                <Text className='text-black text-lg'>Ingresa con Google</Text>
            </TouchableOpacity>
        </View>
    </View>
    // 1:31:40
)};

export default OAuth;
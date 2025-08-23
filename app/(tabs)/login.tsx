import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Login = () => {
    return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' , backgroundColor: '#e1e1e1'     }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Login Screen</Text>
        </SafeAreaView>
    );
}

export default Login;
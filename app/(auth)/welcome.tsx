import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = () => {
    return (
        <SafeAreaView style={{ alignItems: 'center', alignContent: 'center'}}>
            <Text>Bienvenido/a!</Text>
        </SafeAreaView>
    );
};

export default WelcomeScreen;
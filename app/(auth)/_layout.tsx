import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from "expo-router";

// const Layout = () => {
//     return (
//         <Stack>
//             <Stack.Screen name="signUp" options={{ headerShown: false }} />
//             <Stack.Screen name="signIn" options={{ headerShown: false }} />
//             <Stack.Screen name="welcome" options={{ headerShown: false }} />
//         </Stack>
//     );
// };

// export default Layout;

export default function AuthRoutesLayout() {
    const { isSignedIn } = useAuth()

    if (isSignedIn) {
    return <Redirect href={'./(tabs)/'} />
    }

    return (
    <Stack>
        <Stack.Screen name="signUp" options={{ headerShown: false }} />
        <Stack.Screen name="signIn" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
    );
}
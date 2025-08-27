import { Redirect } from "expo-router";

const Home = () => {
    return <Redirect href="./(auth)/signUp" />;
    // return <Redirect href="/(tabs)" />;
};

export default Home;
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { getToken } from './src/api';
import { COLORS } from './src/config';

import LoginScreen    from './src/screens/LoginScreen';
import PasswordScreen from './src/screens/PasswordScreen';
import HomeScreen     from './src/screens/HomeScreen';
import FuelingScreen  from './src/screens/FuelingScreen';
import SummaryScreen  from './src/screens/SummaryScreen';
import AuthCodeScreen from './src/screens/AuthCodeScreen';
import RatingScreen   from './src/screens/RatingScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        const token = await getToken();
        setInitialRoute(token ? 'Home' : 'Login');
      } catch {
        setInitialRoute('Login');
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          >
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Password" component={PasswordScreen} />
            <Stack.Screen name="Home"     component={HomeScreen} />
            <Stack.Screen name="Fueling"  component={FuelingScreen} />
            <Stack.Screen name="Summary"  component={SummaryScreen} />
            <Stack.Screen name="AuthCode" component={AuthCodeScreen} />
            <Stack.Screen name="Rating"   component={RatingScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary },
});

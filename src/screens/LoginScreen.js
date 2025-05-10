import React, { useState, useContext } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
       console.log('[LoginScreen] ▶️ onLogin start', { email, password });
        try {
          setLoading(true);
         const result = await signIn({ email, password });
         console.log('[LoginScreen] signIn result:', result);
        } catch (err) {
          console.log('[LoginScreen] error', err);
          Alert.alert('Помилка', err.message);
        } finally {
          setLoading(false);
         console.log('[LoginScreen] ⏹️ loading false');
        }
      };
    

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вхід</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Увійти" onPress={onLogin} />
      <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
        Реєстрація
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20 },
  title: { fontSize:24, marginBottom:20, textAlign:'center' },
  input: { borderWidth:1, padding:10, marginBottom:15, borderRadius:5 },
  link: { color:'blue', marginTop:15, textAlign:'center' },
});

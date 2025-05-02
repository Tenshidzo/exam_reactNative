import React, { useContext } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const HomeScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Головна сторінка</Text>
      <Button
        title="Додати правопорушення"
        onPress={() => navigation.navigate('AddViolation')}
      />
      <View style={{ marginTop: 20 }}>
        <Button
          title="Вийти"
          color="red"
          onPress={signOut}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  }
});

export default HomeScreen;

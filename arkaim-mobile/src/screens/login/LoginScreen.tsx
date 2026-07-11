/**
 * Экран входа — Telegram Login Widget.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../shared/theme';

export function LoginScreen() {
  const handleTelegramLogin = () => {
    // Открываем страницу входа в браузере для Telegram Widget
    Linking.openURL('http://localhost:3000/login').catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть страницу входа');
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Вход в систему</Text>
        <Text style={styles.subtitle}>Получите доступ к книге «Наследие Аркаима»</Text>

        <TouchableOpacity style={styles.button} onPress={handleTelegramLogin}>
          <Ionicons name="chatbubble" size={20} color="#fff" />
          <Text style={styles.buttonText}>Войти через Telegram</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Вход через Telegram — быстро и безопасно.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 32, width: '90%', maxWidth: 400, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, textAlign: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: 14, borderRadius: 8, width: '100%', marginBottom: 12, gap: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { fontSize: 12, color: colors.textMuted, marginTop: 16, textAlign: 'center' },
});

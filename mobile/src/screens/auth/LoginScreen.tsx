import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { authAPI, LoginRequest } from '../../services/api';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

export default function LoginScreen({ navigation }: any) {
  const theme = useTheme();
  const { setAuth, setLoading, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authAPI.login(formData);
      const { access_token, user, restaurant } = response.data;
      
      await setAuth(user, access_token, restaurant);
      
      // Success feedback
      Alert.alert('Success', 'Welcome back to PrepIQ!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please try again.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons 
                name="silverware-fork-knife" 
                size={48} 
                color={Colors.primary} 
              />
              <Text style={[styles.appName, { color: theme.colors.onBackground }]}>
                PrepIQ
              </Text>
              <Text style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
                Restaurant Management Made Simple
              </Text>
            </View>
          </View>

          {/* Login Form */}
          <Card style={[styles.card, Shadows.medium]}>
            <Card.Content style={styles.cardContent}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                Sign in to your PrepIQ account
              </Text>

              <View style={styles.form}>
                <TextInput
                  label="Username"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  mode="outlined"
                  error={!!errors.username}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  left={<TextInput.Icon icon="account" />}
                />
                {errors.username && (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {errors.username}
                  </Text>
                )}

                <TextInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  error={!!errors.password}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                {errors.password && (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {errors.password}
                  </Text>
                )}

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <View style={styles.divider}>
                  <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
                    Don't have an account?
                  </Text>
                </View>

                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Register')}
                  style={styles.registerButton}
                  contentStyle={styles.buttonContent}
                >
                  Create Account
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Demo Credentials */}
          <Card style={[styles.demoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text style={[styles.demoTitle, { color: theme.colors.onSurfaceVariant }]}>
                Demo Access
              </Text>
              <Text style={[styles.demoText, { color: theme.colors.onSurfaceVariant }]}>
                Username: testuser{'\n'}
                Password: password
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    ...Typography.h1,
    marginTop: Spacing.sm,
    fontWeight: 'bold',
  },
  tagline: {
    ...Typography.body2,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  cardContent: {
    padding: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body1,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    marginBottom: Spacing.xs,
  },
  errorText: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  loginButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  registerButton: {
    borderRadius: BorderRadius.sm,
  },
  buttonContent: {
    paddingVertical: Spacing.xs,
  },
  buttonLabel: {
    ...Typography.body1,
    fontWeight: '600',
  },
  divider: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerText: {
    ...Typography.body2,
  },
  demoCard: {
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  demoTitle: {
    ...Typography.body1,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  demoText: {
    ...Typography.body2,
    fontFamily: 'monospace',
  },
});
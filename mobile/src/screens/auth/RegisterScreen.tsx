import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  ActivityIndicator,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { authAPI, RegisterRequest } from '../../services/api';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

export default function RegisterScreen({ navigation }: any) {
  const theme = useTheme();
  const { setAuth, setLoading, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
    restaurant_name: '',
    restaurant_address: '',
    restaurant_phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.restaurant_name?.trim()) {
      newErrors.restaurant_name = 'Restaurant name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authAPI.register(formData);
      const { access_token, user, restaurant } = response.data;
      
      await setAuth(user, access_token, restaurant);
      
      Alert.alert('Success', 'Account created successfully! Welcome to PrepIQ!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons 
                name="silverware-fork-knife" 
                size={40} 
                color={Colors.primary} 
              />
              <Text style={[styles.appName, { color: theme.colors.onBackground }]}>
                Join PrepIQ
              </Text>
              <Text style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
                Start managing your restaurant today
              </Text>
            </View>
          </View>

          {/* Registration Form */}
          <Card style={[styles.card, Shadows.medium]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.form}>
                {/* Personal Information */}
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Personal Information
                </Text>
                
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
                  label="Email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  mode="outlined"
                  error={!!errors.email}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                  left={<TextInput.Icon icon="email" />}
                />
                {errors.email && (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {errors.email}
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

                {/* Restaurant Information */}
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Restaurant Information
                </Text>

                <TextInput
                  label="Restaurant Name"
                  value={formData.restaurant_name}
                  onChangeText={(value) => handleInputChange('restaurant_name', value)}
                  mode="outlined"
                  error={!!errors.restaurant_name}
                  style={styles.input}
                  left={<TextInput.Icon icon="store" />}
                />
                {errors.restaurant_name && (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {errors.restaurant_name}
                  </Text>
                )}

                <TextInput
                  label="Restaurant Address (Optional)"
                  value={formData.restaurant_address}
                  onChangeText={(value) => handleInputChange('restaurant_address', value)}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  left={<TextInput.Icon icon="map-marker" />}
                />

                <TextInput
                  label="Restaurant Phone (Optional)"
                  value={formData.restaurant_phone}
                  onChangeText={(value) => handleInputChange('restaurant_phone', value)}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                  left={<TextInput.Icon icon="phone" />}
                />

                <Button
                  mode="contained"
                  onPress={handleRegister}
                  disabled={isLoading}
                  style={styles.registerButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <View style={styles.divider}>
                  <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
                    Already have an account?
                  </Text>
                </View>

                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                >
                  Sign In
                </Button>
              </View>
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: -Spacing.md,
    top: 0,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
  },
  appName: {
    ...Typography.h2,
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
  },
  cardContent: {
    padding: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.xs,
  },
  errorText: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  registerButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  loginButton: {
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
});
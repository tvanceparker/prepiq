import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';
import { login as apiLogin } from '../../api/auth';

export default function LoginScreen({ navigation }: any) {
  const { token, login } = useContext(AuthContext);
  const [username,setUsername] = useState('');
  const [password,setPassword] = useState('');
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');

  useEffect(()=>{ if (token) navigation.replace('dashboard_daily-overview'); },[token]);

  const onSubmit = async () => {
    setLoading(true); setError('');
    try {
      const data = await apiLogin(username,password);
      await login({ token: data.access_token, tier: data.subscription_tier, user: { username, name: data.name, restaurant_id: data.restaurant_id, employee_id: data.employee_id, role_id: data.role_id }, preferences: data.preferences });
    } catch (e:any) {
      setError(e.message||'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex:1, backgroundColor:'#f1f5f9', alignItems:'center', justifyContent:'center', padding:24 }}>
      <View style={{ width:'100%', maxWidth:380, backgroundColor:'white', padding:24, borderRadius:16, elevation:4 }}>
        <Text style={{ fontSize:22, fontWeight:'700', marginBottom:16 }}>Login to PrepIQ</Text>
        <TextInput placeholder='Username' autoCapitalize='none' value={username} onChangeText={setUsername} style={{ borderWidth:1, borderColor:'#cbd5e1', borderRadius:8, padding:12, marginBottom:12 }} />
        <TextInput placeholder='Password' secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth:1, borderColor:'#cbd5e1', borderRadius:8, padding:12, marginBottom:12 }} />
        {error? <Text style={{ color:'#dc2626', marginBottom:8 }}>{error}</Text>: null}
        <TouchableOpacity disabled={loading} onPress={onSubmit} style={{ backgroundColor:'#2563eb', paddingVertical:14, borderRadius:10, alignItems:'center' }}>
          {loading? <ActivityIndicator color='white' /> : <Text style={{ color:'white', fontWeight:'600' }}>Login</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

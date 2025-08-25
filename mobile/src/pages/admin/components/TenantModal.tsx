import React from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Formik } from 'formik';
import * as yup from 'yup';
import {
  TextInput as PaperInput,
  Button as PaperButton,
  Switch,
  useTheme,
  Divider,
  List,
} from 'react-native-paper';
import type { TenantInfoUpdateRequest, DayHours } from '../../../interfaces/admin';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24h

const tenantInfoSchema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().nullable(),
  address: yup.string().nullable(),
  city: yup.string().nullable(),
  state: yup.string().nullable(),
  zip_code: yup.string().nullable(),
  hours_of_operation: yup
    .array()
    .of(
      yup
        .object({
          day: yup.string().required(),
          open_time: yup
            .string()
            .nullable()
            .test('time-format', 'Use HH:MM (24h)', v => !v || timeRegex.test(v)),
          close_time: yup
            .string()
            .nullable()
            .test('time-format', 'Use HH:MM (24h)', v => !v || timeRegex.test(v)),
          is_closed: yup.boolean().required(),
        })
        .test('open-before-close', 'Close time must be after open time', v => {
          if (!v || v.is_closed) return true;
          if (!v.open_time || !v.close_time) return true; // format test handles empties
          return v.open_time < v.close_time;
        })
    )
    .required(),
});

const DAYS: DayHours['day'][] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function TenantModal({
  visible,
  onClose,
  onSave,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: TenantInfoUpdateRequest) => Promise<void> | void;
  initialData: TenantInfoUpdateRequest;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.header, { color: theme.colors.onSurface }]}>Edit Tenant Info</Text>
        <Formik
          initialValues={initialData}
          validationSchema={tenantInfoSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              await onSave(values);
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to save');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isSubmitting,
            setFieldValue,
          }) => (
            <View>
              <PaperInput
                mode="outlined"
                label="Name"
                value={values.name}
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                style={styles.input}
              />
              {touched.name && !!errors.name && (
                <Text style={[styles.error, { color: theme.colors.error }]}>
                  {String(errors.name)}
                </Text>
              )}

              <PaperInput
                mode="outlined"
                label="Email"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                keyboardType="email-address"
                style={styles.input}
              />
              {touched.email && !!errors.email && (
                <Text style={[styles.error, { color: theme.colors.error }]}>
                  {String(errors.email)}
                </Text>
              )}

              <PaperInput
                mode="outlined"
                label="Phone"
                value={values.phone || ''}
                onChangeText={handleChange('phone')}
                onBlur={handleBlur('phone')}
                keyboardType="phone-pad"
                style={styles.input}
              />

              <PaperInput
                mode="outlined"
                label="Address"
                value={values.address || ''}
                onChangeText={handleChange('address')}
                onBlur={handleBlur('address')}
                style={styles.input}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <PaperInput
                    mode="outlined"
                    label="City"
                    value={values.city || ''}
                    onChangeText={handleChange('city')}
                    onBlur={handleBlur('city')}
                    style={styles.input}
                  />
                </View>
                <View style={{ width: 100 }}>
                  <PaperInput
                    mode="outlined"
                    label="State"
                    value={values.state || ''}
                    onChangeText={handleChange('state')}
                    onBlur={handleBlur('state')}
                    style={styles.input}
                  />
                </View>
                <View style={{ width: 120 }}>
                  <PaperInput
                    mode="outlined"
                    label="Zip"
                    value={values.zip_code || ''}
                    onChangeText={handleChange('zip_code')}
                    onBlur={handleBlur('zip_code')}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <Divider style={{ marginVertical: 8 }} />
              <List.Subheader>Hours of Operation</List.Subheader>
              {/* Quick-action chips removed per request; edit hours per day below. */}

              {values.hours_of_operation.map((dh, idx) => (
                <View key={dh.day} style={styles.hoursRowItem}>
                  <Text style={[styles.hoursDay, { color: theme.colors.onSurface }]}>{dh.day}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ marginRight: 6, color: theme.colors.onSurface }}>Closed</Text>
                    <Switch
                      value={dh.is_closed}
                      onValueChange={v => {
                        void setFieldValue(`hours_of_operation.${idx}.is_closed`, v);
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                    <PaperInput
                      mode="outlined"
                      label="Open"
                      value={dh.open_time || ''}
                      onChangeText={t => setFieldValue(`hours_of_operation.${idx}.open_time`, t)}
                      placeholder="HH:MM"
                      disabled={dh.is_closed}
                      style={[styles.input, { flex: 1 }]}
                    />
                    <PaperInput
                      mode="outlined"
                      label="Close"
                      value={dh.close_time || ''}
                      onChangeText={t => setFieldValue(`hours_of_operation.${idx}.close_time`, t)}
                      placeholder="HH:MM"
                      disabled={dh.is_closed}
                      style={[styles.input, { flex: 1 }]}
                    />
                  </View>
                  {errors.hours_of_operation && touched.hours_of_operation && (
                    <Text style={[styles.error, { color: theme.colors.error }]}>
                      {/* show a generic row error if present */}
                      {typeof errors.hours_of_operation === 'string'
                        ? String(errors.hours_of_operation)
                        : ''}
                    </Text>
                  )}
                </View>
              ))}

              <View style={styles.buttonRow}>
                <PaperButton
                  mode="text"
                  onPress={onClose}
                  disabled={isSubmitting}
                  style={[styles.button, styles.buttonLeft]}
                  contentStyle={{ paddingVertical: 8 }}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleSubmit as any}
                  loading={isSubmitting}
                  style={[styles.button, styles.buttonRight]}
                  contentStyle={{ paddingVertical: 8 }}
                >
                  Save
                </PaperButton>
              </View>
            </View>
          )}
        </Formik>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 10 },
  error: { marginBottom: 8 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  button: { flex: 1 },
  buttonLeft: { marginRight: 8 },
  buttonRight: { marginLeft: 8 },
  hoursRowItem: { marginBottom: 12 },
  hoursDay: { fontWeight: '600', marginBottom: 6 },
});

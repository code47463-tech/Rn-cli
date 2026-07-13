'use strict';

const path = require('path');
const fs = require('fs-extra');

async function run(a) {
  const tsx = a.language === 'typescript' ? 'tsx' : 'js';
  const ext = a.language === 'typescript' ? 'ts' : 'js';
  const isTs = a.language === 'typescript';
  const themeDir = path.join(a.targetDir, 'src/theme');
  const compDir = path.join(a.targetDir, 'src/components/ui');

  await fs.writeFile(
    path.join(themeDir, `spacing.${ext}`),
    `/** 4pt spacing scale — use these instead of magic numbers in styles. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
`
  );

  await fs.writeFile(
    path.join(themeDir, `typography.${ext}`),
    `export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 },
  lineHeight: { xs: 16, sm: 20, md: 24, lg: 28, xl: 32, xxl: 40 },
};
`
  );

  await fs.writeFile(
    path.join(themeDir, `colors.${ext}`),
    `export const lightColors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  text: '#111318',
  textMuted: '#6B7280',
  primary: '#2563EB',
  danger: '#DC2626',
  success: '#16A34A',
  border: '#E5E7EB',
};

export const darkColors = {
  background: '#0B0D12',
  surface: '#171A21',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  primary: '#60A5FA',
  danger: '#F87171',
  success: '#4ADE80',
  border: '#2A2E38',
};
`
  );

  await fs.writeFile(
    path.join(themeDir, `ThemeProvider.${tsx}`),
    `import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

${
  isTs
    ? `type Mode = 'light' | 'dark';

interface Theme {
  mode: Mode;
  colors: typeof lightColors;
  spacing: typeof spacing;
  typography: typeof typography;
  toggleMode: () => void;
}

const ThemeContext = createContext<Theme | undefined>(undefined);
`
    : 'const ThemeContext = createContext(undefined);\n'
}
export function ThemeProvider({ children }${isTs ? ': { children: React.ReactNode }' : ''}) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState${isTs ? '<Mode>' : ''}(systemScheme === 'dark' ? 'dark' : 'light');

  const value = useMemo(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      spacing,
      typography,
      toggleMode: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
`
  );

  const components = {
    Button: `import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator${isTs ? ', PressableProps' : ''} } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

${
  isTs
    ? "interface ButtonProps extends PressableProps {\n  label: string;\n  variant?: 'primary' | 'secondary' | 'danger';\n  loading?: boolean;\n}\n\n"
    : ''
}export function Button({ label, variant = 'primary', loading, disabled, style, ...rest }${isTs ? ': ButtonProps' : ''}) {
  const { colors, spacing } = useTheme();
  const bg = variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.surface : colors.primary;
  const textColor = variant === 'secondary' ? colors.text : '#fff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      style={[{ backgroundColor: bg, padding: spacing.md, borderRadius: 8, alignItems: 'center', opacity: disabled ? 0.5 : 1 }, style]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={{ color: textColor, fontWeight: '600' }}>{label}</Text>}
    </Pressable>
  );
}
`,
    Input: `import React from 'react';
import { TextInput, View, Text, StyleSheet${isTs ? ', TextInputProps' : ''} } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

${isTs ? "interface InputProps extends TextInputProps {\n  label?: string;\n  error?: string;\n}\n\n" : ''}export function Input({ label, error, style, ...rest }${isTs ? ': InputProps' : ''}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text accessibilityRole="text" style={{ color: colors.text, marginBottom: spacing.xs }}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[
          { borderWidth: 1, borderColor: error ? colors.danger : colors.border, borderRadius: 8, padding: spacing.sm, color: colors.text },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={{ color: colors.danger, marginTop: spacing.xs }}>{error}</Text> : null}
    </View>
  );
}
`,
    Card: `import React from 'react';
import { View${isTs ? ', ViewProps' : ''} } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export function Card({ children, style, ...rest }${isTs ? ': ViewProps' : ''}) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={[{ backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.border }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
`,
    Header: `import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

${isTs ? "interface HeaderProps {\n  title: string;\n  onBack?: () => void;\n  right?: React.ReactNode;\n}\n\n" : ''}export function Header({ title, onBack, right }${isTs ? ': HeaderProps' : ''}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.background }}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack}>
          <Text style={{ color: colors.primary, fontSize: typography.size.md }}>Back</Text>
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: '700' }}>{title}</Text>
      {right || <View style={{ width: 40 }} />}
    </View>
  );
}
`,
    Modal: `import React from 'react';
import { Modal as RNModal, View, Pressable${isTs ? ', ModalProps as RNModalProps' : ''} } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

${isTs ? "interface ModalProps {\n  visible: boolean;\n  onClose: () => void;\n  children: React.ReactNode;\n}\n\n" : ''}export function Modal({ visible, onClose, children }${isTs ? ': ModalProps' : ''}) {
  const { colors, spacing } = useTheme();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close modal"
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.background, borderRadius: 12, padding: spacing.lg }}>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
`,
    BottomSheet: `import React from 'react';
import { Modal, View, PanResponder, Animated${isTs ? '' : ''} } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

${isTs ? "interface BottomSheetProps {\n  visible: boolean;\n  onClose: () => void;\n  children: React.ReactNode;\n}\n\n" : ''}/**
 * Minimal bottom sheet. For production apps with complex gestures, consider
 * swapping this internals for @gorhom/bottom-sheet while keeping the same API.
 */
export function BottomSheet({ visible, onClose, children }${isTs ? ': BottomSheetProps' : ''}) {
  const { colors, spacing } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg }}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
`,
    Loader: `import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export function Loader({ label }${isTs ? ': { label?: string }' : ''}) {
  const { colors, spacing } = useTheme();
  return (
    <View accessibilityRole="progressbar" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>{label}</Text> : null}
    </View>
  );
}
`,
    EmptyState: `import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Button } from './Button';

${isTs ? "interface EmptyStateProps {\n  title: string;\n  description?: string;\n  actionLabel?: string;\n  onAction?: () => void;\n}\n\n" : ''}export function EmptyState({ title, description, actionLabel, onAction }${isTs ? ': EmptyStateProps' : ''}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
      <Text style={{ color: colors.text, fontSize: typography.size.lg, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      {description ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}
`,
    ErrorState: `import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Button } from './Button';

${isTs ? "interface ErrorStateProps {\n  message?: string;\n  onRetry?: () => void;\n}\n\n" : ''}export function ErrorState({ message = 'Something went wrong.', onRetry }${isTs ? ': ErrorStateProps' : ''}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
      <Text style={{ color: colors.danger, fontSize: typography.size.md, textAlign: 'center' }}>{message}</Text>
      {onRetry ? <Button label="Retry" onPress={onRetry} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}
`,
  };

  for (const [name, content] of Object.entries(components)) {
    await fs.writeFile(path.join(compDir, `${name}.${tsx}`), content);
  }

  await fs.writeFile(
    path.join(compDir, `index.${ext}`),
    Object.keys(components)
      .map((name) => `export { ${name} } from './${name}';`)
      .join('\n') + '\n'
  );
}

module.exports = { run };

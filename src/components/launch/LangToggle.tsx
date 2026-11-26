import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { setLang, useLang } from '../../i18n/lang';
import { THEME } from '../../theme';

const { colors, radius, spacing, typography } = THEME;

/** English / اردو — for the launch screens (how to start, account status). */
const LangToggle: React.FC = () => {
  const lang = useLang();
  return (
    <View style={S.group} accessibilityRole="radiogroup" accessibilityLabel="Language">
      {(['en', 'ur'] as const).map(l => (
        <Pressable
          key={l}
          onPress={() => setLang(l)}
          accessibilityRole="radio"
          accessibilityState={{ selected: lang === l }}
          style={[S.option, lang === l && S.optionOn]}
        >
          <Text style={[S.text, lang === l && S.textOn]}>{l === 'en' ? 'English' : 'اردو'}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const S = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderRadius: radius.md,
    padding: 2,
    backgroundColor: colors.surface,
  },
  option: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.sm },
  optionOn: { backgroundColor: colors.primary },
  text: { ...typography.labelSm, color: colors.neutral600 },
  textOn: { color: colors.textInverse },
});

export default LangToggle;

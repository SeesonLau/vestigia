// app/(auth)/register.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenWrapper from "../../components/layout/ScreenWrapper";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
import { useAuthStore } from "../../store/authStore";
import { Sex } from "../../types";

type Role = "patient" | "clinic";

//8-digit YYYYMMDD → ISO YYYY-MM-DD, or null if invalid
function dobDigitsToISO(digits: string): string | null {
  if (digits.length !== 8) return null;
  const y = parseInt(digits.slice(0, 4), 10);
  const m = parseInt(digits.slice(4, 6), 10);
  const d = parseInt(digits.slice(6, 8), 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const now = new Date();
  if (y < 1900 || y > now.getFullYear()) return null;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1) return null; //rejects Feb 30 etc.
  if (date > now) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const SEX_OPTIONS: { value: Sex; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "male",   label: "Male",   icon: "male-outline" },
  { value: "female", label: "Female", icon: "female-outline" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { registerPatient, error: storeError, clearError } = useAuthStore();

  const [role, setRole] = useState<Role>("patient");

  //Patient form state
  const [firstName, setFirstName]   = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName]     = useState("");
  const [sex, setSex]               = useState<Sex | null>(null);
  const [dobDigits, setDob]         = useState(""); //8 digits YYYYMMDD
  const [phoneDigits, setPhone]     = useState(""); //11 digits

  //Account form state
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);

  //UI state
  const [loading, setLoading]     = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  //Role-based accent — Patient stays teal; Clinic goes info-blue
  const accent = role === "clinic" ? colors.info : colors.accent;

  const validate = () => {
    const e: Record<string, string> = {};

    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim())  e.lastName  = "Required";
    if (!sex)              e.sex       = "Select one";
    if (dobDigits.length !== 8 || !dobDigitsToISO(dobDigits)) {
      e.dateOfBirth = "Enter a valid date";
    }
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith("0")) {
      e.contactNumber = "Enter an 11-digit number starting with 0";
    }

    if (!email.includes("@")) e.email = "Enter a valid email";
    const missing: string[] = [];
    if (password.length < 8) missing.push("8+ characters");
    if (!/[A-Z]/.test(password)) missing.push("uppercase letter");
    if (!/[0-9]/.test(password)) missing.push("number");
    if (missing.length) e.password = `Must include: ${missing.join(", ")}`;
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await registerPatient({
      email,
      password,
      firstName,
      middleName: middleName.trim() || undefined,
      lastName,
      sex: sex!,
      dateOfBirth: dobDigitsToISO(dobDigits)!,
      contactNumber: phoneDigits,
    });
    setLoading(false);
    if (result.success && result.needsConfirmation) {
      setEmailSent(true);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoContainer,
                {
                  backgroundColor: `${accent}1A`,
                  borderColor: accent,
                  shadowColor: accent,
                },
              ]}
            >
              <Ionicons
                name={role === "clinic" ? "business-outline" : "person-outline"}
                size={32}
                color={accent}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {S.auth.register}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>
              {role === "clinic"
                ? "Register your healthcare facility"
                : "Create your patient account"}
            </Text>
          </View>

          {/* Role selector — hidden once confirmation card is showing */}
          {!emailSent ? (
            <View
              style={[
                styles.roleTabs,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {(["patient", "clinic"] as Role[]).map((r) => {
                const selected = role === r;
                const tabAccent = r === "clinic" ? colors.info : colors.accent;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => { setRole(r); clearError(); setErrors({}); }}
                    style={[
                      styles.roleTab,
                      selected && {
                        backgroundColor: `${tabAccent}1F`,
                        borderColor: tabAccent,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={r === "patient" ? "person-outline" : "business-outline"}
                      size={18}
                      color={selected ? tabAccent : colors.textSec}
                    />
                    <Text
                      style={[
                        styles.roleTabText,
                        { color: selected ? tabAccent : colors.textSec },
                      ]}
                    >
                      {r === "patient" ? "Patient" : "Clinic"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {emailSent ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Check your inbox</Text>
              <Text style={[styles.confirmSubtitle, { color: colors.textSec }]}>
                We've sent a confirmation link to{" "}
                <Text style={[styles.emailHighlight, { color: accent }]}>{email}</Text>.
                {"\n\n"}Click the link in the email to activate your account, then sign in.
              </Text>
              <Button
                label="Back to Sign In"
                onPress={() => router.replace("/(auth)/login")}
                variant="secondary"
                size="lg"
              />
            </View>
          ) : role === "patient" ? (
            <PatientForm
              accent={accent}
              firstName={firstName}      setFirstName={setFirstName}
              middleName={middleName}    setMiddleName={setMiddleName}
              lastName={lastName}        setLastName={setLastName}
              sex={sex}                  setSex={setSex}
              dobDigits={dobDigits}      setDob={setDob}
              phoneDigits={phoneDigits}  setPhone={setPhone}
              email={email}              setEmail={setEmail}
              password={password}        setPassword={setPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              showPassword={showPassword} setShowPassword={setShowPassword}
              errors={errors}
              storeError={storeError}
              clearError={clearError}
              loading={loading}
              onSubmit={handleRegister}
            />
          ) : (
            <ClinicSignupComingSoon accent={accent} />
          )}

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSec }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.replace("/(auth)/login")}>
              <Text style={[styles.loginLink, { color: accent }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

//──────────────────────────────────────────────────────────────────────
//Patient form — split into two cards (Account / Profile)
//──────────────────────────────────────────────────────────────────────
interface PatientFormProps {
  accent: string;
  firstName: string;       setFirstName: (v: string) => void;
  middleName: string;      setMiddleName: (v: string) => void;
  lastName: string;        setLastName: (v: string) => void;
  sex: Sex | null;         setSex: (v: Sex) => void;
  dobDigits: string;       setDob: (v: string) => void;
  phoneDigits: string;     setPhone: (v: string) => void;
  email: string;           setEmail: (v: string) => void;
  password: string;        setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  showPassword: boolean;   setShowPassword: (fn: (v: boolean) => boolean) => void;
  errors: Record<string, string>;
  storeError: string | null;
  clearError: () => void;
  loading: boolean;
  onSubmit: () => void;
}

function PatientForm(p: PatientFormProps) {
  const { colors } = useTheme();
  return (
    <>
      {/* Account details */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Account details</Text>

        <Input
          label="Email address"
          value={p.email}
          onChangeText={(v) => { p.setEmail(v); p.clearError(); }}
          keyboardType="email-address"
          error={p.errors.email}
          accentColor={p.accent}
        />
        <Input
          label="Password"
          value={p.password}
          onChangeText={(v) => { p.setPassword(v); p.clearError(); }}
          secureTextEntry={!p.showPassword}
          error={p.errors.password}
          accentColor={p.accent}
          rightIcon={
            <Ionicons
              name={p.showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textSec}
            />
          }
          onRightIconPress={() => p.setShowPassword((v) => !v)}
        />
        <Input
          label="Confirm password"
          value={p.confirmPassword}
          onChangeText={p.setConfirmPassword}
          secureTextEntry={!p.showPassword}
          error={p.errors.confirmPassword}
          accentColor={p.accent}
        />
      </View>

      {/* Profile details */}
      <View style={[styles.card, styles.cardSpaced, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Profile details</Text>

        <Input
          label="First name"
          value={p.firstName}
          onChangeText={(v) => { p.setFirstName(v); p.clearError(); }}
          autoCapitalize="words"
          error={p.errors.firstName}
          accentColor={p.accent}
        />
        <Input
          label="Middle name"
          optional
          value={p.middleName}
          onChangeText={p.setMiddleName}
          autoCapitalize="words"
          accentColor={p.accent}
        />
        <Input
          label="Last name"
          value={p.lastName}
          onChangeText={(v) => { p.setLastName(v); p.clearError(); }}
          autoCapitalize="words"
          error={p.errors.lastName}
          accentColor={p.accent}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSec }]}>Sex</Text>
        <View style={styles.sexRow}>
          {SEX_OPTIONS.map((opt) => {
            const selected = p.sex === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => p.setSex(opt.value)}
                style={[
                  styles.sexBtn,
                  {
                    borderColor: selected ? p.accent : colors.border,
                    backgroundColor: selected ? `${p.accent}1F` : "transparent",
                  },
                ]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={selected ? p.accent : colors.textSec}
                />
                <Text
                  style={[
                    styles.sexLabel,
                    { color: selected ? p.accent : colors.textSec },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {p.errors.sex ? (
          <Text style={[styles.fieldError, { color: colors.error }]}>{p.errors.sex}</Text>
        ) : null}

        <Input
          label="Date of birth"
          value={p.dobDigits}
          onChangeText={p.setDob}
          format="date"
          error={p.errors.dateOfBirth}
          accentColor={p.accent}
        />
        <Input
          label="Contact number"
          value={p.phoneDigits}
          onChangeText={p.setPhone}
          format="phone"
          error={p.errors.contactNumber}
          accentColor={p.accent}
        />

        {p.storeError ? (
          <Text style={[styles.generalError, { color: colors.error }]}>{p.storeError}</Text>
        ) : null}

        <Button
          label={S.auth.register}
          onPress={p.onSubmit}
          loading={p.loading}
          size="lg"
          style={{ backgroundColor: p.accent, borderColor: p.accent, shadowColor: p.accent }}
        />

        <Text style={[styles.terms, { color: colors.textSec }]}>
          By creating an account, you agree to our{" "}
          <Text style={{ color: p.accent }}>Terms of Service</Text> and{" "}
          <Text style={{ color: p.accent }}>Privacy Policy</Text>.
        </Text>
      </View>
    </>
  );
}

//──────────────────────────────────────────────────────────────────────
//Clinic signup placeholder — full form lands in a follow-up round
//──────────────────────────────────────────────────────────────────────
function ClinicSignupComingSoon({ accent }: { accent: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.comingHeader}>
        <Ionicons name="construct-outline" size={28} color={accent} />
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
          Clinic signup coming soon
        </Text>
      </View>
      <Text style={[styles.confirmSubtitle, { color: colors.textSec }]}>
        Clinic registration is a longer process — we'll collect:
      </Text>
      <Bullet color={accent} text="Facility name, type, and DOH LTO number" />
      <Bullet color={accent} text="Region, province, city, barangay, address, and ZIP" />
      <Bullet color={accent} text="Phone, optional website" />
      <Bullet color={accent} text="Primary contact person details" />
      <Text style={[styles.confirmSubtitle, { color: colors.textSec, marginTop: Spacing.lg }]}>
        This form will be wired up in the next round.
      </Text>
    </View>
  );
}

function Bullet({ color, text }: { color: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: color }]} />
      <Text style={[styles.bulletText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["3xl"],
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    marginTop: Spacing.xs,
  },

  //Role tabs
  roleTabs: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  roleTabText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },

  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  cardSpaced: {
    marginTop: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.sizes["2xl"],
    fontFamily: Typography.fonts.heading,
    marginBottom: Spacing.sm,
  },
  confirmSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  emailHighlight: {
    fontFamily: Typography.fonts.subheading,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  fieldError: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sexRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sexBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  sexLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.subheading,
  },
  generalError: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  terms: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.fonts.body,
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
  },
  loginLink: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.subheading,
  },

  //Coming-soon card
  comingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    lineHeight: 22,
  },
});

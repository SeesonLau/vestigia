// app/(auth)/register.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import Picker, { PickerOption } from "../../components/ui/Picker";
import { useTheme } from "../../constants/ThemeContext";
import { Radius, Spacing, Typography } from "../../constants/theme";
import { S } from "../../constants/strings";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { Sex } from "../../types";

const FACILITY_TYPES: PickerOption[] = [
  { value: "tertiary_hospital",   label: "Tertiary Hospital" },
  { value: "secondary_hospital",  label: "Secondary Hospital" },
  { value: "primary_hospital",    label: "Primary Hospital" },
  { value: "outpatient_clinic",   label: "Outpatient Clinic" },
  { value: "diagnostic_center",   label: "Diagnostic Center" },
  { value: "infirmary",           label: "Infirmary" },
  { value: "birthing_home",       label: "Birthing Home" },
  { value: "dialysis_center",     label: "Dialysis Center" },
  { value: "ambulatory_surgical", label: "Ambulatory Surgical" },
];

const NCR_REGION_CODE = "130000000";
//Input format='doh-lto' returns the clean 10-char string (digits + letters, no
//dashes). Per-position validity is enforced by the Input itself, so the
//validator only needs to check length. The DB CHECK constraint and the
//clinic-signup Edge Function expect the DASHED form (NN-NNN-NN-LL-N), so we
//run dohLtoToDashed before submission.
const DOH_LTO_CLEAN_RE = /^[0-9]{7}[A-Z]{2}[0-9]$/;
const dohLtoToDashed = (clean: string) =>
  clean.length === 10
    ? `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 7)}-${clean.slice(7, 9)}-${clean.slice(9)}`
    : clean;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
            <ClinicForm
              accent={accent}
              onSuccess={(clinicCode) =>
                router.replace(
                  clinicCode
                    ? (`/(auth)/clinic-pending-approval?clinic_code=${encodeURIComponent(clinicCode)}` as any)
                    : "/(auth)/clinic-pending-approval" as any,
                )
              }
            />
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
//Clinic signup form — Account / Facility / Location / Contact
//──────────────────────────────────────────────────────────────────────
interface CityRow { value: string; label: string; zip: string | null }

function ClinicForm({ accent, onSuccess }: { accent: string; onSuccess: (clinicCode?: string) => void }) {
  const { colors } = useTheme();
  const { registerClinic } = useAuthStore();

  //Account
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);

  //Facility
  const [facilityName, setFacilityName]   = useState("");
  const [facilityType, setFacilityType]   = useState<string | null>(null);
  const [dohLto, setDohLto]               = useState("");

  //Location
  const [regionCode, setRegionCode]       = useState<string | null>(null);
  const [provinceCode, setProvinceCode]   = useState<string | null>(null);
  const [cityCode, setCityCode]           = useState<string | null>(null);
  const [barangayCode, setBarangayCode]   = useState<string | null>(null);
  const [addressLine, setAddressLine]     = useState("");
  const [zipCode, setZipCode]             = useState("");
  const [phoneDigits, setPhoneDigits]     = useState("");
  const [website, setWebsite]             = useState("");

  //Contact person
  const [cFirstName, setCFirstName]   = useState("");
  const [cMiddleName, setCMiddleName] = useState("");
  const [cLastName, setCLastName]     = useState("");
  const [cMobileDigits, setCMobile]   = useState("");
  const [cEmail, setCEmail]           = useState("");

  //PSGC option lists
  const [regions, setRegions]     = useState<PickerOption[]>([]);
  const [provinces, setProvinces] = useState<PickerOption[]>([]);
  const [cities, setCities]       = useState<CityRow[]>([]);
  const [barangays, setBarangays] = useState<PickerOption[]>([]);
  const [loadingPicker, setLoadingPicker] = useState({ p: false, c: false, b: false });

  const isNCR = regionCode === NCR_REGION_CODE;

  //Submit state
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  //Fetch regions on mount
  useEffect(() => {
    supabase.from("ph_regions").select("code, name").order("name")
      .then(({ data }) => {
        setRegions((data ?? []).map((r) => ({ value: r.code, label: r.name })));
      });
  }, []);

  //Refresh provinces when region changes (NCR has none — skip step)
  useEffect(() => {
    setProvinceCode(null);
    setCityCode(null);
    setBarangayCode(null);
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    if (!regionCode || isNCR) return;
    setLoadingPicker((s) => ({ ...s, p: true }));
    supabase.from("ph_provinces").select("code, name").eq("region_code", regionCode).order("name")
      .then(({ data }) => {
        setProvinces((data ?? []).map((p) => ({ value: p.code, label: p.name })));
        setLoadingPicker((s) => ({ ...s, p: false }));
      });
  }, [regionCode, isNCR]);

  //Refresh cities. NCR fetches by code prefix; others by province_code.
  useEffect(() => {
    setCityCode(null);
    setBarangayCode(null);
    setBarangays([]);
    setZipCode("");
    if (!regionCode) { setCities([]); return; }
    setLoadingPicker((s) => ({ ...s, c: true }));
    const base = supabase.from("ph_cities").select("code, name, default_zip").order("name");
    const q = isNCR ? base.like("code", "13%") : provinceCode ? base.eq("province_code", provinceCode) : null;
    if (!q) { setCities([]); setLoadingPicker((s) => ({ ...s, c: false })); return; }
    q.then(({ data }) => {
      setCities((data ?? []).map((c) => ({ value: c.code, label: c.name, zip: c.default_zip })));
      setLoadingPicker((s) => ({ ...s, c: false }));
    });
  }, [regionCode, provinceCode, isNCR]);

  //Refresh barangays + auto-fill ZIP when city changes
  useEffect(() => {
    setBarangayCode(null);
    if (!cityCode) { setBarangays([]); setZipCode(""); return; }
    const matched = cities.find((c) => c.value === cityCode);
    if (matched?.zip) setZipCode(matched.zip);
    setLoadingPicker((s) => ({ ...s, b: true }));
    supabase.from("ph_barangays").select("code, name").eq("city_code", cityCode).order("name")
      .then(({ data }) => {
        setBarangays((data ?? []).map((b) => ({ value: b.code, label: b.name })));
        setLoadingPicker((s) => ({ ...s, b: false }));
      });
  }, [cityCode, cities]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!EMAIL_RE.test(email)) e.email = "Enter a valid email";
    const missing: string[] = [];
    if (password.length < 8) missing.push("8+ characters");
    if (!/[A-Z]/.test(password)) missing.push("uppercase letter");
    if (!/[0-9]/.test(password)) missing.push("number");
    if (missing.length) e.password = `Must include: ${missing.join(", ")}`;
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";

    if (!facilityName.trim()) e.facilityName = "Required";
    if (!facilityType) e.facilityType = "Select one";
    if (!DOH_LTO_CLEAN_RE.test(dohLto)) e.dohLto = "Format: NN-NNN-NN-LL-N";

    if (!regionCode) e.regionCode = "Select region";
    if (!isNCR && !provinceCode) e.provinceCode = "Select province";
    if (!cityCode) e.cityCode = "Select city / municipality";
    if (!barangayCode) e.barangayCode = "Select barangay";
    if (!/^0\d{10}$/.test(phoneDigits)) e.phone = "11 digits starting with 0";

    if (!cFirstName.trim()) e.cFirstName = "Required";
    if (!cLastName.trim())  e.cLastName  = "Required";
    if (!/^0\d{10}$/.test(cMobileDigits)) e.cMobile = "11 digits starting with 0";
    if (!EMAIL_RE.test(cEmail)) e.cEmail = "Enter a valid email";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setStoreError(null);
    if (!validate()) return;
    setLoading(true);
    const result = await registerClinic({
      email,
      password,
      facility_name: facilityName,
      facility_type: facilityType!,
      doh_lto_number: dohLtoToDashed(dohLto),
      region_code: regionCode!,
      province_code: isNCR ? null : provinceCode,
      city_code: cityCode!,
      barangay_code: barangayCode!,
      address_line: addressLine || undefined,
      zip_code: zipCode || undefined,
      phone: phoneDigits,
      website: website || undefined,
      contact_first_name: cFirstName,
      contact_middle_name: cMiddleName.trim() || undefined,
      contact_last_name: cLastName,
      contact_mobile: cMobileDigits,
      contact_email: cEmail,
    });
    setLoading(false);
    if (result.success) {
      onSuccess(result.clinic_code);
    } else {
      setStoreError(result.error ?? "Could not register clinic.");
    }
  };

  return (
    <>
      {/* Account details */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Account details</Text>
        <Input
          label="Email address"
          value={email}
          onChangeText={(v) => { setEmail(v); setStoreError(null); }}
          keyboardType="email-address"
          error={errors.email}
          accentColor={accent}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={(v) => { setPassword(v); setStoreError(null); }}
          secureTextEntry={!showPassword}
          error={errors.password}
          accentColor={accent}
          rightIcon={
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textSec}
            />
          }
          onRightIconPress={() => setShowPassword((v) => !v)}
        />
        <Input
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          error={errors.confirmPassword}
          accentColor={accent}
        />
      </View>

      {/* Facility information */}
      <View style={[styles.card, styles.cardSpaced, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Facility information</Text>
        <Input
          label="Facility name"
          value={facilityName}
          onChangeText={setFacilityName}
          autoCapitalize="words"
          error={errors.facilityName}
          accentColor={accent}
        />
        <Picker
          label="Facility type"
          value={facilityType}
          options={FACILITY_TYPES}
          onChange={setFacilityType}
          error={errors.facilityType}
          accentColor={accent}
        />
        <Input
          label="License Number"
          value={dohLto}
          onChangeText={setDohLto}
          format="doh-lto"
          error={errors.dohLto}
          accentColor={accent}
          hint="Format: NN-NNN-NN-LL-N (e.g. 09-183-56-TH-0)"
        />
      </View>

      {/* Location and contact */}
      <View style={[styles.card, styles.cardSpaced, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Location and contact</Text>
        <Picker
          label="Region"
          value={regionCode}
          options={regions}
          onChange={setRegionCode}
          error={errors.regionCode}
          accentColor={accent}
        />
        {!isNCR ? (
          <Picker
            label="Province"
            value={provinceCode}
            options={provinces}
            onChange={setProvinceCode}
            error={errors.provinceCode}
            accentColor={accent}
            disabled={!regionCode}
            loading={loadingPicker.p}
          />
        ) : null}
        <Picker
          label="City / Municipality"
          value={cityCode}
          options={cities.map(({ value, label }) => ({ value, label }))}
          onChange={setCityCode}
          error={errors.cityCode}
          accentColor={accent}
          disabled={isNCR ? !regionCode : !provinceCode}
          loading={loadingPicker.c}
        />
        <Picker
          label="Barangay"
          value={barangayCode}
          options={barangays}
          onChange={setBarangayCode}
          error={errors.barangayCode}
          accentColor={accent}
          disabled={!cityCode}
          loading={loadingPicker.b}
        />
        <Input
          label="Address"
          optional
          value={addressLine}
          onChangeText={setAddressLine}
          autoCapitalize="words"
          accentColor={accent}
          hint="Street, building, floor, etc."
        />
        <Input
          label="ZIP code"
          optional
          value={zipCode}
          onChangeText={setZipCode}
          keyboardType="numeric"
          accentColor={accent}
          hint="Auto-filled from city — edit if needed"
        />
        <Input
          label="Phone"
          value={phoneDigits}
          onChangeText={setPhoneDigits}
          format="phone"
          error={errors.phone}
          accentColor={accent}
        />
        <Input
          label="Website"
          optional
          value={website}
          onChangeText={setWebsite}
          keyboardType="default"
          accentColor={accent}
        />
      </View>

      {/* Primary contact person */}
      <View style={[styles.card, styles.cardSpaced, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSec }]}>Primary contact person</Text>
        <Input
          label="First name"
          value={cFirstName}
          onChangeText={setCFirstName}
          autoCapitalize="words"
          error={errors.cFirstName}
          accentColor={accent}
        />
        <Input
          label="Middle name"
          optional
          value={cMiddleName}
          onChangeText={setCMiddleName}
          autoCapitalize="words"
          accentColor={accent}
        />
        <Input
          label="Last name"
          value={cLastName}
          onChangeText={setCLastName}
          autoCapitalize="words"
          error={errors.cLastName}
          accentColor={accent}
        />
        <Input
          label="Mobile number"
          value={cMobileDigits}
          onChangeText={setCMobile}
          format="phone"
          error={errors.cMobile}
          accentColor={accent}
        />
        <Input
          label="Email address"
          value={cEmail}
          onChangeText={setCEmail}
          keyboardType="email-address"
          error={errors.cEmail}
          accentColor={accent}
        />

        {storeError ? (
          <Text style={[styles.generalError, { color: colors.error }]}>{storeError}</Text>
        ) : null}

        <Button
          label={S.auth.register}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
          style={{ backgroundColor: accent, borderColor: accent, shadowColor: accent }}
        />

        <Text style={[styles.terms, { color: colors.textSec }]}>
          By creating an account, you agree to our{" "}
          <Text style={{ color: accent }}>Terms of Service</Text> and{" "}
          <Text style={{ color: accent }}>Privacy Policy</Text>.
        </Text>
      </View>
    </>
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

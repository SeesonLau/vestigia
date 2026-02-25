// app/index.tsx
import { Redirect } from "expo-router";

// TODO: Check auth session and redirect appropriately
// → No session: (auth)/login
// → role = clinic: (clinic)
// → role = patient: (patient)
// → role = admin: (admin)

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}

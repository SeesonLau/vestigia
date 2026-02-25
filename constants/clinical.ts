// constants/clinical.ts
export const ClinicalThresholds = {
  asymmetry: 2.2, // °C bilateral threshold (Hernandez-Contreras 2019)
  glucose: { min: 30, max: 600 }, // mg/dL
  systolic: { min: 60, max: 250 }, // mmHg
  diastolic: { min: 40, max: 150 }, // mmHg
  heartRate: { min: 30, max: 220 }, // bpm
  hba1c: { min: 3.0, max: 20.0 }, // %
  ambientTemp: { min: 10.0, max: 45.0 }, // °C
};

export const Angiosomes = ["MPA", "LPA", "MCA", "LCA"] as const;
export type Angiosome = (typeof Angiosomes)[number];

export const AngiosomeLabels: Record<Angiosome, string> = {
  MPA: "Medial Plantar Artery",
  LPA: "Lateral Plantar Artery",
  MCA: "Medial Calcaneal Artery",
  LCA: "Lateral Calcaneal Artery",
};

export const DISCLAIMER_TEXT =
  "This system is a screening tool only and does not replace clinical diagnosis. " +
  "All results require clinical correlation by a qualified healthcare professional.";

// lib/database/index.ts
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { localSchema } from './schema';
import { Patient } from './models/Patient';
import { ScreeningSession } from './models/ScreeningSession';
import { ThermalCapture } from './models/ThermalCapture';
import { PatientVitals } from './models/PatientVitals';

//Adapter
//LokiJS is used for Expo Go compatibility.
//Switch to SQLiteAdapter when building a native development build.
const adapter = new LokiJSAdapter({
  schema: localSchema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  dbName: 'vestigia_local',
  onSetUpError: (error) => {
    console.error('WatermelonDB setup error:', error);
  },
});

//Database
export const localDatabase = new Database({
  adapter,
  modelClasses: [Patient, ScreeningSession, ThermalCapture, PatientVitals],
});

//Collections
export const patientsCollection = localDatabase.get<Patient>('patients');
export const sessionsCollection = localDatabase.get<ScreeningSession>('screening_sessions');
export const capturesCollection = localDatabase.get<ThermalCapture>('thermal_captures');
export const vitalsCollection = localDatabase.get<PatientVitals>('patient_vitals');

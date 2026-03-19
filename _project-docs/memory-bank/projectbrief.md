# Project Brief — Vestigia

## What It Is
Vestigia is a mobile application for Diabetic Peripheral Neuropathy (DPN) screening using thermal foot imaging. It captures thermal maps of a patient's feet, runs AI classification, and provides clinical reports to healthcare providers.

## User Roles
- **Clinic** — Operators who conduct screenings, manage devices, view session history
- **Patient** — View their own screening results and history
- **Admin** — Platform management (users, clinics, AI model config)

## Core Goal
Enable early DPN detection through an end-to-end workflow:
1. Clinic operator pairs a thermal imaging device
2. Captures thermal images of patient's feet (left + right)
3. AI classifies the result (positive/negative DPN + confidence score)
4. Results stored and visible to both clinic and patient

## Key Entities
- `Clinic` — Healthcare facility running screenings
- `Patient` — Person being screened (linked to a clinic)
- `Device` — Thermal imaging hardware (BLE/WiFi connected)
- `ScreeningSession` — One complete scan event
- `ThermalCapture` — Raw thermal matrix per foot
- `ClassificationResult` — AI output for a session

// lib/thermal/bundleUtils.ts

export function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function calculateBMI(weight_kg: number, height_cm: number): number {
  const h = height_cm / 100
  return weight_kg / (h * h)
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight"
  if (bmi < 25)   return "Normal"
  if (bmi < 30)   return "Overweight"
  return "Obese"
}

// Parse raw digit string "MMDDYYYY" → ISO "YYYY-MM-DD", or null if invalid
export function digitsToISO(digits: string): string | null {
  if (digits.length !== 8) return null
  const month = parseInt(digits.slice(0, 2), 10)
  const day   = parseInt(digits.slice(2, 4), 10)
  const year  = parseInt(digits.slice(4, 8), 10)
  if (month < 1 || month > 12)  return null
  if (day   < 1 || day   > 31)  return null
  if (year  < 1900 || year > new Date().getFullYear()) return null
  const d = new Date(year, month - 1, day)
  if (d.getMonth() !== month - 1) return null  // catches Feb 30, etc.
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Format digits "MMDDYYYY" → display "MM/DD/YYYY"
export function fmtDateDigits(d: string): string {
  if (d.length <= 2) return d
  if (d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2)
  return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4)
}

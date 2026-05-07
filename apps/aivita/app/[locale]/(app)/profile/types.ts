// Shared types for profile page — no server imports here

export type HealthProfile = {
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  heightCm?: number | null;
  weightKg?: string | null;
  smokingStatus?: string | null;
  alcoholFrequency?: string | null;
  exerciseFrequency?: string | null;
  dietType?: string | null;
  sleepSchedule?: string | null;
  stressLevel?: string | null;
  city?: string | null;
  phone?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  pinfl?: string | null;
  passportIssuedBy?: string | null;
  passportIssuedDate?: string | null;
  passportExpires?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  doctorName?: string | null;
  doctorPhone?: string | null;
  clinic?: string | null;
  insuranceCompany?: string | null;
  insuranceNumber?: string | null;
  insuranceExpires?: string | null;
  insuranceHotline?: string | null;
};

export type Allergy = {
  id: string;
  allergen: string;
  type: string;
  severity?: string;
};

export type ChronicCondition = {
  id: string;
  name: string;
  diagnosedYear?: number | null;
};

export type HistoryEntry = {
  id: string;
  name: string;
  type: string;
  startDate?: string | null;
};

export type Medication = {
  id: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
};

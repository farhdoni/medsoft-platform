import 'dotenv/config';
import { db } from './client';
import { adminUsers, clinics, doctors, patients, appointments } from './schema';

async function seed() {
  console.log('Seeding database...');

  const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL || 'farhodni@gmail.com';

  await db.insert(adminUsers).values({
    email: superadminEmail,
    fullName: 'Super Admin',
    role: 'superadmin',
    isActive: true,
  }).onConflictDoNothing();
  console.log('✓ Superadmin created');

  const [clinic] = await db.insert(clinics).values({
    name: 'Медицинский центр «Здоровье»',
    type: 'clinic',
    status: 'active',
    address: 'ул. Шахрисабз, 16',
    city: 'Ташкент',
    district: 'Мирзо-Улугбекский',
    phone: '+998712001122',
    commissionPercent: '15.00',
  }).returning().catch(() => db.select().from(clinics).limit(1));
  console.log('✓ Clinic created');

  await db.insert(doctors).values([
    {
      phone: '+998901112233',
      email: 'kamola.doc@aivita.uz',
      fullName: 'Камола Азизова',
      specialization: 'Терапевт',
      licenseNumber: 'UZ-MED-001122',
      yearsOfExperience: 12,
      clinicId: clinic.id,
      consultationPriceUzs: '150000',
      status: 'active',
      isOnline: true,
    },
    {
      phone: '+998901112244',
      email: 'sanjar.doc@aivita.uz',
      fullName: 'Санжар Назаров',
      specialization: 'Кардиолог',
      licenseNumber: 'UZ-MED-002233',
      yearsOfExperience: 18,
      clinicId: clinic.id,
      consultationPriceUzs: '250000',
      status: 'active',
      isOnline: false,
    },
  ]).onConflictDoNothing();
  console.log('✓ Doctors created');

  const [p1, p2] = await db.insert(patients).values([
    {
      phone: '+998901002030',
      email: 'aziz@example.com',
      fullName: 'Азиз Каримов',
      dateOfBirth: '1988-05-12',
      gender: 'male',
      status: 'active',
      bloodGroup: 'O_plus',
      allergies: ['пенициллин'],
      depositBalance: '1250000',
      preferredLanguage: 'uz',
      anamnesisVitaeCompleted: true,
    },
    {
      phone: '+998901002031',
      email: 'dilnoza@example.com',
      fullName: 'Дилноза Рахимова',
      dateOfBirth: '1995-09-03',
      gender: 'female',
      status: 'active',
      bloodGroup: 'A_plus',
      chronicConditions: ['астма'],
      depositBalance: '500000',
      preferredLanguage: 'ru',
      anamnesisVitaeCompleted: false,
    },
  ]).returning().catch(async () => {
    const existing = await db.select().from(patients).limit(2);
    return existing;
  });
  console.log('✓ Patients created');

  const doctorsList = await db.select().from(doctors).limit(1);
  if (doctorsList.length > 0 && p1) {
    await db.insert(appointments).values({
      patientId: p1.id,
      doctorId: doctorsList[0].id,
      clinicId: clinic.id,
      type: 'offline_clinic',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 86400000),
      durationMinutes: 30,
      priceUzs: '150000',
      patientComplaint: 'Плановый осмотр',
    }).onConflictDoNothing();
    console.log('✓ Appointment created');
  }

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });

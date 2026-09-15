import { db } from './client';
import { adminUsers, clinics, doctors, patients, appointments } from './schema/index';

async function main() {
  console.log('Seeding database...');

  const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL || 'farhodni@gmail.com';

  await db.insert(adminUsers).values({
    email: superadminEmail,
    fullName: 'Super Admin',
    role: 'superadmin',
    isActive: true,
  }).onConflictDoNothing();

  const [clinic] = await db.insert(clinics).values({
    name: 'Медицинский центр «Здоровье»',
    type: 'clinic',
    status: 'active',
    address: 'ул. Шахрисабз, 16',
    city: 'Ташкент',
    district: 'Мирзо-Улугбекский',
    phone: '+998712001122',
    commissionPercent: '15.0',
  }).returning().onConflictDoNothing();

  if (!clinic) {
    console.log('Clinic already exists, skipping doctors/appointments seed.');
    console.log('Seed complete (no-op).');
    process.exit(0);
  }

  const insertedDoctors = await db.insert(doctors).values([
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
  ]).returning().onConflictDoNothing();

  await db.insert(patients).values([
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
  ]).returning().onConflictDoNothing();

  if (insertedDoctors && insertedDoctors.length > 0) {
    const [firstPatient] = await db.select().from(patients).limit(1);
    const [firstDoctor] = insertedDoctors;

    if (firstPatient && firstDoctor) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      await db.insert(appointments).values({
        patientId: firstPatient.id,
        doctorId: firstDoctor.id,
        clinicId: clinic.id,
        type: 'offline_clinic',
        status: 'scheduled',
        scheduledAt: futureDate,
        durationMinutes: 30,
        priceUzs: '150000',
        isPaid: false,
        patientComplaint: 'Общее обследование',
      }).onConflictDoNothing();
    }
  }

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

DO $$
DECLARE
  pass_hash text := '$2a$10$7U3ldGt49a0ZEySd/UvSgu4lhvPGJQm5KGw6DystjDY8YEDGNPQX.';
  u1 uuid; u2 uuid; u3 uuid; u4 uuid; u5 uuid;
  u6 uuid; u7 uuid; u8 uuid; u9 uuid; u10 uuid;
BEGIN

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.karimov@test.com', 'Камол Каримов', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.rashidova@test.com', 'Нилуфар Рашидова', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.alimov@test.com', 'Шерзод Алимов', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.hasanova@test.com', 'Дилноза Хасанова', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.yusupov@test.com', 'Бобур Юсупов', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.toshmatov@test.com', 'Мухаммад Тошматов', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.mirzaeva@test.com', 'Зулфия Мирзаева', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.saidalieva@test.com', 'Малика Сайдалиева', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.nurmatov@test.com', 'Ойдин Нурматов', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO aivita_users (email, name, provider, role, email_verified, password_hash, onboarding_completed)
VALUES ('dr.holmatova@test.com', 'Феруза Холматова', 'email', 'doctor', NOW(), pass_hash, true)
ON CONFLICT (email) DO NOTHING;

SELECT id INTO u1  FROM aivita_users WHERE email = 'dr.karimov@test.com';
SELECT id INTO u2  FROM aivita_users WHERE email = 'dr.rashidova@test.com';
SELECT id INTO u3  FROM aivita_users WHERE email = 'dr.alimov@test.com';
SELECT id INTO u4  FROM aivita_users WHERE email = 'dr.hasanova@test.com';
SELECT id INTO u5  FROM aivita_users WHERE email = 'dr.yusupov@test.com';
SELECT id INTO u6  FROM aivita_users WHERE email = 'dr.toshmatov@test.com';
SELECT id INTO u7  FROM aivita_users WHERE email = 'dr.mirzaeva@test.com';
SELECT id INTO u8  FROM aivita_users WHERE email = 'dr.saidalieva@test.com';
SELECT id INTO u9  FROM aivita_users WHERE email = 'dr.nurmatov@test.com';
SELECT id INTO u10 FROM aivita_users WHERE email = 'dr.holmatova@test.com';

INSERT INTO doctor_profiles (
  user_id, specialization, experience_start_date, consultation_price,
  bio, clinic_name, clinic_address, city,
  rating, rating_count, total_patients,
  show_in_catalog, show_price, show_rating, is_active, verification_status,
  additional_skills, languages
) VALUES
  (u1, 'Кардиолог', '2011-05-01', 200000,
   'Кардиолог высшей категории, специалист по лечению ишемической болезни сердца, аритмий и сердечной недостаточности.',
   'Клиника «Кардио Плюс»', 'ул. Амира Темура, 15', 'Ташкент',
   4.8, 124, 430, true, true, true, true, 'verified',
   '["ЭКГ-диагностика","ЭхоКГ","Холтер","Велоэргометрия"]', '["ru","uz"]'),

  (u2, 'Терапевт', '2016-05-01', 120000,
   'Семейный врач с широким спектром диагностики. Специализируюсь на хронических заболеваниях и профилактике.',
   'МЦ «Здоровье»', 'ул. Навои, 28', 'Ташкент',
   4.7, 89, 310, true, true, true, true, 'verified',
   '["Общая терапия","Физиотерапия","УЗИ органов"]', '["ru","uz","en"]'),

  (u3, 'Невролог', '2014-05-01', 180000,
   'Невролог с 12-летним опытом. Лечение мигрени, остеохондроза, инсульта, эпилепсии.',
   'Нейро-центр', 'пр. Мустакиллик, 44', 'Ташкент',
   4.6, 67, 245, true, true, true, true, 'verified',
   '["ЭЭГ","ЭНМГ","Лечение мигрени","Ботулинотерапия"]', '["ru","uz"]'),

  (u4, 'Эндокринолог', '2018-05-01', 220000,
   'Специалист по сахарному диабету и патологии щитовидной железы. Современные методы лечения диабета 1 и 2 типа.',
   'Клиника «Эндо»', 'ул. Юнусабадская, 7', 'Ташкент',
   4.9, 156, 520, true, true, true, true, 'verified',
   '["Диабетология","Тиреодология","Инсулинотерапия"]', '["ru","uz"]'),

  (u5, 'Офтальмолог', '2006-05-01', 150000,
   'Офтальмолог с 20-летним стажем. Лечение катаракты, глаукомы, диабетической ретинопатии.',
   'Центр «Глаз»', 'ул. Бунёдкор, 12', 'Ташкент',
   4.5, 48, 190, true, true, true, true, 'verified',
   '["Лазерная коррекция","Лечение катаракты","Глаукома"]', '["ru","uz","en"]'),

  (u6, 'Стоматолог', '2019-05-01', 250000,
   'Стоматолог-терапевт и ортопед. Эстетическая стоматология, виниры, имплантация.',
   'Дентал «SmilePro»', 'ул. Шота Руставели, 3', 'Ташкент',
   4.7, 78, 280, true, true, true, true, 'verified',
   '["Виниры","Имплантация","Отбеливание"]', '["ru","uz"]'),

  (u7, 'Педиатр', '2008-05-01', 130000,
   'Детский врач с 18-летним опытом. Специализация на раннем развитии и вакцинации.',
   'Детская клиника «Малыш»', 'ул. Чиланзарская, 19', 'Ташкент',
   4.8, 203, 680, true, true, true, true, 'verified',
   '["Педиатрия","Вакцинация","Нейропедиатрия"]', '["ru","uz"]'),

  (u8, 'Гинеколог', '2012-05-01', 190000,
   'Гинеколог-акушер высшей категории. Ведение беременности, лечение ВЗОМТ, гормональная терапия.',
   'МЦ «Женское здоровье»', 'пр. Фергана, 8', 'Ташкент',
   4.6, 112, 380, true, true, true, true, 'verified',
   '["Акушерство","Кольпоскопия","УЗИ плода"]', '["ru","uz","en"]'),

  (u9, 'Уролог', '2017-05-01', 160000,
   'Уролог и андролог. Диагностика и лечение заболеваний почек, мочевого пузыря, простаты.',
   'Клиника «Уро-Мед»', 'ул. Паркентская, 22', 'Ташкент',
   4.4, 55, 185, true, true, true, true, 'verified',
   '["Андрология","Литотрипсия","Цистоскопия"]', '["ru","uz"]'),

  (u10, 'Дерматолог', '2015-05-01', 140000,
   'Дерматовенеролог. Лечение акне, псориаза, экземы. Косметология и лазерное лечение.',
   'Дерматологический центр', 'ул. Беруни, 33', 'Самарканд',
   4.7, 91, 315, true, true, true, true, 'verified',
   '["Косметология","Лазерная дерматология","Трихология"]', '["ru","uz"]')
ON CONFLICT (user_id) DO UPDATE SET
  show_in_catalog = true,
  verification_status = 'verified',
  is_active = true;

INSERT INTO doctor_schedule (doctor_id, day_of_week, start_time, end_time, break_start, break_end, slot_duration_minutes, is_active)
SELECT u.uid, d.day, '09:00', '18:00', '13:00', '14:00', 30, true
FROM (VALUES (u1),(u2),(u3),(u4),(u5),(u6),(u7),(u8),(u9),(u10)) AS u(uid)
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5)) AS d(day)
ON CONFLICT (doctor_id, day_of_week) DO NOTHING;

RAISE NOTICE 'Seed completed: 10 doctors created';
END $$;

/**
 * Word lists for needsPatientContext (context-trigger.ts). Kept in their own
 * file so the dictionaries can grow without touching the decision logic.
 *
 * SOCIAL_ONLY_PHRASES is a curated whitelist of short, purely social
 * replies with no health content — greetings, thanks, yes/no/ok. It is
 * deliberately NOT a blacklist of "non-medical words": the decision logic
 * only treats a message as skippable when it matches (a prefix of) one of
 * these phrases AND contains no MEDICAL_KEYWORDS hit, so common personal
 * pronouns ("мне", "у меня") are intentionally absent from either list —
 * on their own they're far too common in ordinary non-medical sentences to
 * use as a trigger, and any message that doesn't match the social
 * whitelist already falls through to "uncertain -> load context" by
 * default (see context-trigger.ts), which covers them safely.
 */

export type Lang = 'ru' | 'uz' | 'en';

export const SOCIAL_ONLY_PHRASES: Record<Lang, string[]> = {
  ru: [
    'привет', 'привет!', 'здравствуй', 'здравствуйте', 'добрый день', 'добрый вечер',
    'доброе утро', 'пока', 'до свидания', 'спасибо', 'спасибо!', 'благодарю',
    'пожалуйста', 'ок', 'окей', 'хорошо', 'ладно', 'да', 'нет', 'ага', 'угу',
    'понятно', 'ясно', 'отлично', 'супер', 'класс', 'хорошо, спасибо',
  ],
  uz: [
    'salom', 'салом', 'assalomu alaykum', 'ассалому алайкум', 'xayr', 'хайр',
    'rahmat', 'рахмат', 'raxmat', 'mayli', 'майли', 'xop', 'хоп', 'ha', 'ҳа',
    'yoq', 'йўқ', "yo'q", 'tushunarli', 'тушунарли', 'zor', 'зор', 'yaxshi',
    'яхши',
  ],
  en: [
    'hi', 'hello', 'hey', 'bye', 'goodbye', 'thanks', 'thank you', 'thanks!',
    'ok', 'okay', 'yes', 'no', 'got it', 'great', 'cool', 'alright', 'sounds good',
  ],
};

export const MEDICAL_KEYWORDS: Record<Lang, string[]> = {
  ru: [
    // symptoms / feeling unwell
    'болит', 'боль', 'больно', 'плохо себя чувствую', 'температура', 'жар',
    'озноб', 'тошнит', 'рвота', 'кашель', 'насморк', 'слабость',
    'кружится голова', 'головокружение', 'одышка', 'сыпь', 'зуд', 'отёк', 'отек',
    // body parts commonly paired with a complaint
    'голова', 'горло', 'живот', 'спина', 'сердце', 'грудь', 'сустав', 'мышц',
    // medications / treatment
    'лекарств', 'таблетк', 'препарат', 'дозировк', 'антибиотик', 'укол', 'капель',
    // labs / measurements
    'анализ', 'давление', 'пульс', 'сахар в крови', 'холестерин', 'узи', 'мрт',
    'рентген', 'вес', 'похуд', 'набрал вес',
    // diet / lifestyle / diagnosis
    'диет', 'питани', 'аллерг', 'хроническ', 'диагноз', 'болезн', 'заболевани',
    'врач', 'доктор', 'клиник', 'больниц', 'симптом',
  ],
  uz: [
    'огри', "og'ri", 'оғри', 'касал', 'kasal', 'harorat', 'ҳарорат',
    "yo'tal", 'йўтал', 'bosh og', 'бош огри', 'tomoq', 'томоқ', 'yurak', 'юрак',
    'qorin', 'қорин', 'dori', 'дори', 'dozirovka', 'дозировка',
    'bosim', 'босим', 'vazn', 'вазн', 'parhez', 'парҳез',
    'shifokor', 'шифокор', 'doktor', 'klinika', 'клиника', 'kasallik',
    'касаллик', 'allergiya', 'аллергия', 'tahlil', 'таҳлил',
  ],
  en: [
    'pain', 'hurts', 'hurt', 'ache', 'fever', 'chills', 'nausea', 'vomit',
    'cough', 'dizzy', 'dizziness', 'headache', 'stomach', 'throat', 'chest',
    'heart', 'back pain', 'medication', 'medicine', 'pill', 'dosage',
    'antibiotic', 'injection', 'blood pressure', 'blood sugar', 'cholesterol',
    'test result', 'lab result', 'weight', 'diet', 'allergy', 'allergic',
    'chronic', 'diagnosis', 'disease', 'symptom', 'doctor', 'clinic', 'hospital',
  ],
};

import { cookies } from 'next/headers';
import { api } from '@/lib/api-client';

export interface FamilyMember {
  id: string;
  memberName: string;
  memberRelation: string;
  memberBirthDate?: string | null;
  memberGender?: string | null;
}

export async function loadFamilyData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';

  const res = await api.family.list(sessionCookie);
  const members: FamilyMember[] =
    'data' in res ? (res.data as FamilyMember[]) : [];

  return { members };
}

/**
 * Staff API — typed calls over the backend `/staff` endpoints, mapping the
 * backend DTO (StaffBackendDTO in the Swift app) to the RN `StaffMember` model.
 *
 * Wire conversions that matter (mirroring the Swift StaffManager):
 * - workingHours: RN array (weekday 1=Sun…7=Sat, one shift) <-> backend dict
 *   keyed "0".."6" (0=Sun) of { isOpen, intervals:[{start:"HH:MM", end:"HH:MM"}] }.
 * - permissions: RN Record<string,bool> <-> versioned wrapper { version, map }
 *   (currentVersion = 2). Reads both the wrapper and a legacy bare map.
 * - lunchBreaks: same shape both sides (weekday 1=Sun…7=Sat) — pass through.
 * - assignedServiceIds: backend service ids used directly (RN stores them as-is).
 *
 * Staff-login fields (loginEmail/firebaseUid/hasSignedIn/mustChangePassword/
 * businessOwnerUid) are read into the model but never sent by the generic
 * update — app access only changes through `updateStaffAccess` (partial PUT),
 * so saving a name or colour can't accidentally rotate or revoke a login.
 * `fetchStaffMe` / `markStaffPasswordChanged` serve the staff sign-in session.
 */

import { api } from '@/lib/api-client';
import type { StaffLunchBreak, StaffMember, StaffWorkingDay } from '@/models/staff';

const PERMISSION_SCHEMA_VERSION = 2;

interface WorkingDayDTO {
  isOpen: boolean;
  intervals: { start: string; end: string }[];
}

type PermissionsWire = { version?: number; map?: Record<string, boolean> } | Record<string, boolean>;

interface StaffDTO {
  id?: string;
  name: string;
  role?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  isActive?: boolean | null;
  isOwner?: boolean | null;
  assignedServiceIds?: string[] | null;
  colorHex?: string | null;
  permissions?: PermissionsWire | null;
  lunchBreaks?: StaffLunchBreak[] | null;
  workingHours?: Record<string, WorkingDayDTO> | null;
  lastModifiedAt?: string | null;
  loginEmail?: string | null;
  firebaseUid?: string | null;
  hasSignedIn?: boolean | null;
  mustChangePassword?: boolean | null;
  businessOwnerUid?: string | null;
}

function hm(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function parseHM(s: string): [number, number] {
  const [h, m] = s.split(':');
  return [Number(h) || 0, Number(m) || 0];
}

function workingHoursToDTO(days: StaffWorkingDay[]): Record<string, WorkingDayDTO> | undefined {
  if (!days.length) return undefined;
  const out: Record<string, WorkingDayDTO> = {};
  for (const d of days) {
    out[String(d.weekday - 1)] = {
      isOpen: d.isWorkingDay,
      intervals: d.isWorkingDay ? [{ start: hm(d.startHour, d.startMinute), end: hm(d.endHour, d.endMinute) }] : [],
    };
  }
  return out;
}

function workingHoursFromDTO(dict?: Record<string, WorkingDayDTO> | null): StaffWorkingDay[] {
  if (!dict) return [];
  const out: StaffWorkingDay[] = [];
  for (const [key, day] of Object.entries(dict)) {
    const dow = parseInt(key, 10);
    if (Number.isNaN(dow)) continue;
    const iv = day.intervals?.[0];
    const [sh, sm] = iv ? parseHM(iv.start) : [9, 0];
    const [eh, em] = iv ? parseHM(iv.end) : [17, 0];
    out.push({ weekday: dow + 1, isWorkingDay: day.isOpen, startHour: sh, startMinute: sm, endHour: eh, endMinute: em });
  }
  return out.sort((a, b) => a.weekday - b.weekday);
}

function permissionsFromDTO(p?: PermissionsWire | null): Record<string, boolean> | undefined {
  if (!p || typeof p !== 'object') return undefined;
  const wrapped = p as { map?: Record<string, boolean> };
  if (wrapped.map && typeof wrapped.map === 'object') return wrapped.map;
  // Legacy bare { key: bool } map.
  return p as Record<string, boolean>;
}

function fromDTO(d: StaffDTO): StaffMember {
  return {
    id: d.id ?? '',
    name: d.name,
    role: d.role ?? '',
    phoneNumber: d.phoneNumber ?? '',
    email: d.email ?? undefined,
    isActive: d.isActive ?? true,
    isOwner: d.isOwner ?? false,
    assignedServiceIds: d.assignedServiceIds ?? [],
    colorHex: d.colorHex ?? '',
    lunchBreaks: d.lunchBreaks ?? [],
    workingHours: workingHoursFromDTO(d.workingHours),
    permissions: permissionsFromDTO(d.permissions),
    loginEmail: d.loginEmail ?? undefined,
    firebaseUid: d.firebaseUid ?? undefined,
    hasSignedIn: d.hasSignedIn ?? undefined,
    mustChangePassword: d.mustChangePassword ?? undefined,
    businessOwnerUid: d.businessOwnerUid ?? undefined,
  };
}

function toDTO(m: Omit<StaffMember, 'id'>): Omit<StaffDTO, 'loginEmail' | 'firebaseUid' | 'hasSignedIn' | 'mustChangePassword' | 'businessOwnerUid'> {
  const hasPerms = m.permissions && Object.keys(m.permissions).length > 0;
  return {
    name: m.name,
    role: m.role || undefined,
    phoneNumber: m.phoneNumber || undefined,
    email: m.email || undefined,
    isActive: m.isActive,
    isOwner: m.isOwner,
    assignedServiceIds: m.assignedServiceIds,
    colorHex: m.colorHex || undefined,
    permissions: hasPerms ? { version: PERMISSION_SCHEMA_VERSION, map: m.permissions } : undefined,
    lunchBreaks: m.lunchBreaks.length ? m.lunchBreaks : undefined,
    workingHours: workingHoursToDTO(m.workingHours),
  };
}

export async function listStaff(): Promise<StaffMember[]> {
  const dtos = await api.get<StaffDTO[]>('/staff');
  return (dtos ?? []).map(fromDTO);
}

export async function createStaff(input: Omit<StaffMember, 'id'>): Promise<StaffMember> {
  const dto = await api.post<StaffDTO>('/staff', toDTO(input));
  return fromDTO(dto);
}

export async function updateStaff(member: StaffMember): Promise<StaffMember> {
  const dto = await api.put<StaffDTO>(`/staff/${member.id}`, toDTO(member));
  return fromDTO(dto);
}

export async function deleteStaff(id: string): Promise<void> {
  await api.del(`/staff/${id}`);
}

/** What the owner can change about a member's app login (partial PUT /staff/:id). */
export interface StaffAccessUpdate {
  /** Lowercased login email; `null` revokes the login (deletes the auth user). */
  loginEmail: string | null;
  /** New temporary password — creates or rotates the login (min 8). */
  tempPassword?: string;
  /** Permission map; sent in the versioned wrapper. `{}` with a revoke. */
  permissions?: Record<string, boolean>;
}

/**
 * Create, edit, reset or revoke a staff member's app login. Errors carry the
 * server message/code (409 email-already-in-use, 400 invalid-login-email,
 * 400 weak-temp-password).
 */
export async function updateStaffAccess(id: string, update: StaffAccessUpdate): Promise<StaffMember> {
  const body: Record<string, unknown> = { loginEmail: update.loginEmail };
  if (update.tempPassword) body.tempPassword = update.tempPassword;
  if (update.permissions) {
    body.permissions =
      update.loginEmail === null ? {} : { version: PERMISSION_SCHEMA_VERSION, map: update.permissions };
  }
  const dto = await api.put<StaffDTO>(`/staff/${id}`, body);
  return fromDTO(dto);
}

/** The signed-in user's own staff record (GET /staff/me). 404 = not a staff login. */
export async function fetchStaffMe(): Promise<StaffMember> {
  const dto = await api.get<StaffDTO>('/staff/me');
  return fromDTO(dto);
}

/** Staff only: tell the backend the temporary password was replaced (204). */
export async function markStaffPasswordChanged(): Promise<void> {
  await api.post('/staff/me/password-changed');
}

/**
 * StaffMember model — port of StaffMember (StaffView.swift).
 * Photo deferred (native). assignedServiceIds links services this member performs.
 */

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  email?: string;
  isActive: boolean;
  isOwner: boolean;
  assignedServiceIds: string[];
}

/** The orange accent used throughout the Staff UI — Color(0.95, 0.6, 0.2). */
export const STAFF_ORANGE = '#F29933';

export function staffInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return '?';
}

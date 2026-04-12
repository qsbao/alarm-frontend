import type { User } from '../types';

/**
 * Seed user list for dev-mode auth (UserSwitcher + X-User-Id header).
 * Matches the backend's data.sql seed data.
 */
export const USERS: User[] = [
  // Original 8 engineers
  { id: 'user-tanaka', name: 'H. Tanaka', department: 'Litho' },
  { id: 'user-rossi', name: 'L. Rossi', department: 'Litho' },
  { id: 'user-garcia', name: 'R. Garcia', department: 'Litho' },
  { id: 'user-chen', name: 'M. Chen', department: 'Etch' },
  { id: 'user-patel', name: 'S. Patel', department: 'Etch' },
  { id: 'user-kim', name: 'A. Kim', department: 'Etch' },
  { id: 'user-muller', name: 'K. Müller', department: 'Facilities' },
  { id: 'user-smith', name: 'J. Smith', department: 'Facilities' },
  // L5 managers (one per department)
  { id: 'user-yamamoto', name: 'T. Yamamoto', department: 'Litho' },
  { id: 'user-lee', name: 'D. Lee', department: 'Etch' },
  { id: 'user-hoffman', name: 'B. Hoffman', department: 'Facilities' },
  // L4 managers (one per department)
  { id: 'user-nakamura', name: 'Y. Nakamura', department: 'Litho' },
  { id: 'user-wang', name: 'F. Wang', department: 'Etch' },
  { id: 'user-anderson', name: 'P. Anderson', department: 'Facilities' },
  // PI engineers (one per department)
  { id: 'user-sato', name: 'N. Sato', department: 'Litho' },
  { id: 'user-kumar', name: 'V. Kumar', department: 'Etch' },
  { id: 'user-fischer', name: 'E. Fischer', department: 'Facilities' },
  // Additional engineers for variety
  { id: 'user-park', name: 'C. Park', department: 'Etch' },
  // Additional engineers (batch 2)
  { id: 'user-oconnor', name: "M. O'Connor", department: 'Litho' },
  { id: 'user-silva', name: 'A. Silva', department: 'Litho' },
  { id: 'user-ito', name: 'K. Ito', department: 'Etch' },
  { id: 'user-johnson', name: 'T. Johnson', department: 'Etch' },
  { id: 'user-martinez', name: 'R. Martinez', department: 'Facilities' },
  { id: 'user-brown', name: 'D. Brown', department: 'Facilities' },
  { id: 'user-watanabe', name: 'S. Watanabe', department: 'Litho' },
  { id: 'user-zhang', name: 'L. Zhang', department: 'Etch' },
  { id: 'user-taylor', name: 'J. Taylor', department: 'Facilities' },
];

const byId = new Map(USERS.map((u) => [u.id, u]));
const byName = new Map(USERS.map((u) => [u.name, u]));

export function getUserById(id: string): User | undefined {
  return byId.get(id);
}

export function getUserByName(name: string): User | undefined {
  return byName.get(name);
}

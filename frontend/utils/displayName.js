export function displayNameFromEmail(email) {
  if (!email || typeof email !== 'string') return 'Utilisateur';
  const local = email.split('@')[0];
  if (!local) return 'Utilisateur';
  const parts = local.split(/[.\-_]/).filter(Boolean).slice(0, 2);
  const cleaned = parts.map((p) => {
    const withoutTrailingNumbers = p.replace(/\d+$/, '');
    const base = withoutTrailingNumbers || p;
    return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  });
  return cleaned.join(' ') || 'Utilisateur';
}

export function getDisplayName(user) {
  if (!user) return 'Utilisateur';
  if (user.displayName && user.displayName.trim()) return user.displayName.trim();
  if (user.email) return displayNameFromEmail(user.email);
  return 'Utilisateur';
}

export function getInitials(displayName) {
  if (!displayName || typeof displayName !== 'string') return '?';
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] || '?').toUpperCase();
}

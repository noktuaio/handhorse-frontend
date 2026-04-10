/**
 * Primeira letra do primeiro nome + primeira letra do último sobrenome.
 * Nome único: até 2 letras; vazio: "?".
 */
export function nameInitialsFromFullName(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.length >= 2 ? w.slice(0, 2).toUpperCase() : (w[0] ?? "?").toUpperCase();
  }
  const first = parts[0][0] ?? "";
  const lastWord = parts[parts.length - 1];
  const last = lastWord[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

/** Avatar sem foto: iniciais do nome; se não houver nome, 2 letras do e-mail antes do @. */
export function userAvatarInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) return nameInitialsFromFullName(name);
  const e = email?.trim();
  if (!e) return "?";
  const local = e.split("@")[0] ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return (e[0] ?? "?").toUpperCase();
}

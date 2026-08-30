export async function hashPassword(plainTextPassword: string): Promise<string> {
  return Bun.password.hash(plainTextPassword);
}

export async function verifyPassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
  return Bun.password.verify(plainTextPassword, passwordHash);
}

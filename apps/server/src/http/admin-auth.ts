// Positron — Admin Authentication Middleware

export function createAdminAuth(adminToken: string | undefined) {
  const ADMIN_TOKEN = adminToken;

  return function requireAdmin(req: { headers: Record<string, string | undefined> }, res: {
    status: (code: number) => { json: (body: Record<string, unknown>) => void };
  }, next: () => void): void {
    if (!ADMIN_TOKEN) {
      res.status(503).json({ error: 'Admin API disabled: set POSITRON_ADMIN_TOKEN in production' });
      return;
    }
    const token = req.headers['x-admin-token'] as string | undefined;
    if (token !== ADMIN_TOKEN) {
      res.status(401).json({ error: 'Invalid admin token. Set X-Admin-Token header.' });
      return;
    }
    next();
  };
}

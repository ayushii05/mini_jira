const BASE = '';

export async function api(path, { userId, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId !== undefined && userId !== null) {
    headers['x-user-id'] = String(userId);
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

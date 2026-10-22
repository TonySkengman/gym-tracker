let csrfRequest;
export function clearCsrf() { csrfRequest = null; }
async function csrf() {
  if (!csrfRequest) csrfRequest = fetch('/api/auth/csrf', { credentials: 'same-origin' })
    .then(async response => {
      if (!response.ok) throw new Error('Could not verify this request. Refresh and retry.');
      return response.json();
    }).catch(error => { csrfRequest = null; throw error; });
  return csrfRequest;
}
export async function apiFetch(url, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...options.headers };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await csrf(); headers[token.headerName] = token.token;
  }
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  if (response.status === 403) clearCsrf();
  if (response.status === 401 && !url.startsWith('/api/auth/')) {
    window.dispatchEvent(new Event('session-expired'));
  }
  return response;
}
async function request(path, input) {
  const response = await apiFetch(`/api/auth/${path}`, input === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Unable to sign in. Check your details and retry.');
  }
  if (path !== 'me') clearCsrf();
  return response.status === 204 ? null : response.json();
}
export const getCurrentUser = async () => {
  const response = await apiFetch('/api/auth/me');
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Cannot connect to your account. Check the backend and retry.');
  return response.json();
};
export const login = input => request('login', input);
export const register = input => request('register', input);
export const logout = () => request('logout', {});

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = "ship_engine_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid username or password");
  }

  const data = await response.json();

  const token = data.token || data.access_token;

  if (!token) {
    throw new Error("Token was not returned from server");
  }

  setToken(token);

  return token;
}

export async function validateToken() {
  const token = getToken();

  if (!token) return false;

  const response = await fetch(`${API_BASE_URL}/api/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.ok;
}

export async function authFetch(path, options = {}) {
  const token = getToken();

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
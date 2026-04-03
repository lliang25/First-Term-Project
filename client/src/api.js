const API = "http://localhost:3000";

export const getToken = () => localStorage.getItem("token");

const withAuth = (options = {}) => {
  const token = getToken();
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
};

export async function apiGet(path) {
  const res = await fetch(`${API}${path}`, withAuth());
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (data.error === "Invalid token") {
        localStorage.clear();
        window.location.href = "/login";
    }

  throw new Error(data.error || JSON.stringify(data));
}

  return data;
}

export async function apiPost(path, body) {
  const res = await fetch(
    `${API}${path}`,
    withAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (data.error === "Invalid token") {
        localStorage.clear();
        window.location.href = "/login";
    }

  throw new Error(data.error || JSON.stringify(data));
}

  return data;
}

export async function apiPatch(path, body) {
  const res = await fetch(
    `${API}${path}`,
    withAuth({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
  if (data.error === "Invalid token") {
    localStorage.clear();
    window.location.href = "/login";
  }

  throw new Error(data.error || JSON.stringify(data));
}

  return data;
}

export async function apiDelete(path) {
  const res = await fetch(
    `${API}${path}`,
    withAuth({ method: "DELETE" })
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (data.error === "Invalid token") {
        localStorage.clear();
        window.location.href = "/login";
    }

  throw new Error(data.error || JSON.stringify(data));
}

  return data;
}
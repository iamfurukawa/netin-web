import { apiRequest } from "../../api/client";

export type User = {
  id: string;
  email: string;
  displayName: string;
  color: string | null;
};

type UserResponse = { user: User };

export function currentUser() {
  return apiRequest<UserResponse>("/auth/me");
}

export function login(email: string, password: string) {
  return apiRequest<UserResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function register(displayName: string, email: string, password: string, color: string) {
  return apiRequest<UserResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, email, password, color: color || undefined }),
  });
}

export function logout() {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}

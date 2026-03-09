import { apiFetch } from "./api";

export type ProfileMe = {
  anon_id: string;
  username: string;
  username_suffix: string;
  bio: string;
  region?: string;
  is_region_public: boolean;
  created_at: string;
  trust_score: number;
  status_label: string;
  posts_count: number;
  comments_count: number;
  reactions_count: number;
  profile_views: number;
  primary_device_active: boolean;
  last_active_at?: string;
  recovery_key_generated: boolean;
  session_status: string;
  username_changed_at?: string;
};

export type ProfilePublic = {
  anon_id?: string;
  username: string;
  bio: string;
  region?: string;
  is_region_public: boolean;
  trust_score: number;
  status_label: string;
  posts_count: number;
  comments_count: number;
  reactions_count: number;
};

export type UsernameCheckResult = {
  available: boolean;
  message: string;
};

export type ProfileUpdatePayload = {
  username_suffix?: string;
  bio?: string;
  is_region_public?: boolean;
};

export type ProfilePost = {
  id: string;
  anon_id: string;
  username?: string;
  text: string;
  created_at: string;
  likes: number;
  dislikes: number;
  user_reaction?: string;
  deleted: boolean;
};

export async function getMyProfile() {
  return apiFetch<ProfileMe>("/profiles/me", { method: "GET" });
}

export async function updateMyProfile(payload: ProfileUpdatePayload) {
  return apiFetch<ProfileMe>("/profiles/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getPublicProfile(anonId: string) {
  return apiFetch<ProfilePublic>(`/profiles/${anonId}`, { method: "GET" });
}

export async function getProfilePosts(anonId: string) {
  return apiFetch<{ posts: ProfilePost[] }>(`/profiles/${anonId}/posts`, { method: "GET" });
}

export async function checkUsername(username: string) {
  const q = new URLSearchParams({ username });
  return apiFetch<UsernameCheckResult>(`/username/check?${q.toString()}`, { method: "GET" });
}

export async function reportProfile(targetUserAnonID: string, reason: string) {
  return apiFetch<{ ok: boolean }>("/reports/profile", {
    method: "POST",
    body: JSON.stringify({ target_user_anon_id: targetUserAnonID, reason }),
  });
}

export async function reportProfilePost(targetPostID: string, reason: string) {
  return apiFetch<{ ok: boolean }>("/reports/post", {
    method: "POST",
    body: JSON.stringify({ target_post_id: targetPostID, reason }),
  });
}

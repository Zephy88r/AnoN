import { apiFetch } from "./api";

export type ApiPost = {
    id: string;
    anon_id: string;
    text: string;
    created_at: string;
};

export type ApiPostResponse = {
    posts: ApiPost[];
};

export async function createPost(text: string) {
    return apiFetch<ApiPost>("/posts/create", {
        method: "POST",
        body: JSON.stringify({ text }),
    });
}

export async function fetchFeed() {
    return apiFetch<ApiPostResponse>("/posts/feed");
}

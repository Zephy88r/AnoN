import { apiFetch } from "./api";

export type ApiPost = {
    id: string;
    anon_id: string;
    username?: string;
    text: string;
    created_at: string;
    likes: number;
    dislikes: number;
    user_reaction?: string; // "like", "dislike", or undefined
    deleted: boolean;
};

export type ApiPostResponse = {
    posts: ApiPost[];
};

export async function createPost(text: string) {
    return apiFetch<{ post: ApiPost; posts_remaining: number }>("/posts/create", {
        method: "POST",
        body: JSON.stringify({ text }),
    });
}

export async function fetchFeed() {
    return apiFetch<ApiPostResponse>("/posts/feed");
}

export async function getRemainingPosts() {
    return apiFetch<{ remaining: number }>("/posts/remaining");
}

export async function deletePost(postId: string) {
    return apiFetch<{ status: string }>("/posts/delete", {
        method: "POST",
        body: JSON.stringify({ post_id: postId }),
    });
}

export async function likePost(postId: string) {
    return apiFetch<ApiPost>("/posts/like", {
        method: "POST",
        body: JSON.stringify({ post_id: postId }),
    });
}

export async function dislikePost(postId: string) {
    return apiFetch<ApiPost>("/posts/dislike", {
        method: "POST",
        body: JSON.stringify({ post_id: postId }),
    });
}

export type ApiComment = {
    id: string;
    post_id: string;
    anon_id: string;
    username?: string;
    text: string;
    created_at: string;
    likes: number;
    dislikes: number;
    user_reaction?: string; // "like", "dislike", or undefined
    replies_count: number;
    deleted: boolean;
};

export type ApiCommentsResponse = {
    comments: ApiComment[];
};

export async function createComment(postId: string, text: string) {
    return apiFetch<ApiComment>("/posts/comments/create", {
        method: "POST",
        body: JSON.stringify({ post_id: postId, text }),
    });
}

export async function getComments(postId: string) {
    return apiFetch<ApiCommentsResponse>(`/posts/comments?post_id=${postId}`);
}

export async function deleteComment(commentId: string) {
    return apiFetch<{ status: string }>("/posts/comments/delete", {
        method: "POST",
        body: JSON.stringify({ comment_id: commentId }),
    });
}

export async function likeComment(commentId: string) {
    return apiFetch<ApiComment>("/posts/comments/like", {
        method: "POST",
        body: JSON.stringify({ comment_id: commentId }),
    });
}

export async function dislikeComment(commentId: string) {
    return apiFetch<ApiComment>("/posts/comments/dislike", {
        method: "POST",
        body: JSON.stringify({ comment_id: commentId }),
    });
}

export type ApiCommentReply = {
    id: string;
    comment_id: string;
    anon_id: string;
    username?: string;
    text: string;
    created_at: string;
    deleted: boolean;
    likes: number;
    dislikes: number;
    user_reaction?: string;
};

export type ApiCommentRepliesResponse = {
    replies: ApiCommentReply[];
};

export async function createCommentReply(commentId: string, text: string) {
    return apiFetch<ApiCommentReply>("/posts/comments/replies/create", {
        method: "POST",
        body: JSON.stringify({ comment_id: commentId, text }),
    });
}

export async function getCommentReplies(commentId: string) {
    return apiFetch<ApiCommentRepliesResponse>(`/posts/comments/replies?comment_id=${commentId}`);
}

export async function deleteCommentReply(replyId: string) {
    return apiFetch<{ status: string }>("/posts/comments/replies/delete", {
        method: "POST",
        body: JSON.stringify({ reply_id: replyId }),
    });
}

export async function likeCommentReply(replyId: string) {
    return apiFetch<ApiCommentReply>("/posts/comments/replies/like", {
        method: "POST",
        body: JSON.stringify({ reply_id: replyId }),
    });
}

export async function dislikeCommentReply(replyId: string) {
    return apiFetch<ApiCommentReply>("/posts/comments/replies/dislike", {
        method: "POST",
        body: JSON.stringify({ reply_id: replyId }),
    });
}

// Search types
export type ApiSearchResult = {
    post: ApiPost;
    relevance_score: number;
    matched_terms?: string[];
    highlights?: string;
};

export type ApiSearchResponse = {
    results: ApiSearchResult[];
    query: string;
    total_count?: number;
    next_cursor?: string;
    hashtags?: string[];
    keywords?: string[];
};

export async function searchPosts(query: string, limit: number = 20, offset: number = 0) {
    const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
    });
    return apiFetch<ApiSearchResponse>(`/posts/search?${params}`);
}

export async function reportPost(postId: string, reason?: string) {
    return apiFetch<{ ok: boolean }>(`/posts/${postId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || "" }),
    });
}

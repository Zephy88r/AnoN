package types

type PostCreateRequest struct {
	Text string `json:"text"`
}

type PostDTO struct {
	ID           string `json:"id"`
	AnonID       string `json:"anon_id"`
	Text         string `json:"text"`
	CreatedAt    string `json:"created_at"` // ISO 8601
	Likes        int    `json:"likes"`
	Dislikes     int    `json:"dislikes"`
	UserReaction string `json:"user_reaction,omitempty"` // "like", "dislike", or ""
	Deleted      bool   `json:"deleted"`
}

type PostCreateResponse struct {
	Post           PostDTO `json:"post"`
	PostsRemaining int     `json:"posts_remaining"`
}

type PostFeedResponse struct {
	Posts []PostDTO `json:"posts"`
}

type PostReactionRequest struct {
	PostID string `json:"post_id"`
}

type PostDeleteRequest struct {
	PostID string `json:"post_id"`
}

type CommentDTO struct {
	ID           string `json:"id"`
	PostID       string `json:"post_id"`
	AnonID       string `json:"anon_id"`
	Text         string `json:"text"`
	CreatedAt    string `json:"created_at"`
	Likes        int    `json:"likes"`
	Dislikes     int    `json:"dislikes"`
	UserReaction string `json:"user_reaction,omitempty"`
	RepliesCount int    `json:"replies_count"`
	Deleted      bool   `json:"deleted"`
}

type CommentCreateRequest struct {
	PostID string `json:"post_id"`
	Text   string `json:"text"`
}

type CommentDeleteRequest struct {
	CommentID string `json:"comment_id"`
}

type CommentReactionRequest struct {
	CommentID string `json:"comment_id"`
}

type CommentReplyDTO struct {
	ID        string `json:"id"`
	CommentID string `json:"comment_id"`
	AnonID    string `json:"anon_id"`
	Text      string `json:"text"`
	CreatedAt string `json:"created_at"`
	Deleted   bool   `json:"deleted"`
}

type CommentReplyCreateRequest struct {
	CommentID string `json:"comment_id"`
	Text      string `json:"text"`
}

type CommentReplyDeleteRequest struct {
	ReplyID string `json:"reply_id"`
}

type CommentRepliesResponse struct {
	Replies []CommentReplyDTO `json:"replies"`
}

type CommentsResponse struct {
	Comments []CommentDTO `json:"comments"`
}

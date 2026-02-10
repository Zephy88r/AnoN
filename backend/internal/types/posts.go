package types

type PostCreateRequest struct {
	Text string `json:"text"`
}

type PostDTO struct {
	ID        string `json:"id"`
	AnonID    string `json:"anon_id"`
	Text      string `json:"text"`
	CreatedAt string `json:"created_at"` // ISO 8601
}

type PostFeedResponse struct {
	Posts []PostDTO `json:"posts"`
}

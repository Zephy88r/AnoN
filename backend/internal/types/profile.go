package types

type ProfileMeResponse struct {
	AnonID               string `json:"anon_id"`
	Username             string `json:"username"`
	UsernameSuffix       string `json:"username_suffix"`
	Bio                  string `json:"bio"`
	Region               string `json:"region,omitempty"`
	IsRegionPublic       bool   `json:"is_region_public"`
	CreatedAt            string `json:"created_at"`
	TrustScore           int    `json:"trust_score"`
	StatusLabel          string `json:"status_label"`
	PostsCount           int    `json:"posts_count"`
	CommentsCount        int    `json:"comments_count"`
	ReactionsCount       int    `json:"reactions_count"`
	ProfileViews         int    `json:"profile_views"`
	PrimaryDeviceActive  bool   `json:"primary_device_active"`
	LastActiveAt         string `json:"last_active_at,omitempty"`
	RecoveryKeyGenerated bool   `json:"recovery_key_generated"`
	SessionStatus        string `json:"session_status"`
	UsernameChangedAt    string `json:"username_changed_at,omitempty"`
}

type ProfilePublicResponse struct {
	AnonID         string `json:"anon_id,omitempty"`
	Username       string `json:"username"`
	Bio            string `json:"bio"`
	Region         string `json:"region,omitempty"`
	IsRegionPublic bool   `json:"is_region_public"`
	TrustScore     int    `json:"trust_score"`
	StatusLabel    string `json:"status_label"`
	PostsCount     int    `json:"posts_count"`
	CommentsCount  int    `json:"comments_count"`
	ReactionsCount int    `json:"reactions_count"`
}

type UpdateProfileRequest struct {
	UsernameSuffix *string `json:"username_suffix,omitempty"`
	Bio            *string `json:"bio,omitempty"`
	IsRegionPublic *bool   `json:"is_region_public,omitempty"`
}

type UsernameCheckResponse struct {
	Available bool   `json:"available"`
	Message   string `json:"message"`
}

type ReportProfileRequest struct {
	TargetUserAnonID string `json:"target_user_anon_id"`
	Reason           string `json:"reason"`
}

type ReportPostRequest struct {
	TargetPostID     string `json:"target_post_id"`
	TargetUserAnonID string `json:"target_user_anon_id,omitempty"`
	Reason           string `json:"reason"`
}

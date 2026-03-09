package store

import "time"

// Store is the interface all storage backends must implement.
type Store interface {
	// Link Cards
	PutCard(c *LinkCard) error
	GetCard(code string) (*LinkCard, bool)
	CardsByOwner(owner string) []*LinkCard

	// Trust Requests
	PutTrust(t *TrustRequest) error
	GetTrust(id string) (*TrustRequest, bool)
	TrustForAnon(anon string) []*TrustRequest
	TrustAccepted(a, b string) bool

	// Posts
	PutPost(p *Post)
	GetFeed(limit int) []*Post
	GetTrendingPosts(limit int, offset int) ([]PostWithStats, error)
	CanCreatePost(anonID string) bool
	GetRemainingPosts(anonID string) int
	DeletePostByUser(postID, anonID string) error
	ReactToPost(postID, anonID, reactionType string) error
	GetPostReaction(postID, anonID string) (string, bool)
	GetPost(postID string) (*Post, bool)
	GetPostsByAnonID(anonID string, limit int) []*Post
	SearchPosts(query string, hashtags []string, limit int, offset int) ([]*PostSearchResult, int, error)

	// Comments
	AddComment(comment *PostComment) error
	GetComments(postID string) []*PostComment
	GetComment(commentID string) (*PostComment, bool)
	DeleteCommentByUser(commentID, anonID string) error
	GetCommentsCount(postID string) int
	ReactToComment(commentID, anonID, reactionType string) error
	GetCommentReaction(commentID, anonID string) (string, bool)
	AddCommentReply(reply *CommentReply) error
	GetCommentReplies(commentID string) []*CommentReply
	GetReply(replyID string) (*CommentReply, bool)
	DeleteCommentReplyByUser(replyID, anonID string) error
	GetCommentRepliesCount(commentID string) int
	ReactToReply(replyID, anonID, reactionType string) error
	GetReplyReaction(replyID, anonID string) (string, bool)

	// Geo Pings
	PutGeo(ping *GeoPing)
	GetNearby(lat, lng float64, radiusKm float64) []*GeoPing

	// Admin methods
	GetAllUsers() []*UserInfo
	GetAllSessions() []*SessionInfo
	GetAllTrustRequests() []*TrustRequest
	GetAuditLogs() []AuditLog
	DeletePost(postID string) error
	LogAuditEvent(event AuditLog)
	DeleteAuditLog(id string) error
	DeleteAuditLogs(ids []string) error
	ClearAuditLogs() error
	PutSession(session SessionInfo) error

	// Device auth
	GetDevice(devicePublicID string) (*Device, error)
	GetDeviceByAnonID(anonID string) (*Device, error)
	CreateDevice(device *Device) error
	UpdateDeviceTimestamp(devicePublicID string, updatedAt time.Time) error
	CreateDeviceNonce(devicePublicID, nonce string, expiresAt time.Time) error
	ConsumeDeviceNonce(devicePublicID, nonce string, now time.Time) (bool, error)

	// Session management
	UpdateSessionActivity(token string) error
	CleanupExpiredSessions() (int, error)
	GetSessionByToken(token string) (*SessionInfo, error)
	GetSessionsByAnonID(anonID string) ([]*SessionInfo, error)
	RevokeSession(token string) error
	RevokeAllSessionsForUser(anonID string) (int, error)
	EnforceSessionLimit(anonID string, maxSessions int) error

	// User tracking and activity
	EnsureUser(anonID string, now time.Time) error
	MarkUserActive(anonID string, now time.Time) error
	MarkUserInactive(anonID string) error
	UpdateUserLastSeen(anonID string, now time.Time) error
	GetActiveUsersCount() (int, error)
	ReconcileUserActiveStatus(anonID string) error
	GetTotalUsersCount() (int, error)
	CreateUserBan(anonID, reason string, bannedBy string, now time.Time, expiresAt *time.Time, permanent bool) error
	GetActiveUserBan(anonID string, now time.Time) (*UserBan, error)

	// Post Reports
	ReportPost(postID, reportedAnonID, reporterAnonID, reason string, now time.Time) error
	GetPostReportCount(postID string) int
	GetTopReportedPostByAnon(anonID string, threshold int) *PostReport

	// Profiles
	EnsureProfileForAnon(anonID, region string, now time.Time) error
	GetProfileByAnonID(anonID string) (*UserProfile, error)
	UpdateProfile(anonID string, in ProfileUpdateInput, now time.Time) (*UserProfile, error)
	IsUsernameAvailable(username string, excludeAnonID string) (bool, error)
	IncrementProfileView(targetAnonID, viewerAnonID string) error
	GetProfileDeviceInfo(anonID string) (*ProfileDeviceInfo, error)
	ReportProfile(reporterAnonID, targetUserAnonID, reason string, now time.Time) error
	ReportPostV2(reporterAnonID, targetUserAnonID, targetPostID, reason string, now time.Time) error
	GetUserReportCount(targetAnonID string) (int, error)
}

// Admin types
type UserInfo struct {
	AnonID    string
	Username  string
	CreatedAt time.Time
	PostCount int
}

type SessionInfo struct {
	ID             string
	AnonID         string
	Token          string
	IssuedAt       time.Time
	ExpiresAt      time.Time
	CreatedAt      time.Time
	LastActivityAt time.Time
}

type UserBan struct {
	AnonID    string
	Reason    string
	BannedBy  string
	BannedAt  time.Time
	ExpiresAt *time.Time
	Permanent bool
}

type AuditLog struct {
	ID        string    `json:"id"`
	Action    string    `json:"action"`
	AnonID    string    `json:"anon_id"`
	Details   string    `json:"details"`
	Timestamp time.Time `json:"timestamp"`
}

// PostReport represents a report on a post
type PostReport struct {
	PostID         string
	ReportCount    int
	LastReportedAt time.Time
	Reason         string
}

type UserProfile struct {
	AnonID             string
	Username           string
	UsernameSuffix     string
	UsernameNormalized string
	Bio                string
	Region             string
	IsRegionPublic     bool
	CreatedAt          time.Time
	TrustScore         int
	StatusLabel        string
	PostsCount         int
	CommentsCount      int
	ReactionsCount     int
	ProfileViews       int
	UsernameChangedAt  *time.Time
}

type ProfileUpdateInput struct {
	UsernameSuffix *string
	Bio            *string
	IsRegionPublic *bool
}

type ProfileDeviceInfo struct {
	PrimaryDeviceActive  bool
	LastActiveAt         *time.Time
	RecoveryKeyGenerated bool
	SessionStatus        string
}

// PostSearchResult represents a post with search relevance information
type PostSearchResult struct {
	Post           *Post
	RelevanceScore float64
	MatchedTerms   []string
	Highlights     string
}

// PostWithStats represents a feed post with aggregated engagement metrics.
type PostWithStats struct {
	Post
	LikeCount    int
	DislikeCount int
	CommentCount int
	HotScore     float64
}

var defaultStore Store

// Initialize sets the default store. Call this once during app startup.
func Initialize(store Store) {
	defaultStore = store
}

// DefaultStore returns the global store instance.
func DefaultStore() Store {
	if defaultStore == nil {
		// Fallback to in-memory for backwards compatibility
		defaultStore = NewMemStore()
	}
	return defaultStore
}

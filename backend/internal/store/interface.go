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
	CanCreatePost(anonID string) bool
	GetRemainingPosts(anonID string) int
	DeletePostByUser(postID, anonID string) error
	ReactToPost(postID, anonID, reactionType string) error
	GetPostReaction(postID, anonID string) (string, bool)
	GetPost(postID string) (*Post, bool)

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
	DeleteCommentReplyByUser(replyID, anonID string) error
	GetCommentRepliesCount(commentID string) int

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
	PutSession(session SessionInfo) error
}

// Admin types
type UserInfo struct {
	AnonID    string
	CreatedAt time.Time
	PostCount int
}

type SessionInfo struct {
	ID        string
	AnonID    string
	Token     string
	IssuedAt  time.Time
	ExpiresAt time.Time
	CreatedAt time.Time
}

type AuditLog struct {
	ID        string
	Action    string
	AnonID    string
	Details   string
	Timestamp time.Time
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

package store

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

func (s *MemStore) EnsureProfileForAnon(anonID, region string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	device, err := s.getDeviceByAnonIDUnsafe(anonID)
	if err != nil {
		return err
	}

	if user, exists := s.users[anonID]; exists {
		if user.Username == "" {
			user.Username = device.Username
			user.UsernameSuffix = strings.TrimPrefix(strings.ToLower(device.Username), UsernamePrefix)
			user.UsernameNormalized = strings.ToLower(device.Username)
		}
		if user.Region == "" && strings.TrimSpace(region) != "" {
			user.Region = strings.TrimSpace(region)
		}
		if user.StatusLabel == "" {
			user.StatusLabel = "Clean"
		}
		return nil
	}

	nowCopy := now
	s.users[anonID] = &User{
		AnonID:             anonID,
		Username:           device.Username,
		UsernameSuffix:     strings.TrimPrefix(strings.ToLower(device.Username), UsernamePrefix),
		UsernameNormalized: strings.ToLower(device.Username),
		Bio:                "",
		Region:             strings.TrimSpace(region),
		IsRegionPublic:     false,
		TrustScore:         0,
		StatusLabel:        "Clean",
		ProfileViews:       0,
		PostsCount:         0,
		CommentsCount:      0,
		ReactionsCount:     0,
		IsActive:           true,
		LastLoginAt:        &nowCopy,
		LastSeenAt:         &nowCopy,
		CreatedAt:          device.CreatedAt,
	}
	return nil
}

func (s *MemStore) IsUsernameAvailable(username string, excludeAnonID string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.isUsernameAvailableUnsafe(username, excludeAnonID), nil
}

func (s *MemStore) recomputeProfileDerivedFieldsUnsafe(anonID string) {
	user := s.users[anonID]
	if user == nil {
		return
	}

	postsCount := 0
	for _, p := range s.posts {
		if !p.Deleted && p.AnonID == anonID {
			postsCount++
		}
	}

	commentsCount := 0
	for _, list := range s.postComments {
		for _, c := range list {
			if !c.Deleted && c.AnonID == anonID {
				commentsCount++
			}
		}
	}
	for _, list := range s.commentReplies {
		for _, r := range list {
			if !r.Deleted && r.AnonID == anonID {
				commentsCount++
			}
		}
	}

	reactionsCount := 0
	for postID, reacts := range s.postReactions {
		post, ok := s.getPostByID(postID)
		if !ok || post.Deleted || post.AnonID != anonID {
			continue
		}
		reactionsCount += len(reacts)
	}
	for commentID, reacts := range s.commentReacts {
		comment, ok := s.getCommentByIDUnsafe(commentID)
		if !ok || comment.Deleted || comment.AnonID != anonID {
			continue
		}
		reactionsCount += len(reacts)
	}
	for replyID, reacts := range s.replyReacts {
		reply, ok := s.getReplyByIDUnsafe(replyID)
		if !ok || reply.Deleted || reply.AnonID != anonID {
			continue
		}
		reactionsCount += len(reacts)
	}

	reportCount := 0
	for postID, byReporter := range s.postReports {
		post, ok := s.getPostByID(postID)
		if !ok || post.AnonID != anonID {
			continue
		}
		reportCount += len(byReporter)
	}
	for _, byReporter := range s.profileReportsByTarget[anonID] {
		if byReporter.CreatedAt.IsZero() {
			continue
		}
		reportCount++
	}

	user.PostsCount = postsCount
	user.CommentsCount = commentsCount
	user.ReactionsCount = reactionsCount
	user.StatusLabel = DeriveStatusLabel(reportCount)
}

func (s *MemStore) GetProfileByAnonID(anonID string) (*UserProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[anonID]
	if !exists {
		return nil, ErrProfileNotFound
	}
	if user.StatusLabel == "" {
		user.StatusLabel = "Clean"
	}
	s.recomputeProfileDerivedFieldsUnsafe(anonID)

	profile := &UserProfile{
		AnonID:             user.AnonID,
		Username:           user.Username,
		UsernameSuffix:     user.UsernameSuffix,
		UsernameNormalized: user.UsernameNormalized,
		Bio:                user.Bio,
		Region:             user.Region,
		IsRegionPublic:     user.IsRegionPublic,
		CreatedAt:          user.CreatedAt,
		TrustScore:         user.TrustScore,
		StatusLabel:        user.StatusLabel,
		PostsCount:         user.PostsCount,
		CommentsCount:      user.CommentsCount,
		ReactionsCount:     user.ReactionsCount,
		ProfileViews:       user.ProfileViews,
		UsernameChangedAt:  user.UsernameChangedAt,
	}
	return profile, nil
}

func (s *MemStore) UpdateProfile(anonID string, in ProfileUpdateInput, now time.Time) (*UserProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[anonID]
	if !exists {
		return nil, ErrProfileNotFound
	}

	if in.UsernameSuffix != nil {
		suffix := NormalizeUsernameSuffix(*in.UsernameSuffix)
		if suffix != user.UsernameSuffix {
			full := BuildUsernameFromSuffix(suffix)
			available := s.isUsernameAvailableUnsafe(full, anonID)
			if !available {
				return nil, ErrUsernameTaken
			}

			user.Username = full
			user.UsernameSuffix = suffix
			user.UsernameNormalized = strings.ToLower(full)
			t := now
			user.UsernameChangedAt = &t

			if device, err := s.getDeviceByAnonIDUnsafe(anonID); err == nil {
				device.Username = full
				device.UpdatedAt = now
			}
		}
	}

	if in.Bio != nil {
		user.Bio = strings.TrimSpace(*in.Bio)
	}
	if in.IsRegionPublic != nil {
		user.IsRegionPublic = *in.IsRegionPublic
	}

	s.recomputeProfileDerivedFieldsUnsafe(anonID)
	return &UserProfile{
		AnonID:             user.AnonID,
		Username:           user.Username,
		UsernameSuffix:     user.UsernameSuffix,
		UsernameNormalized: user.UsernameNormalized,
		Bio:                user.Bio,
		Region:             user.Region,
		IsRegionPublic:     user.IsRegionPublic,
		CreatedAt:          user.CreatedAt,
		TrustScore:         user.TrustScore,
		StatusLabel:        user.StatusLabel,
		PostsCount:         user.PostsCount,
		CommentsCount:      user.CommentsCount,
		ReactionsCount:     user.ReactionsCount,
		ProfileViews:       user.ProfileViews,
		UsernameChangedAt:  user.UsernameChangedAt,
	}, nil
}

func (s *MemStore) IncrementProfileView(targetAnonID, viewerAnonID string) error {
	if targetAnonID == "" || targetAnonID == viewerAnonID {
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[targetAnonID]
	if !exists {
		return ErrProfileNotFound
	}
	user.ProfileViews++
	return nil
}

func (s *MemStore) GetProfileDeviceInfo(anonID string) (*ProfileDeviceInfo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[anonID]
	if !exists {
		return nil, ErrProfileNotFound
	}

	device, err := s.getDeviceByAnonIDUnsafe(anonID)
	if err != nil {
		return nil, err
	}

	var latestActive *time.Time
	if user.LastSeenAt != nil {
		t := *user.LastSeenAt
		latestActive = &t
	}
	if latestActive == nil || device.UpdatedAt.After(*latestActive) {
		t := device.UpdatedAt
		latestActive = &t
	}

	hasActiveSession := false
	now := time.Now()
	for _, sess := range s.sessions {
		if sess.AnonID == anonID && sess.ExpiresAt.After(now) {
			hasActiveSession = true
			break
		}
	}

	status := "Idle"
	if hasActiveSession {
		status = "Active"
	}

	return &ProfileDeviceInfo{
		PrimaryDeviceActive:  hasActiveSession,
		LastActiveAt:         latestActive,
		RecoveryKeyGenerated: strings.TrimSpace(device.DeviceSecretHash) != "",
		SessionStatus:        status,
	}, nil
}

func (s *MemStore) ReportProfile(reporterAnonID, targetUserAnonID, reason string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if reporterAnonID == "" || targetUserAnonID == "" {
		return fmt.Errorf("report profile: missing anon id")
	}
	if s.profileReportsByTarget == nil {
		s.profileReportsByTarget = make(map[string]map[string]postReportMeta)
	}
	if s.profileReportsByTarget[targetUserAnonID] == nil {
		s.profileReportsByTarget[targetUserAnonID] = make(map[string]postReportMeta)
	}
	if _, exists := s.profileReportsByTarget[targetUserAnonID][reporterAnonID]; exists {
		return ErrAlreadyReported
	}
	s.profileReportsByTarget[targetUserAnonID][reporterAnonID] = postReportMeta{Reason: strings.TrimSpace(reason), CreatedAt: now}
	return nil
}

func (s *MemStore) ReportPostV2(reporterAnonID, targetUserAnonID, targetPostID, reason string, now time.Time) error {
	s.mu.RLock()
	if s.postReports != nil {
		if reporters, ok := s.postReports[targetPostID]; ok {
			if _, exists := reporters[reporterAnonID]; exists {
				s.mu.RUnlock()
				return ErrAlreadyReported
			}
		}
	}
	s.mu.RUnlock()
	return s.ReportPost(targetPostID, targetUserAnonID, reporterAnonID, reason, now)
}

func (s *MemStore) GetUserReportCount(targetAnonID string) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	count := 0
	if s.profileReportsByTarget != nil {
		count += len(s.profileReportsByTarget[targetAnonID])
	}
	for postID, byReporter := range s.postReports {
		post, ok := s.getPostByID(postID)
		if ok && post.AnonID == targetAnonID {
			count += len(byReporter)
		}
	}
	return count, nil
}

func (s *MemStore) getDeviceByAnonIDUnsafe(anonID string) (*Device, error) {
	for _, device := range s.devices {
		if device.AnonID == anonID {
			return device, nil
		}
	}
	return nil, fmt.Errorf("device not found")
}

func (s *MemStore) getCommentByIDUnsafe(commentID string) (*PostComment, bool) {
	for _, comments := range s.postComments {
		for _, comment := range comments {
			if comment.ID == commentID {
				return comment, true
			}
		}
	}
	return nil, false
}

func (s *MemStore) isUsernameAvailableUnsafe(username, excludeAnonID string) bool {
	normalized := strings.ToLower(strings.TrimSpace(username))
	for _, user := range s.users {
		if user.AnonID == excludeAnonID {
			continue
		}
		if user.UsernameNormalized == normalized || strings.ToLower(user.Username) == normalized {
			return false
		}
	}
	for _, device := range s.devices {
		if device.AnonID == excludeAnonID {
			continue
		}
		if strings.ToLower(device.Username) == normalized {
			return false
		}
	}
	return true
}

func (s *MemStore) getReplyByIDUnsafe(replyID string) (*CommentReply, bool) {
	for _, replies := range s.commentReplies {
		for _, reply := range replies {
			if reply.ID == replyID {
				return reply, true
			}
		}
	}
	return nil, false
}

func (s *MemStore) GetPostsByAnonIDSorted(anonID string) []*Post {
	posts := s.GetPostsByAnonID(anonID, 0)
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].CreatedAt.After(posts[j].CreatedAt)
	})
	return posts
}

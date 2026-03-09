package store

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

func (s *PgStore) EnsureProfileForAnon(anonID, region string, now time.Time) error {
	query := `
		INSERT INTO users (
			anon_id, is_active, last_login_at, last_seen_at, created_at,
			username, username_suffix, username_normalized, region
		)
		SELECT
			d.anon_id,
			true,
			$2,
			$2,
			d.created_at,
			d.username,
			regexp_replace(lower(d.username), '^ghost_', ''),
			lower(d.username),
			NULLIF($3, '')
		FROM devices d
		WHERE d.anon_id = $1
		ON CONFLICT (anon_id) DO UPDATE SET
			is_active = true,
			last_seen_at = EXCLUDED.last_seen_at,
			username = COALESCE(NULLIF(users.username, ''), EXCLUDED.username),
			username_suffix = COALESCE(NULLIF(users.username_suffix, ''), EXCLUDED.username_suffix),
			username_normalized = COALESCE(NULLIF(users.username_normalized, ''), EXCLUDED.username_normalized),
			region = CASE
				WHEN users.region IS NULL OR users.region = '' THEN EXCLUDED.region
				ELSE users.region
			END
	`
	res, err := s.db.Exec(query, anonID, now, strings.TrimSpace(region))
	if err != nil {
		return fmt.Errorf("ensure profile for anon: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrProfileNotFound
	}
	return nil
}

func (s *PgStore) IsUsernameAvailable(username string, excludeAnonID string) (bool, error) {
	normalized := strings.ToLower(strings.TrimSpace(username))
	query := `
		SELECT EXISTS (
			SELECT 1 FROM users WHERE username_normalized = $1 AND ($2 = '' OR anon_id <> $2)
			UNION ALL
			SELECT 1 FROM devices WHERE lower(username) = $1 AND ($2 = '' OR anon_id <> $2)
		)
	`
	var exists bool
	if err := s.db.QueryRow(query, normalized, excludeAnonID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check username availability: %w", err)
	}
	return !exists, nil
}

func (s *PgStore) refreshProfileDerivedFields(anonID string) error {
	reportCount, err := s.GetUserReportCount(anonID)
	if err != nil {
		return err
	}
	status := DeriveStatusLabel(reportCount)

	query := `
		UPDATE users
		SET
			posts_count = (
				SELECT COUNT(*) FROM posts WHERE anon_id = $1 AND deleted = false
			),
			comments_count = (
				SELECT
					(SELECT COUNT(*) FROM post_comments WHERE anon_id = $1 AND deleted = false) +
					(SELECT COUNT(*) FROM comment_replies WHERE anon_id = $1 AND deleted = false)
			),
			reactions_count = (
				SELECT
					(SELECT COUNT(*)
					 FROM post_reactions pr
					 JOIN posts p ON p.id = pr.post_id
					 WHERE p.anon_id = $1 AND p.deleted = false) +
					(SELECT COUNT(*)
					 FROM comment_reactions cr
					 JOIN post_comments pc ON pc.id = cr.comment_id
					 WHERE pc.anon_id = $1 AND pc.deleted = false) +
					(SELECT COUNT(*)
					 FROM reply_reactions rr
					 JOIN comment_replies crp ON crp.id = rr.reply_id
					 WHERE crp.anon_id = $1 AND crp.deleted = false)
			),
			status_label = $2
		WHERE anon_id = $1
	`
	_, err = s.db.Exec(query, anonID, status)
	if err != nil {
		return fmt.Errorf("refresh profile derived fields: %w", err)
	}
	return nil
}

func (s *PgStore) GetProfileByAnonID(anonID string) (*UserProfile, error) {
	if err := s.refreshProfileDerivedFields(anonID); err != nil {
		return nil, err
	}

	query := `
		SELECT
			anon_id,
			username,
			username_suffix,
			username_normalized,
			bio,
			COALESCE(region, ''),
			is_region_public,
			created_at,
			trust_score,
			status_label,
			posts_count,
			comments_count,
			reactions_count,
			profile_views,
			username_changed_at
		FROM users
		WHERE anon_id = $1
		LIMIT 1
	`
	profile := &UserProfile{}
	var usernameChangedAt sql.NullTime
	err := s.db.QueryRow(query, anonID).Scan(
		&profile.AnonID,
		&profile.Username,
		&profile.UsernameSuffix,
		&profile.UsernameNormalized,
		&profile.Bio,
		&profile.Region,
		&profile.IsRegionPublic,
		&profile.CreatedAt,
		&profile.TrustScore,
		&profile.StatusLabel,
		&profile.PostsCount,
		&profile.CommentsCount,
		&profile.ReactionsCount,
		&profile.ProfileViews,
		&usernameChangedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrProfileNotFound
		}
		return nil, fmt.Errorf("get profile by anon id: %w", err)
	}
	if usernameChangedAt.Valid {
		profile.UsernameChangedAt = &usernameChangedAt.Time
	}
	return profile, nil
}

func (s *PgStore) UpdateProfile(anonID string, in ProfileUpdateInput, now time.Time) (*UserProfile, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin profile update tx: %w", err)
	}
	defer tx.Rollback()

	var currentSuffix string
	var currentBio string
	var currentRegionPublic bool
	var changedAt sql.NullTime
	err = tx.QueryRow(`
		SELECT username_suffix, bio, is_region_public, username_changed_at
		FROM users
		WHERE anon_id = $1
		FOR UPDATE
	`, anonID).Scan(&currentSuffix, &currentBio, &currentRegionPublic, &changedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrProfileNotFound
		}
		return nil, fmt.Errorf("load current profile for update: %w", err)
	}

	newSuffix := currentSuffix
	usernameChanged := false
	if in.UsernameSuffix != nil {
		newSuffix = NormalizeUsernameSuffix(*in.UsernameSuffix)
		if newSuffix != currentSuffix {
			usernameChanged = true
		}
	}

	newBio := currentBio
	if in.Bio != nil {
		newBio = strings.TrimSpace(*in.Bio)
	}

	newRegionPublic := currentRegionPublic
	if in.IsRegionPublic != nil {
		newRegionPublic = *in.IsRegionPublic
	}

	if usernameChanged {
		fullUsername := BuildUsernameFromSuffix(newSuffix)
		normalized := strings.ToLower(fullUsername)

		if _, err := tx.Exec(`
			UPDATE users
			SET username = $2,
				username_suffix = $3,
				username_normalized = $4,
				username_changed_at = $5,
				bio = $6,
				is_region_public = $7
			WHERE anon_id = $1
		`, anonID, fullUsername, newSuffix, normalized, now, newBio, newRegionPublic); err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
				return nil, ErrUsernameTaken
			}
			return nil, fmt.Errorf("update profile username: %w", err)
		}

		if _, err := tx.Exec(`UPDATE devices SET username = $2, updated_at = $3 WHERE anon_id = $1`, anonID, fullUsername, now); err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
				return nil, ErrUsernameTaken
			}
			return nil, fmt.Errorf("sync device username: %w", err)
		}
	} else {
		if _, err := tx.Exec(`
			UPDATE users
			SET bio = $2,
				is_region_public = $3
			WHERE anon_id = $1
		`, anonID, newBio, newRegionPublic); err != nil {
			return nil, fmt.Errorf("update profile fields: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit profile update tx: %w", err)
	}

	return s.GetProfileByAnonID(anonID)
}

func (s *PgStore) IncrementProfileView(targetAnonID, viewerAnonID string) error {
	if targetAnonID == "" || targetAnonID == viewerAnonID {
		return nil
	}
	_, err := s.db.Exec(`UPDATE users SET profile_views = profile_views + 1 WHERE anon_id = $1`, targetAnonID)
	if err != nil {
		return fmt.Errorf("increment profile view: %w", err)
	}
	return nil
}

func (s *PgStore) GetProfileDeviceInfo(anonID string) (*ProfileDeviceInfo, error) {
	info := &ProfileDeviceInfo{}
	query := `
		SELECT
			EXISTS (SELECT 1 FROM sessions WHERE anon_id = $1 AND expires_at > CURRENT_TIMESTAMP) AS has_active_session,
			COALESCE(u.last_seen_at, d.updated_at) AS last_active,
			CASE WHEN d.device_secret_hash IS NOT NULL AND d.device_secret_hash != '' THEN true ELSE false END AS recovery_key_generated
		FROM users u
		LEFT JOIN devices d ON d.anon_id = u.anon_id
		WHERE u.anon_id = $1
		LIMIT 1
	`
	var lastActive sql.NullTime
	err := s.db.QueryRow(query, anonID).Scan(&info.PrimaryDeviceActive, &lastActive, &info.RecoveryKeyGenerated)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrProfileNotFound
		}
		return nil, fmt.Errorf("get profile device info: %w", err)
	}
	if lastActive.Valid {
		info.LastActiveAt = &lastActive.Time
	}
	if info.PrimaryDeviceActive {
		info.SessionStatus = "Active"
	} else {
		info.SessionStatus = "Idle"
	}
	return info, nil
}

func (s *PgStore) ReportProfile(reporterAnonID, targetUserAnonID, reason string, now time.Time) error {
	query := `
		INSERT INTO reports (reporter_anon_id, target_type, target_user_anon_id, reason, created_at)
		VALUES ($1, 'profile', $2, $3, $4)
		ON CONFLICT DO NOTHING
	`
	res, err := s.db.Exec(query, reporterAnonID, targetUserAnonID, strings.TrimSpace(reason), now)
	if err != nil {
		return fmt.Errorf("report profile: %w", err)
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return ErrAlreadyReported
	}
	return nil
}

func (s *PgStore) ReportPostV2(reporterAnonID, targetUserAnonID, targetPostID, reason string, now time.Time) error {
	query := `
		INSERT INTO reports (reporter_anon_id, target_type, target_user_anon_id, target_post_id, reason, created_at)
		VALUES ($1, 'post', $2, $3, $4, $5)
		ON CONFLICT DO NOTHING
	`
	res, err := s.db.Exec(query, reporterAnonID, targetUserAnonID, targetPostID, strings.TrimSpace(reason), now)
	if err != nil {
		return fmt.Errorf("report post v2: %w", err)
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return ErrAlreadyReported
	}
	return nil
}

func (s *PgStore) GetUserReportCount(targetAnonID string) (int, error) {
	query := `SELECT COUNT(*) FROM reports WHERE target_user_anon_id = $1`
	var count int
	if err := s.db.QueryRow(query, targetAnonID).Scan(&count); err != nil {
		return 0, fmt.Errorf("get user report count: %w", err)
	}
	return count, nil
}

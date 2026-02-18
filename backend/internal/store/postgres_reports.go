package store

import (
	"database/sql"
	"fmt"
	"time"
)

// ReportPost adds a report for a post. Returns error only on non-unique-constraint errors
func (s *PgStore) ReportPost(postID, reportedAnonID, reporterAnonID, reason string, now time.Time) error {
	query := `
		INSERT INTO post_reports (post_id, reported_anon_id, reporter_anon_id, reason, created_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (post_id, reporter_anon_id) DO NOTHING
	`
	_, err := s.db.Exec(query, postID, reportedAnonID, reporterAnonID, reason, now)
	if err != nil {
		return fmt.Errorf("report post: %w", err)
	}
	return nil
}

// GetPostReportCount returns the number of reports for a post
func (s *PgStore) GetPostReportCount(postID string) int {
	var count int
	query := `SELECT COUNT(*) FROM post_reports WHERE post_id = $1`
	err := s.db.QueryRow(query, postID).Scan(&count)
	if err != nil {
		fmt.Printf("error counting post reports: %v\n", err)
		return 0
	}
	return count
}

// GetTopReportedPostByAnon returns the most reported post by a user that meets threshold
func (s *PgStore) GetTopReportedPostByAnon(anonID string, threshold int) *PostReport {
	query := `
		SELECT pr.post_id, COUNT(*) as report_count, MAX(pr.created_at) as last_reported_at
		FROM post_reports pr
		WHERE pr.reported_anon_id = $1
		GROUP BY pr.post_id
		HAVING COUNT(*) >= $2
		ORDER BY report_count DESC, MAX(pr.created_at) DESC
		LIMIT 1
	`
	var postID string
	var reportCount int
	var lastReportedAt time.Time

	err := s.db.QueryRow(query, anonID, threshold).Scan(&postID, &reportCount, &lastReportedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		fmt.Printf("error getting top reported post: %v\n", err)
		return nil
	}

	return &PostReport{
		PostID:         postID,
		ReportCount:    reportCount,
		LastReportedAt: lastReportedAt,
	}
}

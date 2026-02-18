package store

import (
	"fmt"
	"time"
)

// SeedTestData creates dummy test posts for development/testing
func SeedTestData() {
	store := DefaultStore()

	testAnonIDs := []string{
		"test_user_001",
		"test_user_002",
		"test_user_003",
		"test_user_004",
	}

	testMessages := []string{
		"Just deployed a new feature to production! 🚀",
		"Looking for feedback on my latest project. Anyone interested in collaborating?",
		"The weather is beautiful today, perfect for coding outside ☀️",
		"This framework makes development so much easier. Highly recommend!",
	}

	now := time.Now()

	// Create test posts (skip if already exist)
	for i, anonID := range testAnonIDs {
		postID := fmt.Sprintf("post_test_%d", i)

		// Check if post already exists
		_, exists := store.GetPost(postID)
		if !exists {
			post := &Post{
				ID:        postID,
				AnonID:    anonID,
				Text:      testMessages[i],
				CreatedAt: now.Add(time.Duration(-i*15) * time.Minute),
				Likes:     0,
				Dislikes:  0,
				Deleted:   false,
			}

			store.PutPost(post)
		}

		// Create a device for this anonID if it doesn't exist
		existingDevice, _ := store.GetDeviceByAnonID(anonID)
		if existingDevice == nil {
			device := &Device{
				DevicePublicID:   fmt.Sprintf("device_%d", i),
				DeviceSecretHash: "test_hash",
				AnonID:           anonID,
				Username:         fmt.Sprintf("test_user_%03d", i),
				CreatedAt:        now,
				UpdatedAt:        now,
			}
			store.CreateDevice(device)
		}
	}

	fmt.Println("[DEBUG] Test data ready: 4 posts from different users")
}

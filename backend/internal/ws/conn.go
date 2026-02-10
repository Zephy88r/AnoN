package ws

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Conn represents one websocket connection for one anon identity.
type Conn struct {
	ws   *websocket.Conn
	anon string
	peer string

	send chan []byte

	closeOnce sync.Once
}

func NewConn(wsConn *websocket.Conn, anon, peer string) *Conn {
	return &Conn{
		ws:   wsConn,
		anon: anon,
		peer: peer,
		// small buffer to avoid blocking hub; drop if overloaded
		send: make(chan []byte, 32),
	}
}

func (c *Conn) Anon() string { return c.anon }
func (c *Conn) Peer() string { return c.peer }

// Enqueue tries to send without blocking forever.
// Returns false if message was dropped.
func (c *Conn) Enqueue(msg []byte) bool {
	select {
	case c.send <- msg:
		return true
	default:
		// buffer full => drop (dev/simple)
		return false
	}
}

func (c *Conn) Close() {
	c.closeOnce.Do(func() {
		_ = c.ws.Close()
		close(c.send)
	})
}

// WritePump owns all writes to the websocket.
func (c *Conn) WritePump() {
	// ping to keep connection alive
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	defer c.Close()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				// hub closed channel
				_ = c.ws.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			_ = c.ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.ws.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.ws.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

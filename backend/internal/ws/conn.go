package ws

import "github.com/gorilla/websocket"

type Conn struct {
	ws   *websocket.Conn
	send chan ServerMessage
	room string
	anon string
}

func NewConn(ws *websocket.Conn, room, anon string) *Conn {
	return &Conn{
		ws:   ws,
		send: make(chan ServerMessage, 16),
		room: room,
		anon: anon,
	}
}

// ✅ exported accessors
func (c *Conn) Send() <-chan ServerMessage { return c.send }
func (c *Conn) Anon() string              { return c.anon }

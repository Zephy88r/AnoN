package ws

type Hub struct {
	register   chan *Conn
	unregister chan *Conn
	rooms      map[string]map[*Conn]struct{}
}

func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Conn),
		unregister: make(chan *Conn),
		rooms:      make(map[string]map[*Conn]struct{}),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			if h.rooms[c.room] == nil {
				h.rooms[c.room] = make(map[*Conn]struct{})
			}
			h.rooms[c.room][c] = struct{}{}

		case c := <-h.unregister:
			if room := h.rooms[c.room]; room != nil {
				delete(room, c)
				if len(room) == 0 {
					delete(h.rooms, c.room)
				}
			}
		}
	}
}

// ✅ exported wrappers
func (h *Hub) Register(c *Conn)   { h.register <- c }
func (h *Hub) Unregister(c *Conn) { h.unregister <- c }

func (h *Hub) Broadcast(room string, msg ServerMessage) {
	for c := range h.rooms[room] {
		select {
		case c.send <- msg:
		default:
			close(c.send)
			delete(h.rooms[room], c)
		}
	}
}

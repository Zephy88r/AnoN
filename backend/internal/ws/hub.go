package ws

import "sync"

// Hub routes messages by anon id.
// Minimal, explicit, safe: mutex + map[anon]set(conns).
type Hub struct {
	mu    sync.RWMutex
	conns map[string]map[*Conn]struct{}
}

func NewHub() *Hub {
	return &Hub{
		conns: make(map[string]map[*Conn]struct{}),
	}
}

func (h *Hub) Register(c *Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	set, ok := h.conns[c.Anon()]
	if !ok {
		set = make(map[*Conn]struct{})
		h.conns[c.Anon()] = set
	}
	set[c] = struct{}{}
}

func (h *Hub) Unregister(c *Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	set, ok := h.conns[c.Anon()]
	if ok {
		delete(set, c)
		if len(set) == 0 {
			delete(h.conns, c.Anon())
		}
	}

	c.Close()
}

// SendTo delivers to ALL active sockets registered under anon.
// If a client is slow, messages may drop (by design for dev).
func (h *Hub) SendTo(anon string, msg []byte) {
	h.mu.RLock()
	set := h.conns[anon]
	// copy to avoid holding lock during sends
	list := make([]*Conn, 0, len(set))
	for c := range set {
		list = append(list, c)
	}
	h.mu.RUnlock()

	for _, c := range list {
		c.Enqueue(msg)
	}
}

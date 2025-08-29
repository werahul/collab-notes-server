require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const allowedOrigins = ['http://localhost:5173'];

const app = express();
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT']
}));
app.use(express.json()); 


mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collab-notes")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ Mongo error:", err));


const NoteSchema = new mongoose.Schema({
  title: String,
  content: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now }
});
const Note = mongoose.model("Note", NoteSchema);




app.post("/notes", async (req, res) => {
  try {
    const note = new Note({ title: req.body.title });
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content, updatedAt: new Date() },
      { new: true }
    );
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT'] }
});


const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join_note', ({ noteId, name }) => {
    socket.join(noteId);
    socket.data.noteId = noteId;
    socket.data.name = name;

    let set = rooms.get(noteId);
    if (!set) {
      set = new Map();
      rooms.set(noteId, set);
    }
    set.set(socket.id, name);

    io.to(noteId).emit('active_users', Array.from(set.values()));
  });

  socket.on('note_update', ({ noteId, content }) => {
    socket.to(noteId).emit('note_update', { content });
  });

  socket.on('disconnect', () => {
    const noteId = socket.data.noteId;
    if (noteId && rooms.has(noteId)) {
      const set = rooms.get(noteId);
      set.delete(socket.id);
      if (set.size === 0) {
        rooms.delete(noteId);
      } else {
        io.to(noteId).emit('active_users', Array.from(set.values()));
      }
    }
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

const express = require('express');
const router = express.Router();
const Note = require('../models/Note');


router.post('/', async (req, res) => {
try {
const { title } = req.body;
if (!title || !title.trim()) {
return res.status(400).json({ message: 'Title is required' });
}
const note = await Note.create({ title, content: '' });
return res.status(201).json(note);
} catch (err) {
console.error(err);
res.status(500).json({ message: 'Server error' });
}
});


router.get('/:id', async (req, res) => {
try {
const note = await Note.findById(req.params.id);
if (!note) return res.status(404).json({ message: 'Not found' });
res.json(note);
} catch (err) {
console.error(err);
res.status(400).json({ message: 'Invalid id' });
}
});


router.put('/:id', async (req, res) => {
try {
const { content, title } = req.body;
const update = {};
if (typeof content === 'string') update.content = content;
if (typeof title === 'string') update.title = title;
update.updatedAt = new Date(); 


const note = await Note.findByIdAndUpdate(
req.params.id,
update,
{ new: true, runValidators: true }
);


if (!note) return res.status(404).json({ message: 'Not found' });
res.json(note);
} catch (err) {
console.error(err);
res.status(400).json({ message: 'Invalid request' });
}
});


module.exports = router;
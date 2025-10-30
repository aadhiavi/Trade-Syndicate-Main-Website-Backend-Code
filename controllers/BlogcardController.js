const express = require('express');
const multer = require('multer');
const streamifier = require('streamifier');
const Blogcard = require('../models/Blogcard');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, date, summary, link, category } = req.body;

        if (!title || !summary || !link || !category) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        let imageUrl = null;

        if (req.file) {
            imageUrl = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'blogs' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
            });
        }

        const blog = new Blogcard({
            title,
            date,
            summary,
            image: imageUrl,
            link,
            category,
        });

        const savedBlog = await blog.save();
        res.status(201).json(savedBlog);

    } catch (err) {
        console.error('Error creating blog:', err);
        res.status(500).json({ error: 'Server error. Could not create blog.' });
    }
});

router.get('/', async (req, res) => {
    try {
        const blogs = await Blogcard.find().sort({ date: -1 });
        res.json(blogs);
    } catch (err) {
        console.error('Error fetching blogs:', err);
        res.status(500).json({ error: 'Server error. Could not fetch blogs.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const blog = await Blogcard.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.json(blog);
    } catch (err) {
        console.error('Error fetching blog:', err);
        res.status(500).json({ error: 'Server error. Could not fetch blog.' });
    }
});

router.get('/link/:link', async (req, res) => {
    try {
        const blog = await Blogcard.findOne({ link: req.params.link });
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.json(blog);
    } catch (err) {
        console.error('Error fetching blog by link:', err);
        res.status(500).json({ error: 'Server error. Could not fetch blog.' });
    }
});

router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { title, date, summary, link, category } = req.body;
        const updateData = { title, date, summary, link, category };

        if (req.file) {
            const imageUrl = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'blogs' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
            });
            updateData.image = imageUrl;
        }

        const blog = await Blogcard.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!blog) return res.status(404).json({ message: 'Blog not found' });

        res.json(blog);

    } catch (err) {
        console.error('Error updating blog:', err);
        res.status(500).json({ error: 'Server error. Could not update blog.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blogcard.findByIdAndDelete(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('Error deleting blog:', err);
        res.status(500).json({ error: 'Server error. Could not delete blog.' });
    }
});

module.exports = router;


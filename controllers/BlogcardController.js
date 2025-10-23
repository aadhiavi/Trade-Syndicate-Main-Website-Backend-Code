const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Blogcard = require('../models/Blogcard');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        cb(null, baseName + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, date, summary, link, category } = req.body;

        if (!title || !summary || !link || !category || !req.file) {
            return res.status(400).json({ error: 'All required fields including image must be provided.' });
        }
        const imagePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');

        const blog = new Blogcard({
            title,
            date,
            summary,
            image: imagePath,
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
        const formattedBlogs = blogs.map(blog => ({
            ...blog._doc,
            image: blog.image.startsWith('http')
                ? blog.image
                : `${req.protocol}://${req.get('host')}/${blog.image}`
        }));
        res.json(formattedBlogs);
    } catch (err) {
        console.error('Error fetching blogs:', err);
        res.status(500).json({ error: 'Server error. Could not fetch blogs.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const blog = await Blogcard.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        const formattedBlog = {
            ...blog._doc,
            image: blog.image.startsWith('http')
                ? blog.image
                : `${req.protocol}://${req.get('host')}/${blog.image}`
        };
        res.json(formattedBlog);
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
            const imagePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');
            updateData.image = imagePath;
        }

        const blog = await Blogcard.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.json(blog);
    } catch (err) {
        console.error('Error updating blog:', err);
        res.status(500).json({ error: 'Server error. Could not update blog.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blogcard.findByIdAndDelete(req.params.id);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        const imagePath = path.join(__dirname, '..', blog.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('Error deleting blog:', err);
        res.status(500).json({ error: 'Server error. Could not delete blog.' });
    }
});

module.exports = router;


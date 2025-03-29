const express = require('express');
const http = require('http');
const path = require('path');
const app = express();

// In-memory storage for feedback
const feedbackItems = new Map();
let feedbackCurrentId = 1;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
const apiRouter = express.Router();

// Get all feedback
apiRouter.get('/feedbacks', (req, res) => {
  try {
    const feedbacks = Array.from(feedbackItems.values());
    return res.json(feedbacks);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve feedback', error: error.message });
  }
});

// Get feedback by category
apiRouter.get('/feedbacks/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const feedbacks = Array.from(feedbackItems.values())
      .filter(feedback => feedback.category === category);
    return res.json(feedbacks);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve feedback by category', error: error.message });
  }
});

// Submit feedback
apiRouter.post('/feedbacks', (req, res) => {
  try {
    const { name, email, category, message } = req.body;
    
    // Basic validation
    if (!name || !email || !category || !message) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide name, email, category, and message.' 
      });
    }
    
    // Create feedback entry
    const id = feedbackCurrentId++;
    const date = new Date();
    const feedback = { id, name, email, category, message, date };
    
    // Store feedback
    feedbackItems.set(id, feedback);
    
    // Return success
    return res.status(201).json(feedback);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create feedback', error: error.message });
  }
});

// Clear all feedback
apiRouter.delete('/feedbacks', (req, res) => {
  try {
    feedbackItems.clear();
    return res.status(200).json({ message: 'All feedback cleared successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to clear feedback', error: error.message });
  }
});

// Register API routes
app.use('/api', apiRouter);

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const port = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

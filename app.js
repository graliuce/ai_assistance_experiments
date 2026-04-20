require('dotenv').config();

// --- LOADING MODULES
var express = require('express'),
    mongoose = require('mongoose'),
    body_parser = require('body-parser'),
    axios = require('axios');

// --- INSTANTIATE THE APP
var app = express();

// --- MONGOOSE SETUP
const connectionString = process.env.CONNECTION || process.env.MONGODB_URI;
mongoose.connect(connectionString);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function callback() {
    console.log('database opened');
});

var emptySchema = new mongoose.Schema({}, { strict: false });
var Entry = mongoose.model('Entry', emptySchema);

// --- STATIC MIDDLEWARE
app.use(express.static(__dirname + '/public'));
app.use(body_parser.json());

// --- VIEW LOCATION, SET UP SERVING STATIC HTML
app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.get('/', function(request, response) {
    response.render('reading_experiment.html');
});

app.get('/finish', function(request, response) {
    response.render('finish.html');
});

app.post('/experiment-data', function(request, response){
    Entry.create({
        "data":request.body
    });
    response.end();
});

// --- CHAT ENDPOINT
app.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], puzzleContext = null } = req.body;

    // Prepare the conversation for OpenAI API
    const messages = [
      {
        role: "system",
        content: (
          function(){
            const basePrompt = "You are a helpful assistant working with the user to solve a reading comprehension problem. Keep your responses concise (a few sentences max).";
            if (!puzzleContext || !puzzleContext.problem) return basePrompt;
            try {
              let systemPrompt = basePrompt + "\n\n";
              if (puzzleContext.text) {
                systemPrompt += "Here is the passage:\n" + puzzleContext.text + "\n\n";
              }
              systemPrompt += "Here is the question:\n" + puzzleContext.problem + "\n\n";
              if (puzzleContext.options && puzzleContext.options.length > 0) {
                systemPrompt += "Here are the options:\n" + puzzleContext.options.join("\n") + "\n\n";
              }
              return systemPrompt;
            } catch (e) {
              return basePrompt;
            }
          }
        )()
      },
      ...conversationHistory,
      {
        role: "user",
        content: message
      }
    ];

    // Make request to OpenAI API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-5-chat-latest",
      messages: messages,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const assistantMessage = response.data.choices[0].message.content;

    // Optional: Log chat interactions for research purposes
    console.log('Chat interaction:', {
      timestamp: new Date(),
      message: message,
      response: assistantMessage
    });

    res.json({
      success: true,
      message: assistantMessage,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: message },
        { role: "assistant", content: assistantMessage }
      ]
    });

  } catch (error) {
    console.error('Chat API error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat response'
    });
  }
});

// --- START THE SERVER
var server = app.listen(process.env.PORT, function(){
    console.log("Listening on port %d", server.address().port);
});

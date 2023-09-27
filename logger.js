const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const readline = require('readline');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const logfilename='log/access.log'

// Create a write stream in append mode
const accessLogStream = fs.createWriteStream(path.join(__dirname, logfilename), { flags: 'a' });

// Define a new token to log request body in morgan
morgan.token('body', (req) => (req.body && Object.keys(req.body).length > 0) ? JSON.stringify(req.body) : '');

// Setup the logger to log to both the file and the console in a single line including the body.
//app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body', { stream: accessLogStream }));
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms body: :body', { stream: accessLogStream }));



// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());

// Serve static files
app.use(express.static('public'));

// Setup routes
app.get('/', (req, res) => {
  res.send('GET request received!');
});

app.post('/', (req, res) => {
  res.send('POST request received!');
});

app.delete('/', (req, res) => {
  res.send('DELETE request received!');
});

app.put('/', (req, res) => {
  res.send('PUT request received!');
});

io.on('connection', (socket) => {
  console.log('New client connected');
  sendLastLines(socket);
  fs.watchFile(path.join(__dirname, logfilename), () => {
    sendLastLines(socket);
  });
});

const sendLastLines = (socket) => {
  const fileStream = fs.createReadStream(path.join(__dirname, logfilename), { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream });
  const lines = [];
  rl.on('line', (line) => {
    lines.push(line);
    if (lines.length > 50) lines.shift(); // Keep only the last 50 lines
  });
  rl.on('close', () => {
    socket.emit('update', lines.join('\n'));
  });
};

const PORT = 11000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
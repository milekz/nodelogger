const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const readline = require("readline");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const logfilename = "log/access.log";

const maxlines = 50;

// In-memory variable to store the last 50 log entries
const logEntries = [];

// Create a write stream in append mode
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, logfilename),
  { flags: "a" }
);

// Define a new token to log request body in morgan
morgan.token("body", (req) =>
  req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : ""
);

// Setup the logger to log to both the file and the console in a single line including IP, date, and body.
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms :body',
    {
      stream: {
        write: (message) => {
          // Write to the file
          accessLogStream.write(message);
          // Update the in-memory variable
          logEntries.push(message.trim());
          while (logEntries.length > maxlines) logEntries.shift();
          // Emit to all connected clients
          io.emit("update", logEntries.join("\n"));
        },
      },
    }
  )
);

// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());

// Serve static files
app.use(express.static("public"));

// Setup routes
app.get("/", (req, res) => {
  res.send("GET request received!");
});

app.post("/", (req, res) => {
  res.send("POST request received!");
});

app.delete("/", (req, res) => {
  res.send("DELETE request received!");
});

app.put("/", (req, res) => {
  res.send("PUT request received!");
});

io.on("connection", (socket) => {
  console.log("New client connected");
  // Emit the in-memory log entries to the newly connected client
  socket.emit("update", logEntries.join("\n"));
});

// Load the last maxlines log entries from the file into memory at the start
const loadLastLines = () => {
  const fileStream = fs.createReadStream(path.join(__dirname, logfilename), {
    encoding: "utf-8",
  });
  const rl = readline.createInterface({ input: fileStream });
  const lines = [];
  rl.on("line", (line) => {
    lines.push(line);
    while (lines.length > maxlines) lines.shift();
  });
  rl.on("close", () => {
    logEntries.push(...lines);
  });
};

loadLastLines();

const PORT = 11000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});

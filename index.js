// index.js
const express =  require("express")
const dotenv =  require("dotenv")
const cors =  require("cors")
const Routes =  require("./routes/agentRoute")

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use("/api/agent", Routes);

app.listen(PORT, () => console.log(`🔥  server running on port ${PORT}`));
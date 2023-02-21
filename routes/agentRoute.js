// agentRoute.js

require("dotenv").config();
const { pipeline, Transform } =require("stream");
const busboy=require("connect-busboy");
const util = require('util');
require('util.promisify').shim();
const fs=require('fs');
const readFileAsync=util.promisify(fs.readFile);

const express = require("express")
const Dialogflow = require("@google-cloud/dialogflow")
const { v4: uuid } = require("uuid")
const Path = require("path")
 
const app = express();
app.use(
    busboy({
      immediate: true,
    })
  );

app.use(express.json())
const languageCode = 'BCP-47 language code, e.g. en-US';
app.post("/text-input", async (req, res) => {
  const { message } = req.body;
  // Create a new session
   const sessionClient = new Dialogflow.SessionsClient({
    keyFilename: Path.join(__dirname, "./key.json"),
  });

  const sessionPath = sessionClient.projectAgentSessionPath(
    process.env.PROJECT_ID,
    uuid()
  );

  // The dialogflow request object
  const request = {
    session: sessionPath,
    
    queryInput: {
      text: {
        // The query to send to the dialogflow agent
        text: message,
        languageCode: languageCode,
      },
    },
  };

  // Sends data from the agent as a response
  try {
    const responses = await sessionClient.detectIntent(request);
    res.status(200).send({ data: responses });
  } catch (e) {
    console.log(e);
    res.status(422).send({ e });
  }
});
app.post("/voice-input", (req, res) => {
    const sessionClient = new Dialogflow.SessionsClient({
      keyFilename: Path.join(__dirname, "./Key.json"),
    });
    const sessionPath = sessionClient.projectAgentSessionPath(
      process.env.PROJECT_ID,
      uuid()
    );
  
    // transform into a promise
    const pump = util.promisify(pipeline);
  
    const audioRequest = {
      session: sessionPath,
      queryInput: {
        audioConfig: {
          audioEncoding: "AUDIO_ENCODING_OGG_OPUS",
          sampleRateHertz: "16000",
          languageCode: "en-US",
        },
        singleUtterance: true,
      },
    };
    
    var streamData = null;
    const detectStream = sessionClient
      .streamingDetectIntent()
      .on("error", (error) => console.log(error))
      .on("data", (data) => {
        console.log(data);
        streamData = data.queryResult    
      })
      .on("end", (data) => {
        res.status(200).send({ data : streamData.fulfillmentText })}
      ) 
    
    detectStream.write(audioRequest);
  
    try {
      req.busboy.on("file", (_, file, filename) => {
        pump(
          file,
          new Transform({
            objectMode: true,
            transform: (obj, _, next) => {
              next(null, { inputAudio: obj });
            },
          }),
          detectStream
        );
      });
    } catch (e) {
      console.log(`error  : ${e}`);
    }
  });
module.exports = app;
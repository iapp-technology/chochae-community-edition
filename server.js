/*
Chochae Community Edition - Opensource and On-Premise Thai Chatbot Building Platform
Copyright (C) 2020  iApp Technology Co., Ltd.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

    
//Standard NodeJS Libraries
require('dotenv').config()
const _ = require("lodash");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const request = require("request");

//Utils
const Log = require("./utils/log.js");
const log = new Log("server.js");

//Intent Classification Modules
const ngram_exact_match = require("./intent-classifiers/ngram_exact_match");
const naive_baye = require("./intent-classifiers/naive_baye");

//Load bot from Google Dialogflow
let { loadDialogFlowBot } = require('./load')

let context_memory = {};
let parameters_value = {};
let filling_slotfilling_intent_index = -1;

app.use(cors());
app.use(bodyParser.json());

app.set("port", process.env.PORT || 4000);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/test", async (req, res) => {
  const text = req.query.text;
  const sender = "tester";
  let matchedIntent = await intentClassification(sender, text, context_memory, bot);
  let response = selectResponses(matchedIntent, bot);
  let fullIntent = bot.intents[matchedIntent.index];
  matchedIntent.full_intent = fullIntent;
  return res.json({response, matchedIntent});
});

app.get("/response", async (req, res) => {
  let matchedIntent = await intentClassification("tester", req.query.text || "สวัสดี", context_memory, bot);
  let response = selectResponses(matchedIntent, bot);
  return res.json({response});
});

// LINE Integration 
app.post("/webhook", async (req, res) => {
  const sender = req.body.events[0].source.userId;
  const index = req.body.events.length > 1 ? 1:0;
  const text = req.body.events[index] && req.body.events[index].message && req.body.events[index].message.text;
  const replyToken = req.body.events[0].replyToken;
  const postback = req.body.events[0].postback && req.body.events[0].postback.data

  let matchedIntent = await intentClassification(sender, text, context_memory, bot);
  let response = selectResponses(matchedIntent, bot);
  sendText(sender, response !== undefined? response:['ระบบกำลังเรียนรู้ให้ดีขึ้น'], replyToken, data[0].line.channelAccessToken);
  res.sendStatus(200);
});

//Load bot
let bot = loadDialogFlowBot(process.env.DIALOGFLOW_BOT_FOLDER_PATH || "Chochae-Demo");

async function intentClassification(sender, text, context_memory, bot) {
  log.p(sender, text);
  /**
   * Convert bot -> intents and Intents Filtering (due to Context)
   */
  let intents = [];
  for (let i = 0; i < bot.intents.length; i++) {
    // Filter out intents that do not have matched context.
    // If there is input context and not exist in the context_memory
    if (bot.intents[i].contexts.length > 0 && _.intersection(Object.keys(context_memory), bot.intents[i].contexts).length == 0){
      //Do not add it into intents array
      log.p("Filter out: ", bot.intents[i].name);
      continue;
    }
    let intent = {
      index: i,
      name: bot.intents[i].name,
      usersays: []
    };

    // Dialogflow annotate parameters inside the training phase. Ignore for now.
    // Get entire sentence as the training phase
    for (let l = 0; l < bot.intents[i].usersays.length; l++) {
      let entireConversation = "";
      for (let k = 0; k < bot.intents[i].usersays[l].data.length; k++){
        entireConversation+=bot.intents[i].usersays[l].data[k].text;
      }
      intent.usersays.push(entireConversation);
    }
    intents.push(intent);
  }


  //Check if in the process of the slotfilling or not?
  if (filling_slotfilling_intent_index >=0){
    matchedIntent =  {
      name: bot.intents[filling_slotfilling_intent_index].name,
      index: filling_slotfilling_intent_index,
      score: 1.00
    };
    return matchedIntent;
  }

  //Check if context_memory is less than 0, delete it.
  for (let i in context_memory){
    if (context_memory[i]<=0){
      delete context_memory[i];
    }
  }

  
  /**
   * Intent Classification
   */
  let matchedIntent =  null;

  //Choice of Intent Classification Engine
  //matchedIntent = ngram_exact_match(sender, text, intents);
  matchedIntent = naive_baye(sender, text, intents);

  /**
   * Fallback Intent
   */
  if (!matchedIntent){
    log.p("Fallback intent:", bot.fallbackIntentIndex);
    matchedIntent = {
      name: bot.intents[bot.fallbackIntentIndex].name,
      index: bot.fallbackIntentIndex,
      score: 0.00
    };
    log.p(matchedIntent);
  }

  /**
   * Detecting slot filling
   * 
   * "parameters": [
        {
          "id": "db9aa375-235a-41f3-9287-04c850b1e585",
          "required": true,
          "dataType": "@sys.number-integer",
          "name": "Something",
          "value": "",
          "prompts": [
            {
              "lang": "th",
              "value": "This is something is enter!!"
            },
            {
              "lang": "th",
              "value": "Test please enter"
            }
          ]
        }
      ],
   * 
   */

  // TODO: Remove => let parameters_value = {};
  let parameters_match_this_time = {};
  if (bot && bot.intents && bot.intents[matchedIntent.index] && bot.intents[matchedIntent.index].responses 
    && bot.intents[matchedIntent.index].responses[0] && bot.intents[matchedIntent.index].responses[0].parameters){
    let parameters = bot.intents[matchedIntent.index].responses[0].parameters;
    for (let i=0;i<parameters.length;i++){
      let p = parameters[i];

      //If already found parameters, skip.
      if (parameters_value[p.name]){
        continue;
      }

      //Matching pattern
      let matches = null;
      if (p.dataType == "@sys.number-integer"){
        matches = text.match(/\d+/g);
      }else if (p.dataType == "@sys.any"){
        matches = text.match(/.+/g);
      }else{
        // TODO: Fill in more datatype here.
      }

      //TODO: Find the suitable index from parameters_value
      let suitableIndex = 0;
      for (let l=0;l<parameters.length;l++){
        if(parameters[l].dataType == p.dataType && parameters_match_this_time[parameters[l].name]){
          suitableIndex++;
        }
      }
      if (matches && matches[suitableIndex]){
        parameters_match_this_time[p.name] = matches[suitableIndex];
      }
    }

    log.p("Parameters match this time:")
    log.p(parameters_match_this_time);
    Object.assign(parameters_value, parameters_match_this_time);
    log.p("Parameters value:")
    log.p(parameters_value);
  
    matchedIntent.parameters = parameters_value;
  
    //Prompt back when parameters_value is not yet all fullfilled if required.
    for (let i=0;i<parameters.length;i++){
      let p = parameters[i];
      if (p.required && !parameters_value[p.name]){
        matchedIntent.slotfilling_response = p.prompts;
      }
    }
  }

  /**
   * Context Post processing
   */

  //Remove the context lifespan by one
  for (let i in context_memory){
    context_memory[i]--;
    if (context_memory[i]<=0){
      delete context_memory[i];
    }
  }


  /**
   * Apply Context_Memory
   * 
   *  "responses": [
    {
      "resetContexts": false,
      "action": "input.welcome",
      "affectedContexts": [
        {
          "name": "productSearch",
          "parameters": {},
          "lifespan": 5
        },
        {
          "name": "GreetSay",
          "parameters": {},
          "lifespan": 5
        }
      ],
   */

  //resetContexts 
  if (bot.intents[matchedIntent.index].responses[0] && bot.intents[matchedIntent.index].responses[0].resetContexts){
    context_memory = {};
  }

  //affectedContexts
  for (let l = 0; l < bot.intents[matchedIntent.index].responses[0].affectedContexts.length; l++){
    let context = bot.intents[matchedIntent.index].responses[0].affectedContexts[l];
    context_memory[context.name] = context.lifespan
  }

  matchedIntent.context_memory = context_memory;
  //Show Matched Intent
  log.p("MatchedIntent: ", matchedIntent);

  return matchedIntent;
}


// [{"type":4,"platform":"line","lang":"th",
//  "payload":{"line":{"type":"text","text":"รายการของน้องเจ๊าะเเจ๊ะมีดังนี้ค่ะ พี่ๆสามารถกดปุ่มที่อยู่ด้านล่างได้เลยค่ะ👇👌","quickReply":{"items":[{"type":"action","action":{"type":"message","label":"ค้นหาสินค้า","text":"ค้นหา"}},{"type":"action","action":{"type":"message","label":"สินค้าโปรโมชั่น","text":"โปรโมชั่น"}},{"type":"action","action":{"type":"message","label":"วิธีการสั่งซื้อ","text":"Tempura"}},{"type":"action","action":{"type":"message","label":"จองสินค้า","text":"จองสินค้า"}},{"type":"action","action":{"type":"message","label":"เช็คสถานะ","text":"เช็คสถานะ"}},{"type":"action","action":{"type":"message","label":"การชำระเงิน","text":"การชำระเงิน"}}]}}}}]
// "messages":[{"type":0,"lang":"th","speech":["สวัสดีค่ะ 🙏 น้องเจ๊าะเเจ๊ะพร้อมยินดีให้บริการค่ะ","สวัสดีค่ะ สามารถสอบถามเจ๊าะเเจ๊ะมาได้เลยนะคะ !!โปรดระบุคำถามด้วยนะ","นี่คือบอท เจ๊าะเเจ๊ะมีอะไรให้น้องช่วยไหมค่ะ","สวัสดีค่ะ เจ๊าะเเจ๊ะเป็นผู้ช่วยส่วนตัวของคุณ เชิญเลือกหัวข้อที่คุณสนใจ หรือสอบถามข้อมูลต่างๆ ที่อยากรู้ได้เลยค่ะ","สวัสดีค่ะ พี่ๆมีอะไรให้ช่วยไหมค่ะ","สวัสดีค่ะ ต้องการสอบถามเกี่ยวกับด้านใดค่ะ","เจ๊าะเเจ๊ะยินดีต้อนรับนะคะ มีอะไรให้ช่วยสอบถามมาได้เลยค่ะ","เจ๊าะเเจ๊ะ ยินดีพร้อมบริการค่ะ","เจ๊าะเเจ๊ะ พร้อมรับใช้เสมอค่ะ ส่งคำถามมาด้วย","เจ๊าะเเจ๊ะ มาเเล้วค่ะ มีอะไรถามเจ๊าะเเจ๊ะ มาเลย"]}],

function selectResponses(matchedIntent, bot) {
  let index = matchedIntent.index;
  let responses = [];
  //Slot filling
  if (matchedIntent.slotfilling_response && matchedIntent.slotfilling_response.length > 0){
    responses.push(matchedIntent.slotfilling_response[0].value);

  //Normal Response
  }else if (bot && bot.intents[index] && bot.intents[index].responses) {
    for (let l = 0; l < bot.intents[index].responses.length; l++) {
      responseObjs = bot.intents[index].responses[l].messages;
      for (let i in responseObjs){
        let responseObj = responseObjs[i];
        let bubble = []
        if (responseObj.type == 0 && responseObj.speech.length > 0){
          bubble = responseObj.speech;
        }else if (responseObj.type == 4){
          bubble = responseObj.payload.line;
        }
        if (bubble && bubble.length>0){
          responses.push(bubble);
        }
      }
    }
  }
  
  log.d("Response: ", responses);

  //Select one reponse
  let selectResponses = [];
  if (responses.length <= 0) return null;
  for(let i in responses){
    let response = responses[i];
    if (_.isArray(response)) {
      selectResponses.push(_.sample(response));
    } else {
      selectResponses.push(response);
    }
  }
 
  log.p(selectResponses);
  //Filling parameters
  for (let i in selectResponses){
    for (let l in matchedIntent.parameters){
      //TODO: Add more support here.
      if (typeof(selectResponses)=="string"){
        selectResponses[i] = selectResponses[i].replace(new RegExp("\\$"+l,'g'),matchedIntent.parameters[l]); 
      }
    }  
  }
  log.p(selectResponses);
  return selectResponses;
}

async function sendText(sender, responses, replyToken, client_token) {
  for (let i = 0; i < responses.length; i++) {
    let response = responses[i];
    let data = {
      to: sender,
      messages: [
        !response.type? {
          text : response.substr(0, 2000),
          type : 'text'
        } : response
      ],
      replyToken: replyToken,
    };
    await doRequest(data, client_token)
  }
}

function doRequest(data, client_token) {
  return new Promise(function (resolve, reject) {
    request({
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + client_token
      },
      url: "https://api.line.me/v2/bot/message/push",
      method: "POST",
      body: data,
      json: true
    },
      function(err, res, body) {
        if (err) log.p("error");
        if (res) log.p("success");
        if (body) log.p(body);
        resolve(body)
      }
    );
  });
}

app.get("/", function(req, res) {
  res.send("Chochae Community Edition - Version 0.02");
});

app.listen(app.get("port"), function() {
  log.p("Run at port", app.get("port"));
});

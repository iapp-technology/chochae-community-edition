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

// Default Value
const PORT = 4000;

// Standard NodeJS Libraries
require('dotenv').config();
import HttpStatusCode from './utils/httpStatusCode';
import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import request from 'request';
const app = express();

// Utils
import Log from './utils/log';
const log = new Log('server.ts');
import { Bot } from './types';

// Load bot from Google Dialogflow
import { loadDialogFlowBot } from './load';

// Engines
import intentClassiferEngine from './engines/intentClassification/intentClassifier';
import responseSelector from './engines/responseSelection/responseSelector';

const CONTEXT_MEMORY = {};
const MAXIMUM_LINE_BUBBLE_LENTH = 2000;

/**
 * Initial Engines
 */

// Load bot
const bot:Bot = loadDialogFlowBot(
  process.env.DIALOGFLOW_BOT_FOLDER_PATH || 'Chochae-Demo',
);

log.d('Kobkrit');
log.d('Bot', bot);

// Init Intent Classficiation
const intentClassifier = new intentClassiferEngine(bot, CONTEXT_MEMORY);

app.use(cors());
app.use(bodyParser.json());

app.set('port', process.env.PORT || PORT);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/test', async (req, res) => {
  const text = req.query.text;
  const sender = 'tester';
  const intent = await intentClassifier.classify(sender, text);
  const response = responseSelector(bot, intent);
  const fullIntent = bot.intents[intent!.index];
  intent!.fullIntent = fullIntent;
  return res.json({ response, matchedIntent: intent });
});

app.get('/response', async (req, res) => {
  const intent = await intentClassifier.classify(
    'tester',
    req.query.text || 'สวัสดี');
  const response = responseSelector(bot, intent);
  return res.json({ response });
});

/**
 * LINE Integration
 */
app.post('/webhook', async (req, res) => {
  const textIndex = req.body.events.length > 1 ? 1 : 0;
  const textEvent = req.body.events[textIndex];
  const senderEvent = req.body.events[0];
  const sender = senderEvent.source.userId;

  const text = textEvent && textEvent.message && textEvent.message.text;
  const replyToken = senderEvent.replyToken;
  // const postback = senderEvent.postback && senderEvent.postback.data;

  const intent = await intentClassifier.classify(sender, text);
  const response = responseSelector(bot, intent);

  sendText(
    sender,
    response ? response : <object[]><unknown>['ระบบกำลังเรียนรู้ให้ดีขึ้น'],
    replyToken,
    process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  );
  res.sendStatus(HttpStatusCode.OK);
});

async function sendText(
  sender: string, responses: any[], replyToken:string, clientToken:string) {
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    const data: object = {
      to: sender,
      messages: [
        !response.type
          ? {
            text: (<string><unknown>response).substr(0, MAXIMUM_LINE_BUBBLE_LENTH),
            type: 'text',
          }
          : response,
      ],
      replyToken,
    };
    await doRequest(data, clientToken);
  }
}

function doRequest(data:object, clientToken:string) {
  return new Promise((resolve, reject) => {
    request(
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + clientToken,
        },
        url: 'https://api.line.me/v2/bot/message/push',
        method: 'POST',
        body: data,
        json: true,
      },
      (err, res, body) => {
        if (err) log.p('error');
        if (res) log.p('success');
        if (body) log.p(body);
        resolve(body);
      },
    );
  });
}

app.get('/', (req, res) => {
  res.send('Chochae Community Edition - Version 0.02');
});

app.listen(app.get('port'), () => {
  log.p('Run at port', app.get('port'));
});

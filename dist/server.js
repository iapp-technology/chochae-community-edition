"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Default Value
const PORT = 4000;
// Standard NodeJS Libraries
require('dotenv').config();
const httpStatusCode_1 = __importDefault(require("./utils/httpStatusCode"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const request_1 = __importDefault(require("request"));
const app = express_1.default();
// Utils
const log_1 = __importDefault(require("./utils/log"));
const log = new log_1.default('server.ts');
// Load bot from Google Dialogflow
const load_1 = require("./load");
// Engines
const intentClassifier_1 = __importDefault(require("./engines/intentClassification/intentClassifier"));
const responseSelector_1 = __importDefault(require("./engines/responseSelection/responseSelector"));
const CONTEXT_MEMORY = {};
const MAXIMUM_LINE_BUBBLE_LENTH = 2000;
/**
 * Initial Engines
 */
// Load bot
const bot = load_1.loadDialogFlowBot(process.env.DIALOGFLOW_BOT_FOLDER_PATH || 'Chochae-Demo');
log.d('Kobkrit');
log.d('Bot', bot);
// Init Intent Classficiation
const intentClassifier = new intentClassifier_1.default(bot, CONTEXT_MEMORY);
app.use(cors_1.default());
app.use(body_parser_1.default.json());
app.set('port', process.env.PORT || PORT);
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.get('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const text = req.query.text;
    const sender = 'tester';
    const intent = yield intentClassifier.classify(sender, text);
    const response = responseSelector_1.default(bot, intent);
    const fullIntent = bot.intents[intent.index];
    intent.fullIntent = fullIntent;
    return res.json({ response, matchedIntent: intent });
}));
app.get('/response', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const intent = yield intentClassifier.classify('tester', req.query.text || 'สวัสดี');
    const response = responseSelector_1.default(bot, intent);
    return res.json({ response });
}));
/**
 * LINE Integration
 */
app.post('/webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const textIndex = req.body.events.length > 1 ? 1 : 0;
    const textEvent = req.body.events[textIndex];
    const senderEvent = req.body.events[0];
    const sender = senderEvent.source.userId;
    const text = textEvent && textEvent.message && textEvent.message.text;
    const replyToken = senderEvent.replyToken;
    // const postback = senderEvent.postback && senderEvent.postback.data;
    const intent = yield intentClassifier.classify(sender, text);
    const response = responseSelector_1.default(bot, intent);
    sendText(sender, response ? response : ['ระบบกำลังเรียนรู้ให้ดีขึ้น'], replyToken, process.env.LINE_CHANNEL_ACCESS_TOKEN || '');
    res.sendStatus(httpStatusCode_1.default.OK);
}));
function sendText(sender, responses, replyToken, clientToken) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            const data = {
                to: sender,
                messages: [
                    !response.type
                        ? {
                            text: response.substr(0, MAXIMUM_LINE_BUBBLE_LENTH),
                            type: 'text',
                        }
                        : response,
                ],
                replyToken,
            };
            yield doRequest(data, clientToken);
        }
    });
}
function doRequest(data, clientToken) {
    return new Promise((resolve, reject) => {
        request_1.default({
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + clientToken,
            },
            url: 'https://api.line.me/v2/bot/message/push',
            method: 'POST',
            body: data,
            json: true,
        }, (err, res, body) => {
            if (err)
                log.p('error');
            if (res)
                log.p('success');
            if (body)
                log.p(body);
            resolve(body);
        });
    });
}
app.get('/', (req, res) => {
    res.send('Chochae Community Edition - Version 0.02');
});
app.listen(app.get('port'), () => {
    log.p('Run at port', app.get('port'));
});
//# sourceMappingURL=server.js.map
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const log_1 = __importDefault(require("../../utils/log"));
const log = new log_1.default('intentClassifier.ts');
const DIALOGFLOW_RESPONSE_TYPE_TEXT = 0;
const DIALOGFLOW_RESPONSE_TYPE_PAYLOAD = 4;
/**
 * responseSelector
 * @param matchedIntent
 * @param bot
 * Example Payload
 * [{"type":4,"platform":"line","lang":"th",
 *  "payload":{"line":{"type":"text","text":"รายการของน้องเจ๊าะเเจ๊ะมีดังนี้ค่ะ
 *  พี่ๆสามารถกดปุ่มที่อยู่ด้านล่างได้เลยค่ะ👇👌","quickReply":{"items":
 * [{"type":"action","action":{"type":"message","label":"ค้นหาสินค้า","text":"ค้นหา"}},
 * {"type":"action","action":{"type":"message","label":"สินค้าโปรโมชั่น","text":"โปรโมชั่น"}},
 * {"type":"action","action":{"type":"message","label":"วิธีการสั่งซื้อ","text":"Tempura"}},
 * {"type":"action","action":{"type":"message","label":"จองสินค้า","text":"จองสินค้า"}},
 * {"type":"action","action":{"type":"message","label":"เช็คสถานะ","text":"เช็คสถานะ"}},
 * {"type":"action","action":{"type":"message","label":"การชำระเงิน","text":"การชำระเงิน"}}]}}}}]
 * "messages":[{"type":0,"lang":"th","speech":["สวัสดีค่ะ 🙏 น้องเจ๊าะเเจ๊ะพร้อมยินดีให้บริการค่ะ",
 * "สวัสดีค่ะ สามารถสอบถามเจ๊าะเเจ๊ะมาได้เลยนะคะ !!โปรดระบุคำถามด้วยนะ",
 * "นี่คือบอท เจ๊าะเเจ๊ะมีอะไรให้น้องช่วยไหมค่ะ",
 * "สวัสดีค่ะ เจ๊าะเเจ๊ะเป็นผู้ช่วยส่วนตัวของคุณ เชิญเลือกหัวข้อที่คุณสนใจ
 *  หรือสอบถามข้อมูลต่างๆ ที่อยากรู้ได้เลยค่ะ",
 * "สวัสดีค่ะ พี่ๆมีอะไรให้ช่วยไหมค่ะ","สวัสดีค่ะ ต้องการสอบถามเกี่ยวกับด้านใดค่ะ",
 * "เจ๊าะเเจ๊ะยินดีต้อนรับนะคะ มีอะไรให้ช่วยสอบถามมาได้เลยค่ะ","เจ๊าะเเจ๊ะ ยินดีพร้อมบริการค่ะ",
 * "เจ๊าะเเจ๊ะ พร้อมรับใช้เสมอค่ะ ส่งคำถามมาด้วย","เจ๊าะเเจ๊ะ
 *  มาเเล้วค่ะ มีอะไรถามเจ๊าะเเจ๊ะ มาเลย"]}],
 */
function responseSelector(bot, matchedIntent) {
    const index = matchedIntent.index;
    const responses = [];
    if (matchedIntent.slotFillingResponse &&
        matchedIntent.slotFillingResponse.length > 0) {
        // Slot filling
        responses.push(matchedIntent.slotFillingResponse[0].value);
    }
    else if (bot &&
        bot.intents[index] &&
        bot.intents[index].responses) {
        // Normal Responses
        for (let l = 0; l < bot.intents[index].responses.length; l++) {
            const responseObjs = bot.intents[index].responses[l].messages;
            for (const i in responseObjs) {
                if (responseObjs.hasOwnProperty(i)) {
                    const responseObj = responseObjs[i];
                    let bubble = [];
                    if (responseObj.type === DIALOGFLOW_RESPONSE_TYPE_TEXT &&
                        responseObj.speech.length > 0) {
                        bubble = responseObj.speech;
                    }
                    else if (responseObj.type === DIALOGFLOW_RESPONSE_TYPE_PAYLOAD) {
                        bubble = responseObj.payload.line;
                    }
                    if (bubble && bubble.length > 0) {
                        responses.push(bubble);
                    }
                }
            }
        }
    }
    log.d('Response: ', responses);
    // Select one reponse
    const sResponses = [];
    if (responses.length <= 0)
        return null;
    for (const i in responses) {
        if (responses.hasOwnProperty(i)) {
            const response = responses[i];
            if (lodash_1.default.isArray(response)) {
                sResponses.push(lodash_1.default.sample(response));
            }
            else {
                sResponses.push(response);
            }
        }
    }
    log.p(sResponses);
    // Filling parameters
    for (const i in sResponses) {
        if (sResponses.hasOwnProperty(i)) {
            for (const l in matchedIntent.parameters) {
                if (matchedIntent.parameters.hasOwnProperty(l)) {
                    // TODO: Add more support here.
                    if (typeof sResponses !== 'string') {
                        sResponses[i] = (sResponses[i].replace(new RegExp('\\$' + l, 'g'), matchedIntent.parameters[l]));
                    }
                }
            }
        }
    }
    log.p(sResponses);
    return sResponses;
}
exports.default = responseSelector;
//# sourceMappingURL=responseSelector.js.map
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("./utils/log"));
const log = new log_1.default('load.ts');
const fs_1 = __importDefault(require("fs"));
function loadDialogFlowBot(dialogflowFolderPath) {
    // Processing Intents
    const bot = {
        fallbackIntentIndex: -1,
        intents: [],
        entities: {},
    };
    const intentsPath = dialogflowFolderPath + '/intents';
    const entitiesPath = dialogflowFolderPath + '/entities';
    // Load Intent into Bot
    if (!fs_1.default.existsSync(intentsPath)) {
        log.f('Intents folder inside the bot folder is not found!');
        process.exit();
    }
    let filenames = fs_1.default.readdirSync(intentsPath);
    filenames.forEach((filename) => {
        try {
            log.p(filename);
            // If not the "Usersays" files
            if (!filename.match(/\_usersays_[a-zA-Z]{2}\.json/)) {
                log.p('Process:', filename);
                const intentBody = JSON.parse(fs_1.default.readFileSync(intentsPath + '/' + filename).toString());
                const intentUsersayOnlyFilename = filename.split('.')[0];
                const intentUsersayPath = intentsPath + '/' + intentUsersayOnlyFilename + '_usersays_th.json';
                let intentUsersay = [];
                if (fs_1.default.existsSync(intentUsersayPath)) {
                    intentUsersay = JSON.parse(fs_1.default.readFileSync(intentUsersayPath).toString());
                }
                log.p('intentBody', intentBody);
                log.p('intentUsersay', intentUsersay);
                intentBody.usersays = intentUsersay;
                // Check if it is a fallback intent: Assume only one fallback intent exist.
                if (intentBody.fallbackIntent) {
                    bot.fallbackIntentIndex = bot.intents.length;
                }
                bot.intents.push(intentBody);
            }
        }
        catch (e) {
            log.p('Can not load', filename);
        }
    });
    // Load Intent into Bot
    if (!fs_1.default.existsSync(entitiesPath)) {
        log.f('Entities folder inside the bot folder is not found!');
    }
    else {
        // Load Entities into Bot
        filenames = fs_1.default.readdirSync(entitiesPath);
        filenames.forEach((filename) => {
            try {
                log.p(filename);
                // If not the "Entries" files
                if (!filename.match(/\_entries_[a-zA-Z]{2}\.json/)) {
                    log.p('Process:', filename);
                    const entitlesEntriesOnlyFilename = filename.split('.')[0];
                    const entitlesEntriesPath = entitiesPath +
                        '/' +
                        entitlesEntriesOnlyFilename +
                        '_entries_th.json';
                    if (fs_1.default.existsSync(entitlesEntriesPath)) {
                        const entries = JSON.parse(fs_1.default.readFileSync(entitlesEntriesPath).toString());
                        bot.entities[entitlesEntriesOnlyFilename] = entries;
                    }
                }
            }
            catch (e) {
                log.f('Error: ' + e);
            }
        });
    }
    // Write the bot file for debugging
    fs_1.default.writeFileSync('bot.json', JSON.stringify(bot));
    return bot;
}
exports.loadDialogFlowBot = loadDialogFlowBot;
//# sourceMappingURL=load.js.map
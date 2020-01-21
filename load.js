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



const Log = require("./utils/log.js");
const log = new Log("load.js");
const fs = require("fs");

function loadDialogFlowBot(dialogflowFolderPath) {
  //Processing Intents
  let bot = {
    fallbackIntentIndex: -1,
    intents: [],
    entities: {}
  };
  let intentsPath = dialogflowFolderPath + "/intents";
  let entitiesPath = dialogflowFolderPath + "/entities";

  //Load Intent into Bot
  if (!fs.existsSync(intentsPath)) {
    log.f("Intents folder inside the bot folder is not found!");
    process.exit();
  }

  filenames = fs.readdirSync(intentsPath);
  filenames.forEach(function(filename) {
    try {
      log.p(filename);
      //If not the "Usersays" files
      if (!filename.match(/\_usersays_[a-zA-Z]{2}\.json/)) {
        log.p("Process:", filename);
        let intentBody = JSON.parse(
          fs.readFileSync(intentsPath + "/" + filename).toString()
        );

        let intentUsersay_onlyFilename = filename.split(".")[0];
        let intentUsersayPath =
          intentsPath + "/" + intentUsersay_onlyFilename + "_usersays_th.json";

        let intentUsersay = [];
        if (fs.existsSync(intentUsersayPath)) {
          intentUsersay = JSON.parse(
            fs.readFileSync(intentUsersayPath).toString()
          );
        }
        log.p("intentBody", intentBody);
        log.p("intentUsersay", intentUsersay);

        intentBody.usersays = intentUsersay;

        //Check if it is a fallback intent: Assume only one fallback intent exist.
        if (intentBody.fallbackIntent) {
          bot.fallbackIntentIndex = bot.intents.length;
        }
        bot.intents.push(intentBody);
      }
    } catch (e) {
      log.p("Can not load", filename);
    }
  });

  //Load Intent into Bot
  if (!fs.existsSync(entitiesPath)) {
    log.f("Entities folder inside the bot folder is not found!");
  } else {
    //Load Entities into Bot
    filenames = fs.readdirSync(entitiesPath);
    filenames.forEach(function(filename) {
      try {
        log.p(filename);
        //If not the "Entries" files
        if (!filename.match(/\_entries_[a-zA-Z]{2}\.json/)) {
          log.p("Process:", filename);

          let entitlesEntries_onlyFilename = filename.split(".")[0];
          let entitlesEntriesPath =
            entitiesPath +
            "/" +
            entitlesEntries_onlyFilename +
            "_entries_th.json";
          if (fs.existsSync(entitlesEntriesPath)) {
            entries = JSON.parse(
              fs.readFileSync(entitlesEntriesPath).toString()
            );
          }
          bot.entities[entitlesEntries_onlyFilename] = entries;
        }
      } catch (e) {}
    });
  }
  // Write the bot file for debugging
  fs.writeFileSync("bot.json", JSON.stringify(bot));

  return bot;
}

module.exports = {
  loadDialogFlowBot
};

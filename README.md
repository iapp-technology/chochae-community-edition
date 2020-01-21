# Chochae Community Edition
## Opensource and On-Premise Thai Chatbot Engine

### Feature
* Intent Classification
* Text and Payload Responses
* Context
* Action and Parameter (Slot filling)
* Fallback Intent
* REST API
* Import Bot from Google Dialogflow!

### Supported Channel
* LINE

### Installation
1. Node 9.0+ installed (https://nodejs.org/en/download/)
2. ```git clone https://github.com/iapp-technology/chochae-community-edition.git```
3. Export your bot from Google dialogflow (Gear > Export and Import > Export as ZIP)
4. Unzip your bot into chochae-community-edition folder.
5. Copy sample .env file from .env.sample ``mv .env.sample .env``
6. Open ``.env`` file and enter your unzipped bot folder path e.g., ``DIALOGFLOW_BOT_FOLDER_PATH=./Chochae-Demo``
7. Run ``npm install`` for install required dependencies.
8. Run ``npm run start`` for start up the server at PORT 4000.

### Usage
1. Query to ``http://localhost:4000/test?text=ทดสอบ`` for getting matched intents and response.
2. Query to ``http://localhost:4000/response?text=ทดสอบ`` for getting only response.
3. (LINE) Set LINE webhook via ngrok (https://ngrok.com/) or your web server (Nginx, Apache2) to POST request ``http://localhost:4000/webhook``

FROM node:9

MAINTAINER Kobkrit Viriyayudhakorn (kobkrit@iapp.co.th)

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app/
RUN npm install

CMD [ "npm", "start" ]

EXPOSE 4000

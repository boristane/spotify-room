FROM node:12
RUN apt update

WORKDIR /var/rooom
COPY package*.json /var/rooom/
RUN npm i

COPY . /var/rooom

CMD bash -c "/var/rooom/run.sh"
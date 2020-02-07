FROM alpine:latest

# Basic Linux modules
RUN apk update && apk add git && apk add make && apk add build-base && rm -rf /var/cache/apk/*

# Install latest Node.js
RUN apk add --update nodejs nodejs-npm

# Install latest python
# This hack is widely applied to avoid python printing issues in docker containers.
# See: https://github.com/Docker-Hub-frolvlad/docker-alpine-python3/pull/13
ENV PYTHONUNBUFFERED=1
RUN echo "**** install Python ****" && \
    apk add --no-cache python3 && \
    if [ ! -e /usr/bin/python ]; then ln -sf python3 /usr/bin/python ; fi && \
    \
    echo "**** install pip ****" && \
    python3 -m ensurepip && \
    rm -r /usr/lib/python*/ensurepip && \
    pip3 install --no-cache --upgrade pip setuptools wheel && \
    if [ ! -e /usr/bin/pip ]; then ln -s pip3 /usr/bin/pip ; fi

# Project files
WORKDIR /applications/hyperledger-chaincode-installer
COPY package.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY src ./
RUN mkdir packages
RUN mkdir networks
RUN mkdir chaincodes
RUN npm cache clean --force
RUN npm install
RUN npm install @nestjs/cli -g
RUN npm run build

# Environment variables
ENV GOPATH=/applications/hyperledger-chaincode-installer

# Project networking
EXPOSE 3000

# Project executable
CMD ["node", "dist/main"]

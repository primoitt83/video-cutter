FROM arm32v7/ubuntu:focal

ENV DEBIAN_FRONTEND=noninteractive

## add dependencies
RUN \
    apt update && \
    apt install -y curl alsa-base libasound2-dev libdrm-dev libfdk-aac-dev

## nodejs v20 from node-repo
RUN \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt install -y nodejs

# add ffmpeg-rockchip-arm32 and npm
COPY ./deb /deb
WORKDIR /deb
RUN \
    dpkg -i *.deb && \
    npm install && \
    npm install fluent-ffmpeg && \
    ## fix librga libs location
    cp /usr/lib/test/pkgconfig/librga.pc /usr/lib/pkgconfig && \
    cp /usr/lib/test/librga.so* /usr/lib

## cleanup
RUN \
    apt-get clean autoclean && \
    apt-get autoremove --yes && \
    rm -rf /var/lib/apt/* /tmp/* /var/tmp/* /usr/share/doc/* /*.deb /deb

WORKDIR /app
CMD ["node server.js"]
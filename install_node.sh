#!/bin/bash
NODE_VERSION=v0.6.10

sudo apt-get -y -q install g++ curl libssl-dev make

wget http://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION.tar.gz
tar -xvf node-$NODE_VERSION.tar.gz
cd node-$NODE_VERSION/
./configure #--prefix=$HOME/local/node
make
sudo make install
cd -
cd /opt/optimal/connect
sudo npm install socket.io



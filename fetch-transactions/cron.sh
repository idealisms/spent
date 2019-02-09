#!/bin/bash -x

cd `dirname $0`
timeout -k 300 180 nodejs barclay.js

timeout 60 nodejs import.js

source bin/activate
python fetch.py
python import.py

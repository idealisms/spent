#!/bin/sh -x

cd `dirname $0`
timeout -k 300 180 nodejs barclay.js
timeout -k 300 180 nodejs chase.js
timeout -k 300 180 nodejs chase2.js

timeout 60 nodejs import.js

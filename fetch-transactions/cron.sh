#!/bin/sh -x

cd `dirname $0`
timeout -k 300 180 nodejs barclay.js
timeout -k 300 180 nodejs chase.js
timeout -k 300 180 nodejs chase.js chase2

timeout 60 nodejs import.js

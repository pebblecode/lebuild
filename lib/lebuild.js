#!/usr/bin/env node
/*
 * lebuild
 * https://github.com/thinktainer/lebuild
 *
 * Copyright (c) 2014 Martin Schinz
 * Licensed under the Apache, 2.0 licenses.
 */

'use strict';

var feedurl = "http://martin.schinz:Password123@teamcity.bedegaming.com/httpAuth/feed.html?itemsType=builds&buildStatus=successful&buildStatus=failed&itemsType=changes&userKey=martin.schinz"

var _ = require('lodash');
var moment = require('moment');
var five = require("johnny-five");
var FeedParser = require('feedparser');
var request = require('request');
var logdebug = function(t) { console.log(t); };

// FeedParser stuff

var successBuild = "Successful Build";
var failureBuild = "Failed Build";
var successColor = "00FF00";
var failureColor = "FF0000";

var config = {
    // minutes to consider events
    timewindow : 100,
    feedurl : feedurl,
    intervalMs : 60000
};

var johnny_led;
var board = new five.Board();
board.on("ready", function() {
    var led = new five.Led.RGB({
        pins: {
            red: 3,
            green: 5,
            blue: 6
        },
        isAnode: true
    });

    led.on();
    johnny_led = led; 

    this.repl.inject({
        led: led
    });
});

var MIN_COLOR = 0;
var MAX_COLOR = 255;
var COLOR_STEP = 10;
var START_COLOR = 10;

var padString = function (s) {
    if (s.length < 2){
        return "0" + s;
    }
    return s;
}

var convertRGToString = function (state) {
    var rString = padString(state.red.toString(16));
    var gString = padString(state.green.toString(16));
    return rString + gString + "00";
};

var isSuccess = function (author){
    return author === successBuild;
};

var nextState = function (state, result){
    if(isSuccess(result)){
        var res = {
            red : 0,
            green : Math.min(Math.max(state.green + COLOR_STEP, START_COLOR), MAX_COLOR)
        }
        return res;
    } else {
        var res = {
            red : Math.min(Math.max(state.red + COLOR_STEP, START_COLOR), MAX_COLOR),
            green : 0
        }
        return res;
    }
};

var state = {
    red : 0,
    green : 0
}

var publish = function(t, item) {
    var timeout = t;
    timeout = timeout / 100; // debug
    setTimeout(function() {
        state = nextState(state, item.author);
        var colorString = convertRGToString(state);
        logdebug("color: " + colorString);
        johnny_led.color(colorString);
    }, timeout);
};

var callWebUrl = function() {

    var req = request(config.feedurl);
    var feedparser = new FeedParser();

    req.on('error', function (error) {
        // handle any request errors
    });

    req.on('response', function (res) {
        var stream = this;
        if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
        stream.pipe(feedparser);
    });

    feedparser.on('error', function(error) {
        // always handle errors
    });

    feedparser.on('readable', function() {
        // This is where the action is!
        var stream = this
        , meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
        , item;


    while (item = stream.read()) {
        var now = moment();
        var itemDate = moment(item.date);
        var offsetItemDate = itemDate.add(config.timewindow, 'minutes');
        var offset = offsetItemDate.valueOf() - now.valueOf();
        var mOf = moment.duration(offset);
        logdebug ("offset: " + mOf.humanize());
        if (mOf > 0) {
            logdebug("greater");
            publish (offset, item);
        }
    }
    });
};

callWebUrl();
setInterval(function () {logdebug("interval called"); callWebUrl();}, config.intervalMs);


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
    timewindow : 10,
    feedurl : feedurl,
    intervalMs : 10000
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

var publish = function(t, item) {
    var timeout = t;
    timeout = timeout / 1000; // debug
    setTimeout(function() {
        if(item.author === successBuild ){
            logdebug("successful");
            johnny_led.color(successColor);
        }
        else{
            logdebug("failed");
            johnny_led.color(failureColor);
        }
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


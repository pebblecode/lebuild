#!/usr/bin/env node
/*
 * lebuild
 * https://github.com/thinktainer/lebuild
 *
 * Copyright (c) 2014 Martin Schinz
 * Licensed under the Apache, 2.0 licenses.
 */

'use strict';

var _ = require('lodash');
var moment = require('moment');
var logdebug = function(t) { console.log(t); };

var FeedParser = require('feedparser')
, request = require('request');

var req = request('http://teamcity.bedegaming.com/guestAuth/feed.html?projectId=project53&projectId=project27&projectId=project54&projectId=project77&projectId=project2&projectId=project67&itemsType=builds&buildStatus=successful&buildStatus=failed&userKey=guest')
, feedparser = new FeedParser();

var config = {
	// minutes to consider events
	timewindow : 30,
};

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

var publish = function(t, obj) {
	var timeout = t;
	timeout = timeout / 100; // debug
	setTimeout(function() {
		logdebug(t);
	}, timeout);
};


feedparser.on('readable', function() {
	// This is where the action is!
	var stream = this
	, meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
	, item;


while (item = stream.read()) {
	var now = moment();
	var itemDate = moment(item.date);
	var offsetItemDate = itemDate.add(config.timewindow, 'minutes');
	if (offsetItemDate > now){
		logdebug("greater");
		var offset = offsetItemDate.valueOf() - now.valueOf();
		var mOf = moment.duration(offset);
		logdebug ("offset: " + mOf.humanize());
		publish (offset, item);
	} else {
		//logdebug("NOT greater");
	}

	//publish(timer, item);
	// lg("Author: " + item.author);
	// lg("PubDate: " + item.pubDate);
	// lg("Date: " + item.date);
}
});


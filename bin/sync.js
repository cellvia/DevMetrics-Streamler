#!/usr/bin/env node

var	settings = require('../settings'),
   depResolver = require('../lib/dependencyResolver'),
	util = require('util'),
	argv = require('optimist')
			.demand(['u', 'p'])
			.usage('usage: $0 -u [username string] -p [password string] [--project string] [--limit int] [--refill] [--test string] [--metrics metric1 [, metric2, metric3 ]')
			.default('h', settings.ticketHost)
			.default('r', settings.redisHost).argv,
	Streamler = require( '../lib/Streamler' ),
	path = require('path'),
	metrics,
	debug = false || settings.debug,
	verbose = false || debug || settings.verbose,
	escapeeGenerator = require("./escapeeReportGenerator");

//MAIN ROUTER!
if((argv.metrics && argv.metrics.length) || (argv.metric && argv.metric.length)  ){
	metrics = argv.metrics || argv.metric;
	metrics = metrics.split(",").map(function(i){ return i.trim() });
	metrics = metrics.filter(function(i){ return !!i });
}

verbose && console.log('loading extensions...');
require('../lib/extensions');

var binpath = path.dirname(process.argv[1])
var rootpath = path.normalize(binpath+"/../");

verbose && console.log('Resolving metrics dependencies...');
metrics = depResolver(rootpath,metrics);
verbose && console.log("..Done! Metrics to be processed in this order: "+ metrics);

var streamler = new Streamler(metrics, settings);

streamler.client.on("ready", function(){
	streamler.init();
});
streamler.on("_completed", function(){
    escapeeGenerator.execute();
});

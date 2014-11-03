var redis = require('redis'),
	events = require('events'),
	queue = require('queue-async'),
	settings = require('../settings'),
	util = require('util'),
	i=0,
	ii=0;
	
var subscriptions = redis.createClient(settings.redisPort, settings.redisHost);
var client = redis.createClient(settings.redisPort, settings.redisHost);

subscriptions.on('ready', function() {
	subscriptions.subscribe('fogbugz.changesets');
	subscriptions.subscribe('fogbugz.tickets');
	subscriptions.subscribe('fogbugz.repos');
	subscriptions.subscribe('fogbugz.milestones');
	subscriptions.subscribe('fogbugz.projects');
});

subscriptions.on('error', function(error) {
	console.log(error);
});

client.on('error', function(error) {
	console.log(error);
});

subscriptions.on('message', function(channel, message){
	var result = JSON.parse(message);

	switch(channel){
		case 'fogbugz.tickets':
			updateTicket(client, result);
		break;
		case 'fogbugz.changesets':
			updateChangeset(client, result);
		break;
		case 'fogbugz.repos':
			updateRepo(client, result);
		break;		
		case 'fogbugz.milestones':
			updateMilestone(client, result);
		break;
		case 'fogbugz.projects':
			updateProject(client, result);
		break;		
	}
});

function updateMilestone(client, result) {
	console.log("received milestone"+(++i)+":"+result.ixFixFor);
	var key = "fogbugz:fixfor:" + result.ixFixFor;
	client.hmset(key, result);
	client.sadd('fogbugz:project:' + result.ixProject + ':fixfors', 'fogbugz:fixfor:' + result.ixFixFor);
	client.sadd('fogbugz:fixfors', key);
}

function updateProject(client, result) {
	console.log("received Project:"+result.sProject);
	client.hmset('fogbugz:project:' + result.ixProject, result);
	if(result.sProject.match(/inbox/i)){
		client.sadd("projects:inbox", 'fogbugz:project:' + result.ixProject);
	} else {
		client.sadd("projects:dev", 'fogbugz:project:' + result.ixProject);
	}
}

function updateTicket(client, result) {
	// process.stdout.write("received Ticket"+(++i)+":"+result.ixBug);
	console.log("received Ticket"+(++ii)+":"+result.ixBug);
	var key = "fogbugz:ticket:" + result.ixBug	
	client.hmset(key, result);
	client.sadd('fogbugz:tickets', key );
	client.sadd('fogbugz:fixfor:' + result.ixFixFor + ":tickets", key);
	var tags = '';	
	if (result.tags.tag) {
		if (typeof result.tags.tag == 'string') {
			tags = result.tags.tag;
		}
		else {
			//multiple tags are stored in an array
			tags = result.tags.tag.join(',');
		}		
	}
	client.hset(key, 'tags', tags);
}

function updateChangeset(client, result) {
	console.log( "cs " + result.rev + ": locAdd [" + result.locAdded + "] locRemoved [" + result.locRemoved + "]" );
	if(isNaN(result.locAdded) || isNaN(result.locRemoved)) console.log("missing data, not adding this changeset")
	var key = "kiln:changeset:" + result.rev;
	client.hmset(key, result);
	client.sadd('kiln:repo:' + result.ixRepo + ":changesets", key);
	/*	var author = '';
	client.hset(key, 'authors', tags);*/
}

function updateRepo(client, result) {
	console.log( "repo "+ result.ixRepo + " updated" );
	client.hmset('kiln:repo:' + result.ixRepo, result);
	client.sadd("kiln:repos", 'kiln:repo:' + result.ixRepo);
}

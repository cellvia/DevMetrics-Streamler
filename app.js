var express = require('express'),
	settings = require('./settings'),
	verbose = false || settings.verbose;

verbose && console.log("opening extensions");
require('./lib/extensions');
	
verbose && console.log("opening subscriptions");
require('./lib/subscriptions');

verbose && console.log("creating & configuring app");
var app = express.createServer();
app = require('./config')(app, express);

verbose && console.log("adding routes");
app = require('./routes')(app);

verbose && console.log("initiating app");
app.listen(settings.hostPort, settings.host, function(err){
	if(err){ console.log(err); process.exit(); }
	console.log("Express server listening on "+app.address().port+" in "+app.settings.env+" mode", app.address().port, app.settings.env);
});

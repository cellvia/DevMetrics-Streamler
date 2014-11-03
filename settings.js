var	argv = require('optimist').argv;

module.exports = settings = {
	maxAsync: 50,  														//max number of async processes allowed at once in the q queue
	debug: argv.d || argv.debug || false,  					//global debug on?
	verbose: this.debug || argv.v || argv.verbose || false,  	//global verbose on?
	hostPort: 4000,
	db: "redis",
	redisHost: argv.r || "localhost",
	redisPort: 6379,
	ticketHost: 'http://fogbugz.devid.local',
	argv: argv,
	metricpath: 'lib/metrics/'

}

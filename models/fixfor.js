var	core = require('./core'),
	redis = require('redis'),
	settings = require('../settings'),
	verbose = false || settings.verbose;

//constructor and prototypes
FixFor = function(json) {
	var data = JSON.parse(json);
	this.Id = data.Id;
	this.sfixfor = data.sfixfor
	this.sproject = data.sproject
	this.dt = new Date(data.dt);
	this.sortdt = new Date(data.sortdt);
	this.dtstart = new Date(data.dtstart);
}

//Static methods on project
module.exports = (function() {
	var loadFromCollection = core.loadFromCollection.curry(settings.redisPort, settings.redisHost);

	return  {
		getAll : function(callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfors', callback);
		}, 

		getAllForProject: function(project,callback) {
			loadFromCollection(FixFor, 'fogbugz:project:' + project + ':fixfors', callback);
		}, 

		getAllActive: function(callback) {
			loadFromCollection(FixFor, 'fixfors:active', callback);
		},

		getClosedTickets: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':closedTickets', callback)
		},

		getOpenTickets: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':openTickets:', callback)
		}, 

		getEscapees: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':releasedDefects', callback);
		},
		
		getPEITickets: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':PEIs', callback);
		},
		
		getUmbrellas: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':umbrella', callback);
		},
		
		getBadRCM: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':invalidRootCause', callback);
		},
		getBlankRCM: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':blankRootCause', callback);
		},
		getValidQAReturns: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':validQAReturns', callback);
		},
		getOpenAfterReleaseTestingDate: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':openAfterReleaseTestingDate', callback);
		},
		getOpenBeforeReleaseTestingDate: function(fixfor, callback) {
			loadFromCollection(FixFor, 'fogbugz:fixfor:' + fixfor + ':openBeforeReleaseTestingDate', callback);
		},
		countClosedTickets: function(fixfor, callback) {
                      loadFromCollection(null, 'fogbugz:fixfor:' + fixfor + ':tickets', function(err,results){
			var count=0;
			for (var i=0;i<results.length;i++)
			{
				if (results[i]!=null && results[i].sStatus.toLowerCase().indexOf("closed")!=-1)
				{
					count++;
				}
			}
                        callback(err,count);
                        });
		},
		countTotalTickets: function(fixfor, callback) {
			var client = redis.createClient(settings.redisPort, settings.redisHost);

			client.scard('fogbugz:fixfor:'+fixfor+':tickets', function(err, result) {
				client.end();
				callback(err, result);
			});			
		},
		countOpenTickets: function(fixfor, callback) {
                      loadFromCollection(null, 'fogbugz:fixfor:' + fixfor + ':tickets', function(err,results){
			var count=0;
			for (var i=0;i<results.length;i++)
			{
				if (results[i]!=null && results[i].sStatus.toLowerCase().indexOf("closed")==-1)
				{
					count++;
				}
			}
                        callback(err,count);
                        });
		},

		countReleasedDefects: function(fixfor, callback) {
			var client = redis.createClient(settings.redisPort, settings.redisHost);

			client.scard('fogbugz:fixfor:'+fixfor+':releasedDefects', function(err, result) {
				client.end();
				callback(err, result);
			});
		},
		
		countPEICases: function(fixfor, callback) {
			var client = redis.createClient(settings.redisPort, settings.redisHost);

			client.scard('fogbugz:fixfor:'+fixfor+':PEIs', function(err, result) {
				client.end();
				callback(err, result);
			});			
		},
		
		getBadRCMCount: function(fixfor, callback) {
			var client = redis.createClient(settings.redisPort, settings.redisHost);
			client.scard('fogbugz:fixfor:'+fixfor+':invalidRootCause', function(err, result) {
				client.end();
				callback(err, result);
			});
		},
		getBlankRCMCount: function(fixfor, callback) {
			var client = redis.createClient(settings.redisPort, settings.redisHost);
			client.scard('fogbugz:fixfor:'+fixfor+':blankRootCause', function(err, result) {
				client.end();
				callback(err, result);
			});
		},
		countUmbrellas: function(fixfor, callback) {
			var client = redis.createClient(settings.redisPort, settings.redisHost);

			client.scard('fogbugz:fixfor:'+fixfor+':umbrella', function(err, result) {
				client.end();
				callback(err, result);
			});			
		},
		
		comparator: function(a, b) {
		    var retval = 0,
		    	as = a.sFixFor.replace(/[^0-9]+/g, ''),
		    	bs = b.sFixFor.replace(/[^0-9]+/g, '');
                        if (!(+a.totalTickets) || !(+a.closedTickets) || (+a.percentClosed) < 75) retval= -1;
                        else if (!(+b.totalTickets) || !(+b.closedTickets) || (+b.percentClosed) < 75) retval=1;
	    	  	else if (!a.sortdt) {
				retval=-1;
			}
	    	  	else if (!b.sortdt){
				retval=1;
			}
			else { 
				if( as && bs && as.length === bs.length) {
	        			if( as !== bs) return (as > bs) - (as < bs);
		    		}

		    		a.sortdt = +a.sortdt;
				b.sortdt = +b.sortdt;
		    		if (!a.sortdt && +b.sortdt) {
	            			retval = 1;
		    		}
		    		else if (a.sortdt && !b.sortdt) {
		        		retval = -1;
		    		}
		    		else if (a.sortdt && b.sortdt) {
		        	retval = ((a.sortdt > b.sortdt) - (a.sortdt < b.sortdt));
		    		}
			}
		    //default case (both have no end-date) is equal
		    return(retval);
		}
	}
})();

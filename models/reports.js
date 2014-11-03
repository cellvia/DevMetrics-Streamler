var	core = require('./core'),
	settings = require('../settings'),
	verbose = false || settings.verbose;

module.exports = (function() {
	var loadFromCollection = core.loadFromCollection.curry(settings.redisPort, settings.redisHost);
	var loadJson = core.loadJson.curry(settings.redisPort, settings.redisHost);

	return {
		ticketsByMilestone: function(milestone, callback) {
			var retVal = { title: 'Report', data: [] };

			loadJson('fogbugz:fixfor:' + milestone, function(error, fixfor){
				retVal.title = fixfor.sFixFor;

				loadFromCollection(null, 'fogbugz:fixfor:' + milestone + ':report:ticketsByMilestone', function(error, results){
					if(error) { callback(error); }
					var totalTickets = { name: 'Total Open Tickets', data: [] }
					var records = 0;

					results.sort(function(a, b){ return a.epoch - b.epoch; });

					results.forEach(function(value){
						records += parseInt(value.cnt);
						totalTickets.data.push([ parseInt(value.epoch), records ]);
					});

					retVal.data.push(totalTickets);

					if(callback) { callback(null, retVal); }
					/*loadFromCollection(null, 'fogbugz:fixfor:' + milestone + ':report:milestoneResolvedToClose', function(error, results){
						if(error) { callback(error); }
						var avgResolvedToClose = { name: 'Average Time Resolved to Closed', data: [] }

						var average = results.reduce(function(i,b){return i+b}) / results.length;

						avgResolvedToClose.data.push(average);

						retVal.data.push(avgResolvedToClose);

						if(callback) { callback(null, retVal); }
					});*/

				});

			});
		}
	}
})();
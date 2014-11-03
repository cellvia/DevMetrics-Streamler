var models = require('../models');

module.exports = {
	index: function(req, res) {
	}

	, all_active: function(req, res) {
		models.FixFor.getAllActive(function(err, actives){
			if (!req.params.format || req.params.format == 'json') {
				res.json(actives);
			}
		});
	},

	getClosedTickets: function(req, res, next) {
		models.FixFor.getClosedTickets(req.params.id, function(err, results){
			if(err) { throw err; }
			res.json(results);
		});
	},

	getOpenTickets: function(req, res, next) {
		models.FixFor.getOpenTickets(req.params.id, function(err, results){
			if(err) { throw err; }
			res.json(results);
		});
	}
};
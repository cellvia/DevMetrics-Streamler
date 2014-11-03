var models = require('../models');

module.exports = {
	ticketsByMilestone: function(req, res) {
		var milestone = req.params.id;

		models.Reports.ticketsByMilestone(milestone, function(error, results){
			if(error) { throw error; }
			res.render('reports/ticketsByMilestone', { data: results, inboxes: req.inboxes, devprojects: req.devprojects, all_case_columns: models.Case.ALL_CASE_COLUMNS() });
		});
	}
};

module.exports = {
	index: function(req, res) {
		res.render('dashboard/index', {
			inboxes: req.inboxes,
			devprojects: req.devprojects
		});
	}
};
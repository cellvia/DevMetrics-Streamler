var queue = require('queue-async');
var models = require('../models');

module.exports = {
	//used to make multiple calls to different entities to load them from storage
	//this simply turns around and copies them into the fillArray
	//this seems a little silly, but it's basically so that we can parallel async
	//call various getAll methods on the models and have each result go into a different
	//array when you need to laod two of them in the same controller method (eg dashboards.index)
	loadObjects: function(loadMethod, fillArray, callback) {
		loadMethod(function(err, result) {
			if (!err) {
				result.forEach(function(item) {
					fillArray.push(item);
				});				
			}
			callback(err, null);
		});
	}
	
	, loadLayoutData: function(req, res, next) {
        var inboxObjects = [];
		var devprojObj = [];
		
		//comparator for two projects, based on their name
		var projCompare = function(a, b) {
            return ((a.sproject > b.sproject) - (a.sproject < b.sproject));
    	}

		var q = queue();	
		q.defer(module.exports.loadObjects, models.Project.getAllInbox, inboxObjects);
		q.defer(module.exports.loadObjects, models.Project.getAllDev, devprojObj);
		q.await(function(err, ignore){
			if (err) { throw err; }
			var sortedInboxes = inboxObjects.sort(models.Project.comparator);
			var sortedDevProjects = devprojObj.sort(models.Project.comparator);
			req.inboxes = sortedInboxes;
			req.devprojects = sortedDevProjects;
			next();
		});
	}
}
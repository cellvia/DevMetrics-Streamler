var controllers = require('./controllers');
var fs = require('fs');

module.exports = function(app) {
	//define routes
	app.get('/download/csvFromProjects', controllers.projects.csvFromProjects);
	app.get('/download/csvFromProjectsPerMilestone', controllers.projects.csvFromProjectsPerMilestone);

	app.get('/', controllers.core.loadLayoutData, controllers.dashboards.index);

	app.get('/fixfors/active.:format?', controllers.fixfors.all_active);
	app.get('/fixfors/:id/closedTickets.:format?', controllers.fixfors.getClosedTickets);
	app.get('/fixfors/:id/openTickets.:format?', controllers.fixfors.getOpenTickets);
	//un-used route
	//app.get('/projects/currentFixfors/:project.:format?', controllers.projects.currentFixfors);

	//routes for projects
	app.all('/projects/selectedcolumns', controllers.projects.caseColumns);
	app.get('/projects/:id/:milestone/umbrellas', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone/escapees', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone/peis', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone/badrcm', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone/validqareturns', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone/openafterreleasetestingdate', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone/openbeforereleasetestingdate', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone/blankrcm', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone/all', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id/:milestone', controllers.core.loadLayoutData, controllers.projects.project);
	app.get('/projects/:id', controllers.core.loadLayoutData, controllers.projects.project);

	app.get('/projects/:id/fixfors/:fixfor/cases.:format?', controllers.projects.cases);
	app.get('/projects/:id/badrcm/:fixfor/cases.:format?', controllers.projects.badRcmCases);
	app.get('/projects/:id/validqareturns/:fixfor/cases.:format?', controllers.projects.validQAReturnsCases);
	app.get('/projects/:id/openafterreleasetestingdate/:fixfor/cases.:format?', controllers.projects.openAfterReleaseTestingDateCases);
	app.get('/projects/:id/openbeforereleasetestingdate/:fixfor/cases.:format?', controllers.projects.openBeforeReleaseTestingDateCases);
	app.get('/projects/:id/blankrcm/:fixfor/cases.:format?', controllers.projects.blankRcmCases);
	app.get('/projects/:id/peis/:fixfor/cases.:format?', controllers.projects.peisCases);
	app.get('/projects/:id/escapees/:fixfor/cases.:format?', controllers.projects.escapeesCases);
	app.get('/projects/:id/umbrellas/:fixfor/cases.:format?', controllers.projects.umbrellaCases);

	
	//routes for cases
	app.get('/cases/columns.:format?', controllers.cases.casecolumns);

	// reports
	app.get('/reports/ticketsByMilestone/:id', controllers.core.loadLayoutData, controllers.reports.ticketsByMilestone);
		
	//escapee Excel Report
	app.get('/download/xls/escapeeReport', function(req,res){
	   var path = './downloads/escapeeReport/';
        var files = fs.readdirSync(path);
        var latest = files.sort()[files.length-1];
        console.log(latest);
        res.sendfile(path+latest);
 
	});
	
	return app;
};
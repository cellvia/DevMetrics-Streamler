var models = require('../models');
var queue = require('queue-async');
var ALL_MILESTONES = 1;
var CASE_DEFAULT_COLUMNS = [ { name: 'Id', title: 'Case ID' }
							, { name: 'scategory', title: 'Type' }
							, { name: 'spriority', title: 'Priority'}
							, { name: 'sstatus', title: 'Status'}
							, { name: 'plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65', title: 'RCM'}
							, { name: 'stitle', title: 'Title' }
							, { name: 'sarea', title: 'Area' } 
							, { name: 'spersonassignedto', title:'Assigned To'}];

function hasNumbers(t) {
	return /\d/.test(t);
};

function dateToYMD(date){
    var d = date.getDate();
    var m = date.getMonth()+1;
    var y = date.getFullYear();
    return (d && m && y) ? '' + y +'-'+ (m<=9?'0'+m:m) +'-'+ (d<=9?'0'+d:d) : undefined;
}

var sendResponse = function(res, err, data) {
    if (!err) {
        res.json(data);
    }
    else {
            console.log(err);
            res.send('', 500);
        }
}

module.exports = {
	project: function(req, res) {
		var q = queue(1),
	    	project = req.params.id,
			projectName,
			loadDate,
			sorted,
			projectBadRCM = 0,
			projectBlankRCM = 0,
        	projectTotalUnclosedBugs = 0,
        	projectTotalUnresolvedBugs = 0,
        	projectEscapees = 0;
        	sideMilestoneHolder = [],
			finalSort = [],
			milestone = 0,
			milestoneNames = [],
		    chartEscapees = [],
		    milestoneFixfors = [],
			startDates = {},
			dueDates = {},
			openTickets = {},
			openBugs = {},
			closedTickets = {},
			escapedDefects = {},
			chartPEIs = [],
			chartTotal = [],
			chartPercentEscapees = [],
			chartPendingReviewAvg = [],
			umbrellas = {},
			peis = {},
			badRCM = {},
			blankRCM = {},
			pendingReviewAvg = {},
			validQAReturns = {},
			openAfterReleaseTestingDate = {},
			openBeforeReleaseTestingDate = {},
			noEstimateCases={},
			milestone;
		if(req.params.milestone !== undefined) {
			milestone = req.params.milestone;
		}
		if (!req.session.selectedColumns) {
			req.session.selectedColumns = CASE_DEFAULT_COLUMNS;
		}
		
        models.Project.getProject(project, function(err, proj) {
        	
            if (err || !proj){
                res.status(404);
                res.render('error');
                return;
            }
            
            
	        models.FixFor.getAllForProject(proj.Id, function(err, milestones){
	        	sorted = milestones.sort(function(a,b){return (+a.ixFixFor) > (+b.ixFixFor) ? 1 : -1;});
	        	for(var i = 0, len = sorted.length; i < len; i++){
					sorted[i].sortdt=sorted[i].dt;
				}
	        	for(var i = 0, len = sorted.length; i < len; i++){
	        		var current = sorted[i],
	        			previous = sorted[i-1] || {},
	        			next = sorted[i+1] || {};
	        		if( !+current.sortdt && (previous = +previous.sortdt) && (next = +next.sortdt) ){
	        			sorted[i].sortdt = (previous + next) / 2;
	        		}else if (!+current.sortdt && (previous || next)) {
	        			sorted[i].sortdt = previous || next;
	        		}
	        	}
    	        sorted = milestones.sort(models.FixFor.comparator);
    	        
				sorted.forEach(function(milestone) {					

			        if( milestone.fReallyDeleted == "true" 
			        	&& milestone.totalTickets == 0
			        	&& milestone.releasedDefects == 0
			        ) return;

					if(hasNumbers(milestone.sFixFor)) {
						sideMilestoneHolder.push(milestone);
					}else{
						finalSort.push(milestone);
					}

					projectBadRCM += (+milestone.invalidRootCause);
					projectEscapees += (+milestone.releasedDefects);
                    projectBlankRCM += (+milestone.blankRootCause);
					projectTotalUnresolvedBugs += (+milestone.unresolvedBugs);
					projectTotalUnclosedBugs += (+milestone.unclosedBugs);

				});

				finalSort = finalSort.concat(sideMilestoneHolder);

				finalSort.forEach(function(milestone) {					
					projectName = milestone.sProject;
					if (milestone.loadDate)
						{
						var mydate=new Date(milestone.loadDate);
						loadDate = mydate.toLocaleString();
						}

					startDates[milestone.ixFixFor] = +milestone.dtStart;
		            dueDates[milestone.ixFixFor] = +milestone.dt;
					openTickets[milestone.ixFixFor] = milestone.openTickets;
					closedTickets[milestone.ixFixFor] = milestone.closedTickets;
					escapedDefects[milestone.ixFixFor] = +milestone.releasedDefects;
					peis[milestone.ixFixFor] = +milestone.PEIs;
					umbrellas[milestone.ixFixFor] = +milestone.umbrella;
					badRCM[milestone.ixFixFor] = +milestone.invalidRootCause;
					openBugs[milestone.ixFixFor] = +milestone.unclosedBugs;
                    blankRCM[milestone.ixFixFor] = +milestone.blankRootCause;
		            pendingReviewAvg[milestone.ixFixFor] = +milestone.pendingReviewAvg;
		            validQAReturns[milestone.ixFixFor] = +milestone.validQAReturns;
					openBeforeReleaseTestingDate[milestone.ixFixFor] = +milestone.openBeforeReleaseTestingDate;
					openAfterReleaseTestingDate[milestone.ixFixFor] = +milestone.openAfterReleaseTestingDate;
					noEstimateCases[milestone.ixFixFor] = +milestone.noEstimateCases || 0;
					chartPEIs.push(+milestone.PEIs);
					chartTotal.push(+milestone.totalTickets);
					chartEscapees.push(+milestone.releasedDefects);
					milestoneNames.push(milestone.sFixFor);
					milestoneFixfors.push(milestone.ixFixFor);
					chartPercentEscapees.push( Math.round((+milestone.releasedDefects)/(+milestone.totalTickets)*10000)/100 );
					chartPendingReviewAvg.push( Math.round(milestone.pendingReviewAvg*10)/10);

				});

				res.render('projects/projectview', {
					projectName: projectName,
					loadDate: loadDate,
					project: project,
					milestone: milestone,
					fixfors: finalSort.reverse(),
					openTickets: JSON.stringify(openTickets),
					openBugs: JSON.stringify(openBugs),
					closedTickets: JSON.stringify(closedTickets),
					umbrellas: JSON.stringify(umbrellas),
					startdates: JSON.stringify(startDates),
			    	duedates: JSON.stringify(dueDates),
			    	peis: JSON.stringify(peis),
					badRCM: JSON.stringify(badRCM),
					blankRCM: JSON.stringify(blankRCM),
					pendingReviewAvg: JSON.stringify(pendingReviewAvg),
					validQAReturns: JSON.stringify(validQAReturns),
					openAfterReleaseTestingDate: JSON.stringify(openAfterReleaseTestingDate),
					openBeforeReleaseTestingDate: JSON.stringify(openBeforeReleaseTestingDate),
					noEstimateCases:JSON.stringify(noEstimateCases),
					projectBadRCM: projectBadRCM,
					projectBlankRCM: projectBlankRCM,
					projectTotalUnresolvedBugs: JSON.stringify(projectTotalUnresolvedBugs),
					projectTotalUnclosedBugs: JSON.stringify(projectTotalUnclosedBugs),
					escapedDefects: JSON.stringify(escapedDefects),
					projectEscapees: JSON.stringify(projectEscapees),
					milestoneNames: JSON.stringify(milestoneNames), 
				    chartEscapees: JSON.stringify(chartEscapees),
					chartPEIs: JSON.stringify(chartPEIs),
					chartTotal: JSON.stringify(chartTotal),
					chartPercentEscapees: JSON.stringify(chartPercentEscapees),
					chartPendingReviewAvg: JSON.stringify(chartPendingReviewAvg),
				    milestoneFixfors: JSON.stringify(milestoneFixfors), 
					inboxes: req.inboxes,
					devprojects: req.devprojects,
					all_case_columns: models.Case.ALL_CASE_COLUMNS()													
				});
	        });
	    });
	},
	
	cases: function(req, res) {
	    var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);
        var sortBy = req.param('sortBy');
        var sortOrder = req.param('sortOrder');

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }   
    
        if(fixfor != ALL_MILESTONES) {          
            models.Case.getFixForCases(fixfor, sortBy, sortOrder, response);
        }
        else {
            models.Project.getAllCasesForProject(project, response);
        }
	}, 
	
	badRcmCases: function(req, res) {
	    var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }

        if(fixfor != ALL_MILESTONES) {
            models.FixFor.getBadRCM(fixfor, response);
        }
        else {
            models.Project.getBadRCM(project, response);
        }
	},
    blankRcmCases: function(req, res) {
        var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }

        if(fixfor != ALL_MILESTONES) {
            models.FixFor.getBlankRCM(fixfor, response);
        }
        else {
            models.Project.getBlankRCM(project, response);
        }
    },	
	validQAReturnsCases: function(req, res) {
	    var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }

        if(fixfor != ALL_MILESTONES){
            models.FixFor.getValidQAReturns(fixfor, response);
        }
        else {
            models.Project.getValidQAReturns(project, response);
        }
	},
	openBeforeReleaseTestingDateCases: function(req, res) {
	    var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }

        if(fixfor != ALL_MILESTONES) {
            models.FixFor.getOpenBeforeReleaseTestingDate(fixfor, response);
        }
        else {
            models.Project.getOpenBeforeReleaseTestingDate(project, response);
        }
	},
	openAfterReleaseTestingDateCases: function(req, res) {
	    var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }

        if(fixfor != ALL_MILESTONES) {
            models.FixFor.getOpenAfterReleaseTestingDate(fixfor,response);
        }
        else {
            models.Project.getOpenAfterReleaseTestingDate(project, response);
        }
	},
	peisCases: function(req, res) {
	    var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }

        if(fixfor != ALL_MILESTONES) {
            models.FixFor.getPEITickets(fixfor, response);
        }
        else {
            models.Project.getPEITickets(project, response);
        }
	},	
	escapeesCases: function(req, res) {
	    var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }

        if(fixfor != ALL_MILESTONES) {
            models.FixFor.getEscapees(fixfor, response);
        }
        else {
            models.Project.getEscapees(project, response);
        }
	},
	
	umbrellaCases: function(req, res) {
	    var fixfor = req.params.fixfor;
        var format = req.param('format', 'json');
        var project = req.params.id;
        var response = sendResponse.curry(res);

        if (format != 'json') {
            res.send('format: ' + format + ' is presently un-supported');
        }

        if(fixfor != ALL_MILESTONES) {
            models.FixFor.getUmbrellas(fixfor, response);
        }
        else {
            models.Project.getUmbrellas(project, response);
        }
	},
	
	caseColumns: function(req, res) {
		if (req.method == 'GET') {
			if (!req.session.selectedColumns) {
				req.session.selectedColumns = CASE_DEFAULT_COLUMNS;
			}			
			res.send(req.session.selectedColumns);
		}
		else if (req.method == 'POST') {
			req.session.selectedColumns = req.body;
			res.send();
		}		
	},

	csvFromProjects: function(req, res) {
		models.Project.getAllDev(function(err, projects){
			var assembledProjects = [],
				body = "",
				head = "",
				label = "totalsPerProject",
				n = 0;
			projects.forEach(function(proj){
				models.FixFor.getAllForProject(proj.ixProject, function(err, milestones){
					n++;
					if( (err || !milestones || !milestones.length) && n !== projects.length) return;
					var currProj = {};
					currProj['Project Name'] = currProj.sProject = proj.sProject;
					milestones.forEach(function(milestone){
						currProj['Unclosed Bugs'] = currProj['Unclosed Bugs'] +		 					(+milestone.unclosedBugs) 				|| 0;
						currProj['Unresolved Bugs'] = currProj['Unresolved Bugs'] +		 					(+milestone.unresolvedBugs) 				|| 0;
						currProj['Open Tickets'] = currProj['Open Tickets'] + 			(+milestone.openTickets) 			|| 0;
						currProj['Closed Tickets'] = currProj['Closed Tickets'] + 	(+milestone.closedTickets) 		|| 0;
	          currProj['Blank RCM'] = currProj['Blank RCM'] + 						(+milestone.blankRootCause) 	|| 0;
						currProj['Invalid RCM'] = currProj['Invalid RCM'] + 				(+milestone.invalidRootCause) || 0;
						currProj['Pending Review Avg'] = currProj['Pending Review Avg'] + 				(+milestone.pendingReviewAvg) || 0;
						currProj['Escapees'] = currProj['Escapees'] +		 						(+milestone.releasedDefects) 	|| 0;
					});
					currProj['Pending Review Avg'] = (currProj['Pending Review Avg'] / (milestones.length))     || 0; 				
					assembledProjects.push(currProj);
					if( n === projects.length ){
						assembledProjects = assembledProjects.sort(models.Project.comparator);
						assembledProjects.forEach(function(finalProj, ind){
							delete finalProj.sProject;
							if(ind === 0){
								for ( prop in finalProj ) head += prop + ",";
								head = head.slice(0, -1);
							}
							for( prop in finalProj ) body += finalProj[prop] + ",";
							body = body.slice(0, -1) + "\r\n";
						})
						body = head + "\r\n" + body;						
						res.attachment(dateToYMD(new Date) + '_' + label + '.csv');
						res.end( body );
					}
				})
			})
		})
	},

	csvFromProjectsPerMilestone: function(req, res) {
		models.Project.getAllDev(function(err, projects){
			var assembledProjects = [],
				body = "",
				label = "totalsPerProjectPerMilestone",
				n = 0;
			projects.forEach(function(proj){
				models.FixFor.getAllForProject(proj.ixProject, function(err, milestones){
					n++;
					if( (err || !milestones || !milestones.length) && n !== projects.length) return;					
    	    var sideMilestoneHolder = [],
    	    	finalSort = [],
    	    	sorted;
    	    sorted = milestones.sort(function(a,b){return (+a.ixFixFor) > (+b.ixFixFor) ? 1 : -1;});
	        for(var i = 0, len = sorted.length; i < len; i++){
						sorted[i].sortdt=sorted[i].dt;
					}
        	for(var i = 0, len = sorted.length; i < len; i++){
        		var current = sorted[i],
        			previous = sorted[i-1] || {},
        			next = sorted[i+1] || {};
        		if( !+current.sortdt && (previous = +previous.sortdt) && (next = +next.sortdt) ){
        			sorted[i].sortdt = (previous + next) / 2;
        		}else if (!+current.sortdt && (previous || next)) {
        			sorted[i].sortdt = previous || next;
        		}
        	}
    	    sorted.sort(models.FixFor.comparator);
    	    sorted.forEach(function(milestone) {					
		        if( milestone.fReallyDeleted == "true" 
		        	&& milestone.totalTickets == 0
		        	&& milestone.releasedDefects == 0
		        ) return;

				if(hasNumbers(milestone.sFixFor)) {
					sideMilestoneHolder.push(milestone);
				}else{
					finalSort.push(milestone);
				}
			});

					milestones = finalSort.concat(sideMilestoneHolder).reverse();
    	    var currProj = {};
					currProj.sProject = proj.sProject;
					currProj.milestones = [];
					milestones.forEach(function(milestone){
						var temp = {};
						temp['Milestone Name'] = milestone.sFixFor;
						temp['Unclosed Bugs'] = (+milestone.unclosedBugs) 							|| 0;
						temp['Unresolved Bugs'] = (+milestone.unresolvedBugs) 							|| 0;
						temp['Open Tickets'] = (+milestone.openTickets) 				|| 0;
						temp['Closed Tickets'] = (+milestone.closedTickets) 		|| 0;
	          temp['Blank RCM'] = (+milestone.blankRootCause) 				|| 0;
						temp['Invalid RCM'] = (+milestone.invalidRootCause) 		|| 0;
						temp['Pending Review Avg'] = (+milestone.pendingReviewAvg) 		|| 0;
						temp['Escapees'] = (+milestone.releasedDefects) 				|| 0;
						temp['Date Due'] = (+milestone.dt) ? dateToYMD( new Date(+milestone.dt) ) : "";
						currProj.milestones.push(temp);
					});
					assembledProjects.push(currProj);
					if( n === projects.length ){
						var props = [],
								blankline,
								rows = 1,
								propsLength;
						assembledProjects = assembledProjects.sort(models.Project.comparator);
						assembledProjects.forEach(function(finalProj, ind){							
							var projBody = "",
									head = "";
							blankline = blankline || (new Array( propsLength )).join(",") + "\r\n";

							finalProj.milestones.forEach(function(finalMile, ind2){
								if(ind2 === 0){
									for ( prop in finalMile ){
										projBody += prop + ",";
										if(ind === 0) props.push(prop);
									} 										
									projBody = projBody.slice(0, -1) + "\r\n";
									rows++;
								}
								for( prop in finalMile ) projBody += finalMile[prop] + ",";
								projBody = projBody.slice(0, -1) + "\r\n";
								rows++;
							});

							propsLength = propsLength || props.length;

							var arrayy = new Array( len );
							arrayy[0] = finalProj.sProject;
							head = arrayy.join(",") + "\r\n";

							var formulas = [],
									col = "A";
							for(var x = 0; x < propsLength; x++){
								if(props[x] === "Milestone Name"){
									formulas.push("-TOTALS-");
								}else if(props[x] === "Date Due"){
									formulas.push("");									
								}else if(props[x] === "Pending Review Avg"){
									formulas.push("=AVERAGE("+col+(rows-finalProj.milestones.length+1)+":"+col+(rows)+")");									
								}else{
									formulas.push("=SUM("+col+(rows-finalProj.milestones.length+1)+":"+col+(rows)+")");
								}
								col = String.fromCharCode(col.charCodeAt(0) + 1);
							}
							formulas = formulas.join(",") + "\r\n";

							body += head + projBody + formulas + blankline;
							rows += 3;

						})
						res.attachment(dateToYMD(new Date) + '_' + label + '.csv');
						res.end( body );
					}
				})
			})
		})
	}


};



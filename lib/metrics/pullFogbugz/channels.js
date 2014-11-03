var util = require('util');

module.exports = function(streamler){

  var settings = streamler.settings;

  streamler
    .addChannel('authenticate', function(){
      this
        .source( 'authenticate' )
        .dumper( 'console', { label: 'Token: %s' } )
        .done();
    })
    .addChannel('allProjects', function(){
      this
        .source( 'allProjects', { project: settings.argv.project } )
        .filter( 'projects', { project: settings.argv.project} )
        .dumper( 'console', { condition: settings.argv.debug === "allProjects" } )
        .filter( 'incrCounter' )
        .dumper( 'log', { condition: settings.argv.log } )
        .dumper( 'db', { collection: 'fogbugz.projects', command: 'publish' } )
        .dumper( 'console', { onEnd: true, data: "root.count", label: '%s projects being processed' } )
        .done();
    })
    .addChannel('milestonesByProject', function( project ){
      this
        .source( 'milestonesPerProject', { ixProject: project.ixProject, sProject: project.sProject } )
        .filter( 'milestones', { project: project } )
        .filter( 'incrCounter' )
        .dumper( 'console', { condition: settings.argv.debug === "allMilestones" } )
        .dumper( 'db', { collection: 'fogbugz.milestones', command: 'publish' } )
        .dumper( 'log', { label: project.sProject + "_allMilestones", condition: settings.argv.log } )
        .dumper( 'console', { onEnd: true, data: "root.count", label: '%s milestones for ' + project.sProject } )
        .done( {data: [project]} );
    })
    .addChannel('casesByMilestone', function( milestone, project ){
      this
        .source( 'casesPerMilestone', { sProject: project.sProject, sFixFor: milestone.sFixFor, limit: settings.argv.limit, queryOverride: false } )
        .filter( 'cases', { milestone: milestone } )
        .filter( 'incrCounter' )
        .filter( 'searchEvents', { condition: settings.argv.search } )
        .filter( 'cleanEvents' )
        .filter( 'rollbackRCM', { condition: settings.argv.date } )
        .dumper( 'console', { condition: settings.argv.debug === "allCases" } )
        .dumper( 'db', { collection: 'fogbugz.tickets', command: 'publish' } )
        .dumper( 'log', { label: project.sProject + "_" + milestone.sFixFor + "_allCases", condition: settings.argv.log } )
        .dumper( 'console', { onEnd: true, data: "root.count", label: '%s tickets complete for ' + project.sProject + ": " + milestone.sFixFor, condition: settings.verbose } )
        .done();
    });
}

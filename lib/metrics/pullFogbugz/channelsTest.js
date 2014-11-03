var util = require('util');

module.exports = function(streamler){

  var settings = streamler.settings;

  streamler
    .addChannel('authenticate', function(){
      this
        .source( 'authenticate' )
        .dumper( 'console', {label: 'Token: %s'} )
        .done();
    })
    .addChannel('allProjects', function(){
      this.root.recursive = { depth: "recursiveTest" }
      this
        .source( 'allProjects', {project: settings.argv.project} )
        .dumper( 'console', { condition: settings.argv.debug === "allProjects" } )
        .filter( 'projects', {project: settings.argv.project} )
        .filter( 'incrCounter' )
        .dumper( 'log', { condition: settings.argv.log } )
        .dumper( 'db', { collection: 'fogbugz.projects', command: 'publish' } )
        .dumper( 'console', { onEnd: true, label: '%s projects being processed', data: "root.count" } )
        .dumper( 'console', { cdata: ["project.ixProject", "project.sProject", "root.count", "root.recursive.depth", {test1: 1, test2: 2, test3: 3}, "test4", ["test5","test6","test7"] ], condition: settings.debug === "testDataAndRootToConsole" } )
        .dumper( 'log', { onEnd: true, label: "testDataAndRootToLog", data: ["project.ixProject", "project.sProject", "root.count", "root.recursive.depth", {test1: 1, test2: 2, test3: 3}, "test4", ["test5","test6","test7"] ], condition: settings.debug === "testDataAndRootToLog" } )
        .done( { data: ["project.ixProject", "project.sProject", "root.count", "root.recursive.depth", {test1: 1, test2: 2, test3: 3}, "test4", ["test5","test6","test7"] ] } );
    })
    .addChannel('allCases', function( project, testixProject, testsProject, testCount, testDepth, testObj, testString, testArray ){
      settings.debug === "testDataAndRootToChannel" && console.log( util.inspect(["project:"+project, testixProject, testsProject, testCount, testDepth, testObj, testString, testArray], false, 10, true) + "\n :done stream Test" )
      this.root.casesPerMilestone = {};      
      this.root.recursive = { depth: { onEnd: "recursiveTest onEnd" } };
      this
        .source( 'cases', { project: project, limit: settings.argv.limit, queryOverride: false } )
        .filter( 'cases' )
        .filter( 'incrCounter' )
        .dumper( 'console', { condition: settings.argv.debug === "allCasesBeforeCleaning" } )
        .filter( 'searchEvents', { condition: settings.argv.search } )
        .filter( 'cleanEvents' )
        .filter( 'rollbackRCM', { condition: settings.argv.date } )
        .filter( 'accumulateCasesPerMilestone' )
        .dumper( 'console', { condition: settings.argv.debug === "allCasesAfterCleaning" } )
        .dumper( 'log', { label: project.sProject, condition: settings.argv.log } )
        .dumper( 'db', { collection: 'fogbugz.tickets', command: 'publish' } )
        .dumper( 'console', { onEnd: true, label: '%s tickets complete for ' + project.sProject, data: "root.count", condition: settings.verbose } )
        .done( { onEnd: true, data: [ project, "root.casesPerMilestone", "root.count", "root.recursive.depth.onEnd", {test1: 1, test2: 2, test3: 3}, "test4", ["test5","test6","test7"] ] } );
    })
    .addChannel('allMilestones', function( project, casesPerMilestone, testCount, testDepthOnEnd, testObj, testString, testArray ){
      settings.debug === "testDataAndRootToChannel" && console.log( util.inspect(["project:"+project, testCount, testDepthOnEnd, testObj, testString, testArray], false, 10, true)+ "\n :done onEnd Test" )
      this.root.casesPerMilestone = casesPerMilestone;
      this
        .source( 'allMilestones', { ixProject: project.ixProject, sProject: project.sProject } )
        .filter( 'milestones' )
        .filter( 'incrCounter' )
        .filter( 'addCasesPerMilestone' )
        .dumper( 'log', { label: project.sProject, condition: settings.argv.log } )
        .dumper( 'db', { collection: 'fogbugz.milestones', command: 'publish' } )
        .dumper( 'console', { label: '%s milestones for ' + project.sProject, data: "root.count", onEnd: true } )
        .done();
    });

}

var url = require('url'),
    querystring = require('querystring'),
    util = require('util');

module.exports = function(streamler){

var through2 = streamler.through2,
    sourcer = streamler.Sourcer,
    columns = "";

columns +='sLatestTextSummary,sProject,ixProject,ixArea,sArea,ixGroup,sGroup,ixBug,ixBugParent,ixBugChildren,fOpen,sTitle,ixPersonAssignedTo';
columns +=',sPersonAssignedTo,ixPersonOpenedBy,ixPersonresolvedBy,ixPersonClosedBy,ixPersonLastEditedBy,ixStatus,sStatus, ixPriority,sPriority';
columns +=',ixFixFor,sFixFor,dtFixFor,sVersionhrsOriginEst,hrsCurrEst,hrsElapsed,ixCategory,sCategory,dtOpened,dtResolved,dtClosed,dtDue,dtLastView';
columns +=',ixRelatedBugs,tags,ixRelatedBugs,plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65,events';

var settings = streamler.extend({}, streamler.settings);
settings.email = settings.argv.u;
settings.password = settings.argv.p;
settings.fogbugzAPIPath = '/api.asp?';

streamler
  .addSource( 'authenticate', function(){
    if(!sourcer.token){
        var query = settings.fogbugzAPIPath + querystring.stringify({cmd: 'logon', email: settings.email, password: settings.password}),
            filedumpOpts = { filename: 'authenticate.xml', swap: false, dump: false },
            parserOpts = { type: 'XMLStream', rule: 'token' },
            stream = sourcer._createStream( url.resolve(settings.ticketHost, query), parserOpts, filedumpOpts ),
            addToken = through2.call(this, function(data){ sourcer.token = data.$text; this.emit("data", sourcer.token); } );
        return stream.pipe(addToken);        
    }else{
        var stream = through2.call(this);
        process.nextTick(function(){
            stream.emit("data", sourcer.token);
            stream.emit("end");
        })
        return stream;
    }
  })
  .addSource( 'allProjects', function() {
    var query = settings.fogbugzAPIPath + querystring.stringify({token: sourcer.token, cmd: 'listProjects'}),
        filedumpOpts = { filename: 'allProjects.xml' },
        parserOpts = { type: 'XMLStream', rule: 'projects.project' },
        stream = sourcer._createStream(url.resolve(settings.ticketHost, query), parserOpts, filedumpOpts);
    return through2.call(this).convert( stream );
  })
  .addSource( 'milestonesPerProject', function( options ) {
    var query = settings.fogbugzAPIPath + querystring.stringify({token: sourcer.token, cmd: 'listFixFors', ixProject: options.ixProject, fIncludeDeleted: 1, fIncludeReallyDeleted: 1}),
        filedumpOpts = { filename: options.sProject + '_allMilestones.xml' },
        parserOpts = { type: 'XMLStream', rule: 'fixfors.fixfor' },
        stream = sourcer._createStream(url.resolve(settings.ticketHost, query), parserOpts, filedumpOpts);
    return through2.call(this).convert( stream );
  })
  .addSource( 'casesPerMilestone', function( options ) {
    var limit = options.limit || settings.argv.limit || false,
        query = options.queryOverride || 'Project:"'+options.sProject+'" Milestone:"'+options.sFixFor+'" (Category:Feature OR Category:Bug)',
        prepq = { token: sourcer.token, cols: columns, cmd: 'search', q: query, max: limit },
        q = settings.fogbugzAPIPath + querystring.stringify(prepq),
        filedumpOpts = { filename: query + '.xml' },
        parserOpts = { type: 'XMLStream', rule: 'cases.case', preserve: ['events'], allowEmptyPass: true },
        stream = sourcer._createStream(url.resolve(settings.ticketHost, q), parserOpts, filedumpOpts);
    return through2.call(this).convert( stream );
  });
}
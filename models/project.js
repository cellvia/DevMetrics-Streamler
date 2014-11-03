var core = require('./core'),
	settings = require('../settings'),
	verbose = false || settings.verbose;

//constructor and prototypes
Project = function(json) {
	var data = json;
	this.Id = data.ixProject;
	this.sproject = data.sProject
}

//Static methods on project
module.exports = (function(){
	var loadFromCollection = core.loadFromCollection.curry(settings.redisPort, settings.redisHost);

	return {
		getAllDev: function(callback) {
			loadFromCollection(Project, 'projects:dev', callback);
		}

		, getAllInbox: function(callback) {
			loadFromCollection(Project, 'projects:inbox', callback);
		}
		
		, getProject: function(Id, callback) {
		    core.loadJson(settings.redisPort, settings.redisHost, 'fogbugz:project:' + Id, function(err, json){
		       var projectobject=null;
		       if (json){
		           projectobject = new Project(json);                      
		       }
		       callback(err, projectobject);		        
		    });
		}
		
		, getAllCasesForProject: function(project, callback){         
            this.executeQuery(project, ":tickets", callback);
        }

        , getBadRCM: function(project, callback)
        {
            this.executeQuery(project, ":invalidRootCause", callback);   
        }
        
        , getBlankRCM: function(project, callback){
            this.executeQuery(project, ":blankRootCause", callback);     
        }

        , getValidQAReturns: function(project, callback){
            this.executeQuery(project, ":validQAReturns", callback);     
        }

        , getOpenAfterReleaseTestingDate: function(project, callback){
            this.executeQuery(project, ":openAfterReleaseTestingDate", callback);    
        }

        , getOpenBeforeReleaseTestingDate: function(project, callback){
            this.executeQuery(project, ":openBeforeReleaseTestingDate", callback);   
        }

        , getPEITickets: function(project, callback){
            this.executeQuery(project, ":PEIs", callback);   
        }

        , getEscapees: function(project, callback){
            this.executeQuery(project, ":releasedDefects", callback);    
        }

        , getUmbrellas: function(project, callback){
            this.executeQuery(project, ":umbrella", callback);   
        }

        , executeQuery: function(project, suffix, callback){
            var members = core.members.curry(settings.redisPort, settings.redisHost);
            members("fogbugz:project:" + project + ":fixfors", suffix, callback);   
        }
		
		, comparator: function(a, b) {
	        return ((a.sProject > b.sProject) - (a.sProject < b.sProject));
		}
	}
})();
var	core = require('./core'),
	settings = require('../settings'),
	verbose = false || settings.verbose;
	
//constructor and prototypes
Case = function(json) {
	var data = JSON.parse(json);
	this.Id = data.ixBug;
	this.stitle = data.sTitle;
	this.sarea = data.sArea;
	this.spersonassignedto = data.sPersonAssignedTo;
	this.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65= data.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65
	this.sstatus = data.sStatus;
	this.spriority = data.sPriority;
	this.ixfixfor = data.ixFixFor;
	this.sfixfor = data.sFixFor;
	this.scategory = data.sCategory;
};

CaseColumn = function(name, title) {
    this.name = name;
    this.title = title;
};

CaseColumn.ALL_CASE_COLUMNS = [
	new CaseColumn('Id', 'Case ID')
	, new CaseColumn('stitle', 'Title')
	, new CaseColumn('sarea', 'Area')
	, new CaseColumn('spersonassignedto', 'Assigned To')	        
	, new CaseColumn('sstatus', 'Status')	        
	, new CaseColumn('spriority', 'Priority')	        
	, new CaseColumn('sfixfor', 'Milestone')	        
	, new CaseColumn('scategory', 'Type')
	, new CaseColumn('plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65', 'RCM')
];

//Static methods on project
module.exports = (function(){
	var loadFromCollection = core.loadFromCollection.curry(settings.redisPort, settings.redisHost);

	return {
		getFixForCases: function(fixfor, sortBy, sortOrder, callback) {
			var sortAlpha = 1;
			if (sortBy == 'Id') {
				sortAlpha = 0;
			}
			loadFromCollection(null, 'fogbugz:fixfor:' + fixfor + ':tickets', callback);
		}
			
		, comparator: function(a, b) {
	        return ((a.Id > b.Id) - (a.Id < b.Id));
		}
		
		, ALL_CASE_COLUMNS: function() {
			return CaseColumn.ALL_CASE_COLUMNS;
		}
	}
})();
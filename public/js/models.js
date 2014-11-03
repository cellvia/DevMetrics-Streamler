FixFor = function(data){
    this.sproject = ko.observable(data.sproject);
    this.sfixfor = ko.observable(data.sfixfor);
};

Project = function(data) {
    this.sproject = ko.observable(data.projects);
};

Case = function(data) {
    this.Id = ko.observable(data.ixBug);
    this.link = ko.observable("https://fogbugz.devid.local/default.asp?"+data.ixBug);
    this.stitle = ko.observable(data.sTitle);
    this.sarea = ko.observable(data.sArea);
    this.spersonassignedto = ko.observable(data.sPersonAssignedTo);
    this.sstatus = ko.observable(data.sStatus);
    this.spriority = ko.observable(data.sPriority);
    this.sfixfor = ko.observable(data.sFixFor);
    this.scategory = ko.observable(data.sCategory);
	if (data.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65.indexOf("object")!=-1)
	    this.srootcause = ko.observable("");
	else
	    this.srootcause = ko.observable(data.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65);
};

CaseColumn = function(name, title) {
	this.name = name;
	this.title = title;
};

CaseColumn.parseData = function(data) {
	var parts = data.split(',');
	return(new CaseColumn(parts[0], parts[1]));
}

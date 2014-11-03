$.extend($.expr[':'],{
	containsExact: function(a,i,m){
		return $.trim(a.innerHTML.toLowerCase()) === m[3].toLowerCase();
	}
});

BadRcmViewModel = function() {
    var self = this;
	self.tableOpen = false;
    self.cases = ko.observableArray([]);
    self.case_columns = ko.observableArray([]);
	self.project = ko.observable();
	self.milestone = ko.observable();
	self.fixforKO = ko.observable();
	self.errorMsg = ko.observable(false);
	self.errorVisible = ko.observable(false);
	self.loading = ko.observable(true);
	self.loaded = ko.observable(false);
	self.fixfor = 0;
	self.ALL_CASES_URL = '/projects/getallbadrcm/:id/cases.json';
    self.FIXFOR_CASES_URL = '/projects/getbadrcm/:fixfor/cases.json';
	self.SELECTED_COLUMN_URL = '/projects/selectedcolumns';

	//private stuff
	var getSelectedColumns = function() {
		var requrl = self.SELECTED_COLUMN_URL
		$.getJSON(self.SELECTED_COLUMN_URL, function(data) {
			self.case_columns(data);
		});
	};
	
	//public
	self.init = function(table) {
		getSelectedColumns();
	};
	
	
	self.sanitizeTable = function(data) {
		
		var map = function(d) {
				return $.map(d, function(item) { return(new Case(item)); });
			};
		
		self.cases(map(data));

	}
	
	self.getCases = function() {
		
        var requrl;

 		if(self.fixfor > 0) {
			requrl = self.FIXFOR_CASES_URL.replace(':fixfor', self.fixfor);
		} else {
			requrl = self.ALL_CASES_URL.replace(':id', milestones.project);
		}
			
		self.errorVisible(false);
		self.loaded(false);
		self.loading(true);
		
        $.getJSON(requrl, function(data){
	
			if(data.length > 0) {
				
				if(self.tableOpen !== false) {

					self.tableOpen.fnDestroy();
					$("#tabs table tbody").empty();

				}
				
				self.sanitizeTable(data);
				self.project(data['0'].sProject);
				
				if(self.fixfor > 0) {
					self.milestone(' > <a href="/projects/' + milestones.project + '/' + self.fixfor + '/">' + data['0'].sFixFor + '</a>');
				} else {
					self.milestone('');
				}
				
				setTimeout(function(){
					
					self.addTableSorting();
					self.loading(false);
					self.loaded(true);
					
				}, 0);
				
			} else {
				
				self.loading(false);
				self.errorMsg('There are no results!');
				self.errorVisible(true);
				
			}

        });
    };

    self.addTableSorting = function() {
	
		self.tableOpen = $('#badRcmTable table').dataTable( {
			"bPaginate": false,
		    "bLengthChange": false,
	        "bFilter": false,
	        "bSort": true,
	        "bInfo": false,
	        "bAutoWidth": false,
			"bDestroy": true,
			"aaSorting": [[ 0, "asc" ]]
		});
		
		setTimeout(function(){
			$('table span.label').each(function(){
				var $this = $(this),
					$text = $(this).text();

				$this.removeClass('label-warning').removeClass('label-important');
				if($text === 'Critical' || $text === 'Bug') {
					$this.addClass('label-important');
				} else if($text === 'High') {
					$this.addClass('label-warning');
				}
			});
		},0);
	
	}
	
	self.getColumnTemplate = function(item) {
		
		var ret;

		switch(item.name) {
			
			case 'scategory':
			case 'spriority':
				ret = "column-tag"
			break;
			
			case 'Id':
				ret = 'column-id'
			break;
			
			default:
				ret = 'column-normal'
			
		}
		
		return ret;
		
	}
};

$(function() {
    var badrcmviewmodel = new BadRcmViewModel();                               

	badrcmviewmodel.init('#project');
    ko.applyBindings(badrcmviewmodel);

    //hook up on-clicks for milestones
    $('a[data-fixfor="' + milestones.milestone + '"]').each(function(){
	
		var $this = $(this),
			fixfor = $this.attr('data-fixfor'),
			url = "/projects/badrcm/" + milestones.project + "/";
			
		$('.menuButton').removeClass('btn-primary').addClass('btn-info');
		$this.removeClass('btn-info').addClass('btn-primary');
		badrcmviewmodel.fixfor = $this.attr('data-fixfor');
		badrcmviewmodel.fixforKO(badrcmviewmodel.fixfor);
		milestones.milestone = badrcmviewmodel.fixfor;
		if(fixfor > 0) {
			url = url +  fixfor;
		}
		badrcmviewmodel.getCases();
    });
    	
});

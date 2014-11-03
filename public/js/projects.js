$.extend($.expr[':'],{
	containsExact: function(a,i,m){
		return $.trim(a.innerHTML.toLowerCase()) === m[3].toLowerCase();
	}
});

ProjectViewModel = function() {
    var self = this;
	self.tableOpen = false;
	self.tableClosed = false;
	self.tableResolved = false;
	self.tableDefOpen = false;
	self.tableDefClosed = false;
	self.tableDefResolved = false;
    self.case_columns = ko.observableArray([]);
	self.cases_open = ko.observableArray([]);
    self.cases_resolved = ko.observableArray([]);
    self.cases_closed = ko.observableArray([]);
    self.cases_defect_open = ko.observableArray([]);
    self.cases_defect_resolved = ko.observableArray([]);
    self.cases_defect_closed = ko.observableArray([]);
	self.milestoneTotalTickets = ko.observable();
	self.milestoneView = ko.observable(false);
	self.projectView = ko.observable(false);
	self.defectsView = ko.observable(false);
	self.project = ko.observable();
	self.chartLink = ko.observable();
	self.milestone = ko.observable();
	self.fixforKO = ko.observable();
	self.milestoneEscapedDefects = ko.observable();
	self.milestoneOverdue = ko.observable(false);
	self.milestoneStartDate = ko.observable();
	self.milestoneDueDate = ko.observable();
	self.milestonePEI = ko.observable();
	self.milestoneBadRCM = ko.observable();
	self.validQAReturns = ko.observable();
	self.openAfterReleaseTestingDate = ko.observable();
	self.openBeforeReleaseTestingDate = ko.observable();
	self.milestoneBlankRCM = ko.observable();
	self.milestoneEscapees = ko.observable();
	self.milestoneUmbrellas = ko.observable();
	self.pendingReviewAvg = ko.observable();
	self.noEstimateCases = ko.observable();
	self.milestoneOpenTickets = ko.observable();
	self.milestoneClosedTickets = ko.observable();
	self.errorMsg = ko.observable(false);
	self.errorVisible = ko.observable(false);
	self.loading = ko.observable(true);
	self.topmenu = ko.observable(true);
	self.loaded = ko.observable(false);
	self.fixfor = 0;
	self.sortBy = '';
	self.sortOrder = '';
	self.PageSize = ko.observable();
    self.FIXFOR_CASES_URL = '/projects/:id/fixfors/:fixfor/cases.json';
	self.BADRCM_CASES_URL = '/projects/:id/badrcm/:fixfor/cases.json';
	self.BLANKRCM_CASES_URL = '/projects/:id/blankrcm/:fixfor/cases.json';
	self.PEI_CASES_URL = '/projects/:id/peis/:fixfor/cases.json';
	self.ESCAPEES_CASES_URL = '/projects/:id/escapees/:fixfor/cases.json';
	self.UMBRELLA_CASES_URL  = '/projects/:id/umbrellas/:fixfor/cases.json';
	self.VALIDQARETURNS_CASES_URL = '/projects/:id/validqareturns/:fixfor/cases.json';
	self.OPENAFTERRELEASETESTINGDATE_CASES_URL = '/projects/:id/openafterreleasetestingdate/:fixfor/cases.json';
	self.OPENBEFORERELEASETESTINGDATE_CASES_URL = '/projects/:id/openbeforereleasetestingdate/:fixfor/cases.json';
	self.SELECTED_COLUMN_URL = '/projects/selectedcolumns';
	self.sortingTable = {
		
		Open: ["Active", "Assigned", "Current", "Future", "Info Needed", "New", "Rejected"],
		Resolved: ["Resolved (Already Exists)", "Resolved (By Design)", "Resolved (Canceled)", "Resolved (Completed)", "Resolved (Duplicate)", "Resolved (In Development)", "Resolved (Needs Review)", "Resolved (Not Reproducible)", "Resolved (Postponed)", "Resolved (Ready for Test)", "Resolved (Responded)", "Resolved (SPAM)", "Resolved (Stubbed)", "Resolved (Waiting For Info)", "Resolved (Won't Fix)", "Resolved (Won't Implement)", "Resolved (Won't Respond)"],
		Close: ["Approved","Abandoned - No Consensus", "Closed (Approved)", "Closed (Ready for Test)", "Closed (Completed)", "Closed (Needs Review)", "Closed (Duplicate)", "Closed (Won't Implement)", "Closed (By Design)", "Closed (Won't Fix)"]

	}
	
	//private stuff
	var getSelectedColumns = function() {
		$.getJSON(self.SELECTED_COLUMN_URL, function(data) {
			self.case_columns(data);
		});
	};
	
	var getUrlParams = function() {
		
		var url = window.location.pathname,
			urlParams = [],
			returnedParams = [];
		urlParams = url.split('/');
		returnedParams['project'] = urlParams['2'];
		if(!urlParams['3']) {
			returnedParams['milestone'] = '0';
		} else {
			returnedParams['milestone'] = urlParams['3'];
		}
		if(!urlParams['4']) {
			returnedParams['filter'] = 'all';
		} else {
			returnedParams['filter'] = urlParams['4'];
		}
		return returnedParams;
	}
	
	var updateMilestone = function(fixfor, filter) {
		self.fixfor = fixfor;
		self.fixforKO(self.fixfor);
		milestones.milestone = self.fixfor;
		self.fixfor = fixfor;
		self.fixforKO(self.fixfor);
		milestones.milestone = self.fixfor;
		self.topmenu(false);
		if(fixfor > 0) {
			
			self.milestoneView(true);
			self.projectView(false);
			self.getCases(filter);
			
		} else {
			self.milestoneView(false);
			self.projectView(true);
			$('select.focus').val('all');
		}
	}
	
	//public
	self.init = function(table) {
		getSelectedColumns();
		var urlParams = getUrlParams();
		updateMilestone(urlParams['milestone'], urlParams['filter']);
		self.listeners();
	};
	
	self.listeners = function(){
		
		window.onpopstate = function(event) {
		  	var url = getUrlParams();
		  	$('select.focus').val(url['filter']);
		 	$('select.fixfor').val(url['milestone']);
			updateMilestone(url['milestone'], url['filter']);
		};
		
		//hook up on-clicks for milestones
	    $('select.fixfor').change(function() {
			var $this = $(this),
				currentUrl = getUrlParams(),
				url = "/projects/" + milestones.project,
				fixfor = $this.find('option:selected').val();
			updateMilestone(fixfor);
			if(fixfor > 0) {
				$('select.focus').val(currentUrl['filter']).trigger('change');
			} else {
				if (history.pushState) {
					history.pushState({page: url}, null, url);
				}
			}
			
	    });
	
		$('select.focus').change(function(){
			var filter = $(this).find('option:selected').val(),
				url = "/projects/" + milestones.project + "/" + self.fixfor;
			if(filter !== 'all') {
				url = url + "/" + filter;
			} 
			self.getCases(filter);
			if (history.pushState) {
				history.pushState({page: url}, null, url);
			}
		});
		
	};
	
	self.milestoneData = function() {
		
		var currentTime = new Date().getTime(),
			goodDate = function(date) {
				if (date==null || date=="0") return "N/A";
				var dateString = new Date(date),
					month = dateString.getMonth() + 1,
					day = dateString.getDate(),
					year = dateString.getFullYear(),
					ret;
				if(isNaN(month)|| date==0) {
					ret = 'N/A';
				} else {
					ret = month + '/' + day + '/' + year;
				}
				return ret;
			},
			dateToUnix = function(date) {
				var dateString = new Date(date);
				return dateString.getTime();
			};
		
		self.milestoneStartDate(goodDate(milestones.startdates[self.fixfor]));
		self.milestoneDueDate(goodDate(milestones.duedates[self.fixfor]));
		self.milestoneOpenTickets(typeof(milestones.openTickets[self.fixfor]) !== 'undefined'? milestones.openTickets[self.fixfor] : Utilities.sum(milestones.openTickets));
		self.milestoneClosedTickets(typeof(milestones.closedTickets[self.fixfor]) !== 'undefined'? milestones.closedTickets[self.fixfor] : Utilities.sum(milestones.closedTickets));
	    self.milestonePEI(typeof(milestones.peis[self.fixfor]) !== 'undefined'? milestones.peis[self.fixfor]  : Utilities.sum(milestones.peis));
		self.milestoneBadRCM(typeof(milestones.badRCM[self.fixfor]) !== 'undefined'? milestones.badRCM[self.fixfor] : Utilities.sum(milestones.badRCM));
		self.validQAReturns(typeof(milestones.validQAReturns[self.fixfor]) !== 'undefined'? milestones.validQAReturns[self.fixfor] : Utilities.sum(milestones.validQAReturns));
		self.openAfterReleaseTestingDate(typeof(milestones.openAfterReleaseTestingDate[self.fixfor]) !== 'undefined'? milestones.openAfterReleaseTestingDate[self.fixfor] : Utilities.sum(milestones.openAfterReleaseTestingDate));
		self.openBeforeReleaseTestingDate(typeof(milestones.openBeforeReleaseTestingDate[self.fixfor]) !== 'undefined'? milestones.openBeforeReleaseTestingDate[self.fixfor] : Utilities.sum(milestones.openBeforeReleaseTestingDate));
		self.milestoneBlankRCM(typeof(milestones.blankRCM[self.fixfor]) !== 'undefined'? milestones.blankRCM[self.fixfor] : Utilities.sum(milestones.blankRCM));
	    self.milestoneEscapees(typeof(milestones.escapedDefects[self.fixfor]) !== 'undefined'? milestones.escapedDefects[self.fixfor] : Utilities.sum(milestones.escapedDefects)); 
		self.milestoneUmbrellas(typeof(milestones.umbrellas[self.fixfor]) !== 'undefined'? milestones.umbrellas[self.fixfor] : Utilities.sum(milestones.umbrellas));
		self.pendingReviewAvg(Number(typeof(milestones.pendingReviewAvg[self.fixfor]) !== 'undefined'? milestones.pendingReviewAvg[self.fixfor] : Utilities.sum(milestones.pendingReviewAvg)).toFixed(1)+" days");
		self.milestoneEscapedDefects(typeof(milestones.escapedDefects[self.fixfor]) !== 'undefined'? milestones.escapedDefects[self.fixfor] : Utilities.sum(milestones.escapedDefects));
		self.noEstimateCases(milestones.noEstimateCases[self.fixfor]);

		if(dateToUnix(milestones.duedates[self.fixfor]) > currentTime && (self.cases_open.length > 0 || self.cases_resolved.length > 0)) {
			self.milestoneOverdue(true);
		} else {
			self.milestoneOverdue(false);
		}
		
		self.chartLink(' (<a href="/reports/ticketsByMilestone/' + self.fixfor + '">View Timeline</a>)');
		
	}
	
	self.seperateTablesByStatus = function(type, data) {
	
		var open = [],
			resolved = [],
			closed = [],
			openDefect = [],
			resolvedDefect = [],
			closedDefect = [],
			closedRegEx =  /closed|approved|abandoned/i,
			resolvedRegEx = /resolved/i,
			reg = null,
			regexValue = function(value) {
			
				var ret;
				
				if(closedRegEx.test(value)) {
					ret = 'closed';
				} else if(resolvedRegEx.test(value)) {
					ret = 'resolved';
				} else {
					ret = 'open';
				}

				return ret;
				
			},
			total = 0;
		
		$.each(data, function(index, value) {
			
			reg = regexValue(value.sStatus);
			
			switch(reg) {
				case 'open':
					open.push(new Case(data[index]));
					if(type === 'all' && value.sCategory === 'Bug') {
						openDefect.push(new Case(data[index]));
					}
					break;
				case 'resolved':
					resolved.push(new Case(data[index]));
					if(type === 'all' && value.sCategory === 'Bug') {
						resolvedDefect.push(new Case(data[index]));
					}
					break;
				
				case 'closed':
					closed.push(new Case(data[index]));
					if(type === 'all' && value.sCategory === 'Bug') {
						closedDefect.push(new Case(data[index]));
					}
					break;
			}

		});

		self.cases_open(open);
		self.cases_resolved(resolved);
		self.cases_closed(closed);
		
		if(type === 'all') {
			self.cases_defect_open(openDefect);
			self.cases_defect_resolved(resolvedDefect);
			self.cases_defect_closed(closedDefect);
			self.defectsView(true);
		} else {
			self.defectsView(false);
		}
		
	}
	
	self.getCases = function(type) {
		
        var requrl;

		switch(type) {
			case 'peis':
				requrl = self.PEI_CASES_URL.replace(':fixfor', self.fixfor);
				break;
			case 'escapees':
				requrl = self.ESCAPEES_CASES_URL.replace(':fixfor', self.fixfor);
				break;
			case 'umbrellas':
				requrl = self.UMBRELLA_CASES_URL.replace(':fixfor', self.fixfor);
				break;
			case 'badrcm':
				requrl = self.BADRCM_CASES_URL.replace(':fixfor', self.fixfor);
				break;
			case 'blankrcm':
				requrl = self.BLANKRCM_CASES_URL.replace(':fixfor', self.fixfor);
				break;
			case 'validQAReturns':
				requrl = self.VALIDQARETURNS_CASES_URL.replace(':fixfor', self.fixfor);
				break;
			case 'openAfterReleaseTestingDate':
				requrl = self.OPENAFTERRELEASETESTINGDATE_CASES_URL.replace(':fixfor', self.fixfor);
				break;
			case 'openBeforeReleaseTestingDate':
				requrl = self.OPENBEFORERELEASETESTINGDATE_CASES_URL.replace(':fixfor', self.fixfor);
				break;
			case 'all':
				requrl = self.FIXFOR_CASES_URL.replace(':fixfor', self.fixfor);
				break;
		}
 	      
 	    if(requrl)
            requrl = requrl.replace(':id', milestones.project);  
		self.casesJsonRequest(type, requrl);

	}
	
	self.casesJsonRequest = function(type, requrl) {
		
		var containerDiv = null,
			selectTab = [],
			disabledTabs = [],
			i = 0;
			
		self.errorVisible(false);
		self.loaded(false);
		self.loading(true);
		
        $.getJSON(requrl, function(data){
	
			if(data.length > 0) {
				
				containerDiv = $('#casesTabs');
						
				if(self.tableOpen !== false) {

					self.tableOpen.fnDestroy();
					self.tableClosed.fnDestroy();
					self.tableResolved.fnDestroy();
					self.tableDefOpen.fnDestroy();
					self.tableDefClosed.fnDestroy();
					self.tableDefResolved.fnDestroy();
					containerDiv.find("table tbody").empty();
					
				}
				
				setTimeout(function(){
					
					self.seperateTablesByStatus(type, data);
					self.milestone(' > ' + data['0'].sFixFor);
					self.project(data['0'].sProject);
					self.addAllCasesTableSorting();
					
				}, 0);
			
				setTimeout(function(){
				
					containerDiv.find("ul li a span").each(function(){
						var $this = $(this);
						
						if($this.text() > 0) {
							selectTab.push(this);
							$this.addClass('badge-important');
							$this.closest('a').attr("data-toggle", "tab").css({'cursor': 'pointer'});
						} else {
							$this.removeClass('badge-important');
							$this.closest('a').removeAttr("data-toggle").css({'cursor': 'not-allowed'}).on("click", function(event){
								event.preventDefault();
							});
						}
						i++;
					});
					
					$(selectTab[0]).closest('a').click();

				},0);
				
				
				setTimeout(function(){
					
					containerDiv.find('table span.label').each(function(){
						var $this = $(this),
							$text = $this.text();

						$this.removeClass('label-warning').removeClass('label-important');
						if($text === 'Critical' || $text === 'Bug') {
							$this.addClass('label-important');
						} else if($text === 'High') {
							$this.addClass('label-warning');
						}
					});
					
					self.milestoneData();
					self.loading(false);
					self.loaded(true);
					self.topmenu(true);
				
				}, 0);
				
			} else {
				
				self.milestoneData();
				self.loading(false);
				self.errorMsg('There are no results!');
				self.errorVisible(true);
				self.topmenu(true);
				
			}
			
        });
    };

    self.addAllCasesTableSorting = function() {
	
		self.tableOpen = $('#openTable table').dataTable( {
			"bPaginate": true,
			"sPaginationType": "full_numbers",
		    "bLengthChange": false,
	        "bFilter": false,
	        "bSort": true,
	        "bInfo": false,
	        "bAutoWidth": false,
			"bDestroy": true,
			"aaSorting": [[ 0, "asc" ]]
		});

		self.tableResolved = $('#resolvedTable table').dataTable( {
			"bPaginate": true,
			"sPaginationType": "full_numbers",
		    "bLengthChange": false,
	        "bFilter": false,
	        "bSort": true,
	        "bInfo": false,
	        "bAutoWidth": false,
			"bDestroy": true,
			"aaSorting": [[ 0, "asc" ]]
		});

		self.tableClosed = $('#closedTable table').dataTable( {
			"bPaginate": true,
			"sPaginationType": "full_numbers",
		    "bLengthChange": false,
	        "bFilter": false,
	        "bSort": true,
	        "bInfo": false,
	        "bAutoWidth": false,
			"bDestroy": true,
			"aaSorting": [[ 0, "asc" ]]
		});

		self.tableDefOpen = $('#openDefectsTable table').dataTable( {
			"bPaginate": true,
			"sPaginationType": "full_numbers",
		    "bLengthChange": false,
	        "bFilter": false,
	        "bSort": true,
	        "bInfo": false,
	        "bAutoWidth": false,
			"bDestroy": true,
			"aaSorting": [[ 0, "asc" ]]
		});

		self.tableDefResolved = $('#resolvedDefectsTable table').dataTable( {
			"bPaginate": true,
			"sPaginationType": "full_numbers",
		    "bLengthChange": false,
	        "bFilter": false,
	        "bSort": true,
	        "bInfo": false,
	        "bAutoWidth": false,
			"bDestroy": true,
			"aaSorting": [[ 0, "asc" ]]
		});

		self.tableDefClosed = $('#closedDefectsTable table').dataTable( {
			"bPaginate": true,
			"sPaginationType": "full_numbers",
		    "bLengthChange": false,
	        "bFilter": false,
	        "bSort": true,
	        "bInfo": false,
	        "bAutoWidth": false,
			"bDestroy": true,
			"aaSorting": [[ 0, "asc" ]]
		});
	
	}
	
	self.getColumnTemplate = function(item) {
		
		var ret;

		if(item.name === 'scategory' || item.name === 'spriority') {
			
			ret = "column-tag";
		
		} else if(item.name === 'Id') {
			
			ret = "column-id";
			
		} else {
			
			ret = "column-normal";
		
		}
		
		return ret;
		
	}
};

$(function() {
	
    var projectviewmodel = new ProjectViewModel();                               
	projectviewmodel.init('#project');
    ko.applyBindings(projectviewmodel);

	// charts
	
	function createDropdowns(dropdownId, categories){
		
		var i = 0,
			checkData,
			$dropdownId = $(dropdownId),
			selectBoxes = '<li class="dropDownSelectOptions"><a href="#" class="selectAllSelections">Select All</a> - <a href="#" class="clearAllSelections">Clear</a></li>';
			
		$dropdownId.empty();
		
		$dropdownId.append(selectBoxes);
		
		for(category in categories) {
			checkData = '<li><label class="checkbox"><input type="checkbox" value="' + (categories.length - 1 - i) + '"';
			if(i < 6) {
				checkData = checkData + ' checked ';
			}
			checkData = checkData + ' /> ' + categories[(categories.length - 1 - i)] + '</label></li>';
			$dropdownId.append(checkData);
			i = i + 1;
		}
		
		$dropdownId.append(selectBoxes);

	}
	
	var createChart = {
		
		init: function(dropdownId, categories, chartData, options){
			this.categories = categories;
			this.chartData = chartData;
			this.options = options;
			this.dropdownId = $(dropdownId);
			this.monitorDropdown();
			this.checkClicks();
		},
		
		checkClicks: function(){
			
			var self = this;
			self.options.xAxis.categories = [];
			self.options.series[0].data = [];
			self.dropdownId.find(':checkbox').each(function(){
				var $this = $(this),
					val = $this.val();
				if($this.is(':checked')) {
					self.options.xAxis.categories.unshift(self.categories[val]);
					self.options.series[0].data.unshift(self.chartData[val]);
				}
			});
			setTimeout(function(){
				self.generateChart();
			}, 0);
			
		},
		
		monitorDropdown:function(){
			var self = this;
			self.dropdownId.on('click', ':checkbox', function(){
				self.checkClicks();
			});
			self.dropdownId.on('click', '.selectAllSelections', function(e){
				e.stopPropagation();
				self.dropdownId.find(':checkbox').attr('checked', 'checked');
				setTimeout(function(){
					self.checkClicks();
				}, 0);
			});
			self.dropdownId.on('click', '.clearAllSelections', function(e){
				e.stopPropagation();
				self.dropdownId.find(':checkbox').attr('checked', false);
				setTimeout(function(){
					self.checkClicks();
				}, 0);
			})
			
		},
		
		generateChart: function() {
			new Highcharts.Chart(this.options);
		}
	}
	
	var generateCharts = {
		
		defectsOrigination: { 
		
			options: {

		        chart: { renderTo: 'defectsOrigination', type: 'line' },
				legend: {enabled: false},
				credits: {enabled: false},
		        title: { text: 'Escapees' },
		        xAxis: { categories: [], title: { text: 'Milestones' }, labels: {rotation: 60, align:'left'} },
		        yAxis: { title: { text: 'Escapees' }, allowDecimals: false, min:0, alternateGridColor: '#f1f5fb' },
		        series: [
		            {
		                name: 'Escapees',
		                data: []
		            }
		        ]

		    },
		
			selectID: '#defectsSelect'
		
		},
		
		defectsAssigned: { 
		
			options: {

		        chart: { renderTo: 'defectsAssigned', type: 'line' },
				legend: {enabled: false},
				credits: {enabled: false},
		        title: { text: 'PEIs' },
		        xAxis: { categories: [], title: { text: 'Milestones' }, labels: {rotation: 60, align:'left'} },
		        yAxis: { title: { text: 'PEIs' }, allowDecimals: false, min:0, alternateGridColor: '#f1f5fb' },
		        series: [
		            {
		                name: 'PEIs',
		                data: []
		            }
		        ]

		    },
		
			selectID: '#defectsSelect'
		
		},

                totalCases: {

                        options: {

                        chart: { renderTo: 'totalCases', type: 'line' },
                                legend: {enabled: false},
                                credits: {enabled: false},
                        title: { text: 'Total Cases' },
                        xAxis: { categories: [], title: { text: 'Milestones' }, labels: {rotation: 60, align:'left'} },
                        yAxis: { title: { text: 'Total' }, allowDecimals: false, min:0, alternateGridColor: '#f1f5fb' },
                        series: [
                            {
                                name: 'Total Cases',
                                data: []
                            }
                        ]

                    },

                        selectID: '#defectsSelect'

                },
              	percentEscapees: {

                        options: {

                        chart: { renderTo: 'percentEscapees', type: 'line' },
                                legend: {enabled: false},
                                credits: {enabled: false},
                        title: { text: 'Percent Escapees' },
                        xAxis: { categories: [], title: { text: 'Milestones' }, labels: {rotation: 60, align:'left'} },
                        yAxis: { title: { text: 'Percent' }, allowDecimals: false, min:0, alternateGridColor: '#f1f5fb', labels:{formatter:function(){return Highcharts.numberFormat(this.value,2)+"%";}} },
                        series: [
                            {
                                name: 'Percent Escapees',
                                data: []
                            }
                        ],

                    },

                        selectID: '#defectsSelect'

                }
,
                pendingReviewAvg: {

                        options: {

                        chart: { renderTo: 'pendingReviewAvg', type: 'line' },
                                legend: {enabled: false},
                                credits: {enabled: false},
                        title: { text: 'Pending Review Avg' },
                        xAxis: { categories: [], title: { text: 'Milestones' }, labels: {rotation: 60, align:'left'} },
                        yAxis: { title: { text: 'Days' }, allowDecimals: false, min:0, alternateGridColor: '#f1f5fb' },
                        series: [
                            {
                                name: 'Pending Review Avg (Days)',
                                data: []
                            }
                        ],

                    },

                        selectID: '#defectsSelect'

                }



		
	}
	
	//dropdowns
	createDropdowns('#defectsSelect', chartData.milestoneNames);
	
	$('#projectInfo').on('click', '.dropdown-menu input, .dropdown-menu label', function(e) {
		e.stopPropagation();
	});
	
	
	//display charts
	setTimeout(function(){
		var generateDefectsOrigination = jQuery.extend(true, {}, createChart);
		generateDefectsOrigination.init(generateCharts.defectsOrigination.selectID, chartData.milestoneNames, chartData.chartEscapees, generateCharts.defectsOrigination.options);
		var generateDefectsAssigned = jQuery.extend(true, {}, createChart);
		generateDefectsAssigned.init(generateCharts.defectsAssigned.selectID, chartData.milestoneNames, chartData.chartPEIs, generateCharts.defectsAssigned.options);
		var generateTotal = jQuery.extend(true, {}, createChart);
		generateTotal.init(generateCharts.totalCases.selectID, chartData.milestoneNames, chartData.chartTotal, generateCharts.totalCases.options);
		var generatePercentEscapees = jQuery.extend(true, {}, createChart);
		generatePercentEscapees.init(generateCharts.percentEscapees.selectID, chartData.milestoneNames, chartData.chartPercentEscapees, generateCharts.percentEscapees.options);
		var generatePendingReviewAvg = jQuery.extend(true, {}, createChart);
		generatePendingReviewAvg.init(generateCharts.pendingReviewAvg.selectID, chartData.milestoneNames, chartData.chartPendingReviewAvg, generateCharts.pendingReviewAvg.options);
	}, 0);

    	
});

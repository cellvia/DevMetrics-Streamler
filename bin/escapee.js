var util = require('util'),
    eventEmitter = require('events').EventEmitter,
    projectsModel = require('../models/project');

var Report = function() {
    'use strict';
    var that = this, 
    today = new Date(Date());
    this.count = 0;
    this.projectIds = [];
    this.projects = {};
    this.results = [];
    this.months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    this.startDate = '';//new Date(today.getFullYear(), 0, 1);
    this.endDate =  '';//today;
    this.milestoneWiseEscapees = {};
    
    this.execute = function(start, end) {
        this.startDate = start || new Date(today.getFullYear(), 0, 1);
        this.endDate = end || today;
        projectsModel.getAllDev(this.processProjects);
    };
    this.handleError = function(err) {
        throw new Error(err);
    };

    this.processProjects = function(err, results) {
        if (err)
            that.handleError();
        console.log('Found ' + results.length + " projects");
        (results||[]).forEach(function(proj) {
            console.log(proj.sProject);
            that.projectIds.push(proj.ixProject);
            that.projects["" + proj.ixProject] = proj;
            projectsModel.getEscapees(proj.ixProject, that.processEscapees);
        });
    };
    this.processEscapees = function(err, escapees) {                
        if (err)
            that.handleError();
        
        that.toProcess++;
        var pid;
        console.log("found "+ escapees.length+" escapees!");
        (escapees||[]).forEach(function(escapee) {                
            var escOpenDate = new Date(escapee.dtOpened);
                /*if (escapee.dtOpened.indexOf('2013-11')>=0){
                    console.log(escapee.dtOpened + " "+ escOpenDate);
                }*/
            if (escOpenDate.getYear() !== that.startDate.getYear()) {
                return;
            }
            pid = "" + escapee.ixProject;            
            if (! that.projects[pid].hasOwnProperty('escapeeList')) {
                that.projects[pid].escapeeList = [];
            }
            that.projects[pid].escapeeList.push(escapee);
         });
         that.generateReport(pid);
        
    };
    
    this.generateReport = function(pid) {
        that.count++;
        console.log(that.count + " of " + that.projectIds.length);
        var dateStart = that.startDate;
        var dateEnd = that.endDate;
        if (pid){            
            var proj = that.projects[pid];
            if (!proj || !proj.hasOwnProperty('escapeeList')) {
                return;
            }
            var milestones = proj.escapeeList;
            var wrapper = {
                pid: pid,
                pname: proj.sProject,
                items: {}
            };
            var oxs = wrapper.items;
            that.months.forEach(function(month) {
                oxs[month] = {};
            });
            milestones.forEach(function(escapee) {
                var escOpenDate = new Date(escapee.dtOpened);
                var month = that.months[escOpenDate.getMonth()];
                var milestone = escapee.sFixFor.toLowerCase();
                var actmilestone = escapee.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65.trim().toLowerCase();
                if (!oxs[month].hasOwnProperty(actmilestone)) {
                    oxs[month][actmilestone] = 1;
                } else {
                    oxs[month][actmilestone] += 1;
                }
            });
            that.results.push(wrapper);
        }
        
        if (that.count === that.projectIds.length) {
            console.log('COMPLETED!!');
            console.log(that.results.length);
            that.emit('complete');
            
        }
    };
};

util.inherits(Report, eventEmitter);
var rep = new Report();
module.exports = rep;

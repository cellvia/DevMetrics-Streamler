var util = require("util");

module.exports = function(streamler){

  var through2 = streamler.through2,
      client = streamler.client;
      var defaults = 
          { PEIs: 0,
            releasedDefects: 0,
            invalidRootCause: 0,
            blankRootCause: 0,
            umbrella: 0,
            srd: 0 }

  /************FILTERS********************/
  streamler
    .addFilter('milestones', function(){
      return through2.call(this, function(milestone){
        streamler.extend(milestone, defaults)
        this.root.milestoneMap[milestone.ixProject] = this.root.milestoneMap[milestone.ixProject] || {};
        this.root.milestoneMap[milestone.ixProject][milestone.sFixFor.toLowerCase()] = milestone;
        this.emit("data", milestone);
      });
    })
    .addFilter('tickets', function(){
      return through2.call(this, function(ticket){

          //console.log(util.inspect(ticket));
        if(!this.root.milestoneMap[ticket.ixProject]){
          //process.exit();
          this.root.milestoneMap[ticket.ixProject] = {};
        } 
        if(!this.root.milestoneMap[ticket.ixProject][ticket.sFixFor.toLowerCase()]){
          //console.log(ticket.ixProject + ticket.sFixFor);
          //process.exit();
          this.root.milestoneMap[ticket.ixProject][ticket.sFixFor.toLowerCase()] = streamler.extend({ sFixFor: 'Undecided', ixFixFor: parseInt(ticket.ixProject+'00000'), ixProject: ticket.ixProject }, defaults);
        }
        this.emit("data", ticket);
      });
    })
    .addFilter( 'buildDefectReport', function(){
      return through2.call(this, function(ticket){
        if (ticket.tags) {
          var lower = ticket.tags.toLowerCase(),
              key = 'fogbugz:ticket:' + ticket.ixBug;
          //should this get tagged to the originating milestone instead of the target milestone???          
          if( ~lower.indexOf('srd') ){
            client.sadd('fogbugz:fixfor:' + ticket.ixFixFor + ':srd', key);
            this.root.milestoneMap[ticket.ixProject][ticket.sFixFor.toLowerCase()].srd++;
          } 
          if( ~lower.indexOf('umbrella') ){
            client.sadd('fogbugz:fixfor:' + ticket.ixFixFor + ':umbrella', key);
            this.root.milestoneMap[ticket.ixProject][ticket.sFixFor.toLowerCase()].umbrella++;
          }
        }
        this.emit("data", ticket);
      });
    })
    .addFilter( 'releasedDefects', function(){
      return through2.call(this, function(ticket){
        var milestoneMap = this.root.milestoneMap,
            discoveryMilestone = ticket.sFixFor,
            rootCauseMilestone = ticket.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65,
            category = ticket.sCategory,
            status = ticket.sStatus;
        
        if ( IsBug(category) &&
             IsValidMilestone(discoveryMilestone) && 
             IsValidMilestone(rootCauseMilestone) &&   
             rootCauseMilestone.toLowerCase() !== discoveryMilestone.toLowerCase())
        {
          var milestones = milestoneMap[ticket.ixProject],
              key = 'fogbugz:ticket:' + ticket.ixBug;
          if (milestones) {
            var fixfor = milestones[rootCauseMilestone.toLowerCase()];
            if ( fixfor ) {
              if ( IsValidStatus(status) ) {
                milestoneMap[ticket.ixProject][rootCauseMilestone.toLowerCase()].releasedDefects++;
                client.sadd('fogbugz:fixfor:' + fixfor.ixFixFor + ':releasedDefects', key);
              }
            } else if (IsNonLegacyMilestone(rootCauseMilestone)){
              milestoneMap[ticket.ixProject][ticket.sFixFor.toLowerCase()].invalidRootCause++;
              client.sadd('fogbugz:fixfor:' + ticket.ixFixFor + ':invalidRootCause', key);
            }
          }
        }
        this.emit("data", ticket);
      });
    })
    .addFilter( 'blankDefects', function(){
      return through2.call(this, function(ticket){
        var discoveryMilestone = ticket.sFixFor,
            rootCauseMilestone = ticket.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65,
            category = ticket.sCategory;
            status = ticket.sStatus;

        if ( IsBug(category) &&
             IsValidMilestone(discoveryMilestone) &&
             IsNullOrEmpty(rootCauseMilestone))
        {
    		if (status.toLowerCase().indexOf("closed")>-1 || status.toLowerCase().indexOf("resolved")>-1){
 	           this.root.milestoneMap[ticket.ixProject][ticket.sFixFor.toLowerCase()].blankRootCause++;}
            client.sadd('fogbugz:fixfor:' + ticket.ixFixFor + ':blankRootCause', 'fogbugz:ticket:' + ticket.ixBug);            
        }
        this.emit("data", ticket);
      });
    })
    .addFilter( 'PEIs', function(){
      return through2.call(this, function(ticket){
        var discoveryMilestone = ticket.sFixFor,
            rootCauseMilestone = ticket.plugin_customfields_at_fogcreek_com_rootxcausexmilestonek65,
            category = ticket.sCategory;  
        
        if ( IsBug(category) &&
             IsValidMilestone(discoveryMilestone) && 
             IsValidMilestone(rootCauseMilestone) &&   
             rootCauseMilestone.toLowerCase() !== discoveryMilestone.toLowerCase() )
        {
          //Not validating RC Milestone against valid milestones for the project at this time 
          this.root.milestoneMap[ticket.ixProject][ticket.sFixFor.toLowerCase()].PEIs++;
          //Not validating RC Milestone against valid milestones for the project at this time 
          client.sadd('fogbugz:fixfor:' + ticket.ixFixFor + ':PEIs', 'fogbugz:ticket:' + ticket.ixBug);             
        }
        this.emit("data", ticket);
      });
    })
    .addFilter('disassembleToMilestones', function(){
      return through2.call(this, function(milestoneMap){
        //console.log(milestoneMap+"milestoneMap");
        for(var proj in milestoneMap){
          for(var mile in milestoneMap[proj]){
            this.emit("data", milestoneMap[proj][mile]);
          }
        }
      });
    });
    
}


function IsBug(category) {
  return (!IsNullOrEmpty(category) && category.toLowerCase() === 'bug');
}

function IsValidStatus(status) {
  if (IsNullOrEmpty(status))
    return false; 
    
  status = status.toLowerCase(); 
    
  return ((status.indexOf('(duplicate)') === -1)
    && (status.indexOf('(postponed)') === -1) 
    && (status.indexOf('(won\'t fix)') === -1)
    && (status.indexOf('(by design)') === -1)
    && (status.indexOf('(not reproducible)') === -1))
}

function IsValidMilestone(milestone) {
  return (!IsNullOrEmpty(milestone) 
      && milestone.toLowerCase() !== 'undecided'
      && milestone.toLowerCase() !== 'new'
      && milestone.toLowerCase() !== 'patch'
      && milestone.toLowerCase() !== 'inv');
}

function IsNonLegacyMilestone(milestone) {
  return (milestone.toLowerCase() !== 'legacy');
}

function IsNullOrEmpty(input) {
  return (!input || (input.toLowerCase() === '[object object]'));
}

